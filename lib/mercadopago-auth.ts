import crypto from 'crypto';

/**
 * Validates the Mercado Pago webhook signature (x-signature).
 * @param xSignature The value of the x-signature header.
 * @param resourceId The ID of the resource (payment) being notified.
 * @param secret The Webhook Secret from Mercado Pago panel.
 * @returns boolean indicating if the signature is valid.
 */
export function validateMPSignature(xSignature: string, resourceId: string, secret: string): boolean {
  if (!xSignature || !resourceId || !secret) {
    console.warn('MP Auth: Missing parameters for validation');
    return false;
  }

  try {
    const parts = xSignature.split(',');
    let ts = '';
    let v1 = '';

    parts.forEach(part => {
      const [key, value] = part.split('=');
      if (key?.trim() === 'ts') ts = value?.trim();
      if (key?.trim() === 'v1') v1 = value?.trim();
    });

    if (!ts || !v1) {
      console.warn('MP Auth: Invalid x-signature format');
      return false;
    }

    // According to MP docs: id:[id];ts:[ts];
    const manifest = `id:${resourceId};ts:${ts};`;
    
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(manifest);
    const digest = hmac.digest('hex');

    const isValid = digest === v1;
    
    if (!isValid) {
      console.error('MP Auth: Signature mismatch!');
    }
    
    return isValid;
  } catch (error) {
    console.error('MP Auth: Validation error', error);
    return false;
  }
}
