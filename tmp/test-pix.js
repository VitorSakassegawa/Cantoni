const fetch = require('node-fetch');

const accessToken = 'TEST-4265333804589178-032017-f2ada8d6bca2209d72a71aaf881d11e1-238646704';

async function testPix() {
  console.log('Testing PIX creation via Mercado Pago API...');
  
  const body = {
    type: "online",
    external_reference: "TEST_PIX_" + Date.now(),
    total_amount: "1.00",
    payer: {
      email: "test_user_123@testuser.com",
      first_name: "APRO"
    },
    transactions: {
      payments: [
        {
          amount: "1.00",
          payment_method: {
            id: "pix",
            type: "bank_transfer"
          }
        }
      ]
    }
  };

  try {
    const response = await fetch('https://api.mercadopago.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ PIX Order created successfully!');
      console.log('Order ID:', data.id);
      console.log('Status:', data.status);
      console.log('Status Detail:', data.status_detail);
      console.log('QR Code:', data.transactions?.payments?.[0]?.payment_method?.qr_code);
      console.log('QR Code Base64 Length:', data.transactions?.payments?.[0]?.payment_method?.qr_code_base64?.length);
    } else {
      console.error('❌ Error creating PIX Order:', data);
    }
  } catch (error) {
    console.error('❌ Network Error:', error.message);
  }
}

testPix();
