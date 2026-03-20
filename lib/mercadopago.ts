import { MercadoPagoConfig, Payment } from 'mercadopago';

if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
  console.warn('MERCADOPAGO_ACCESS_TOKEN not set');
}

export const mpConfig = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
  options: { timeout: 5000 }
});

export const payment = new Payment(mpConfig);
