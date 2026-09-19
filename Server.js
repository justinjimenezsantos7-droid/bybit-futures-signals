const express = require('express');
const paypal = require('@paypal/checkout-server-sdk');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const QRCode = require('qrcode');

const app = express();
app.use(express.json());

const PAYPAL_RECEIVER_EMAIL = 'justinjimenezsantos7@gmail.com';

const Environment = process.env.NODE_ENV === 'production'
  ? paypal.core.LiveEnvironment
  : paypal.core.SandboxEnvironment;
const paypalClient = new paypal.core.PayPalHttpClient(
  new Environment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.post('/api/pagos/paypal/crear-orden', async (req, res) => {
  const { monto, planNombre, userId } = req.body;

  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      description: `Suscripción Sello (${planNombre}) - Usuario: ${userId}`,
      payee: {
        email_address: PAYPAL_RECEIVER_EMAIL
      },
      amount: {
        currency_code: 'USD',
        value: monto
      }
    }],
    application_context: {
      brand_name: "Sello Facturas QR",
      user_action: "PAY_NOW",
      return_url: `${process.env.CLIENT_URL}/dashboard?status=success`,
      cancel_url: `${process.env.CLIENT_URL}/precios`
    }
  });

  try {
    const order = await paypalClient.execute(request);
    res.json({ orderID: order.result.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pagos/paypal/capturar', async (req, res) => {
  const { orderID, userId, plan } = req.body;
  const request = new paypal.orders.OrdersCaptureRequest(orderID);
  request.requestBody({});

  try {
    const capture = await paypalClient.execute(request);
    
    if (capture.result.status === 'COMPLETED') {
      await supabase.from('suscripciones').insert([{
        user_id: userId,
        plan: plan,
        proveedor: 'paypal',
        email_receptor: PAYPAL_RECEIVER_EMAIL,
        id_transaccion: capture.result.id,
        estado: 'activo',
        fecha_inicio: new Date()
      }]);

      return res.json({ status: 'COMPLETED', detalle: capture.result });
    }
    res.status(400).json({ status: capture.result.status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/facturas/crear', async (req, res) => {
  const { cliente, monto, vendedorId, userId } = req.body;

  const facturaNumero = `FACT-${Date.now().toString().slice(-5)}`;
  const payload = `${facturaNumero}|${cliente}|${monto}|${Date.now()}`;
  const firmaDigital = crypto.createHmac('sha256', process.env.JWT_SECRET).update(payload).digest('hex');
  
  const urlVerificacion = `${process.env.CLIENT_URL}/verificar/${facturaNumero}?signature=${firmaDigital}`;
  const qrBase64 = await QRCode.toDataURL(urlVerificacion);

  const { data, error } = await supabase.from('facturas').insert([{
    numero: facturaNumero,
    cliente,
    monto,
    vendedor_id: vendedorId,
    user_id: userId,
    firma: firmaDigital,
    qr_code: qrBase64,
    estado: 'emitida'
  }]);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true, factura: data[0], qr: qrBase64, urlVerificacion });
});

app.get('/api/facturas/verificar/:numero', async (req, res) => {
  const { numero } = req.params;
  const { signature } = req.query;

  const { data: factura, error } = await supabase
    .from('facturas')
    .select('*')
    .eq('numero', numero)
    .single();

  if (error || !factura) {
    return res.status(404).json({ autentica: false, mensaje: 'Factura no encontrada' });
  }

  if (factura.firma === signature) {
    return res.json({ autentica: true, factura });
  } else {
    return res.status(400).json({ autentica: false, mensaje: 'La factura ha sido alterada o no es válida' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor Sello activo en puerto ${PORT}`));
