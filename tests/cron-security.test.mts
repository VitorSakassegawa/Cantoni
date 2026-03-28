import assert from 'node:assert/strict'

process.env.CRON_SECRET = 'super-secret'

const { isValidCronRequest } = await import('../lib/cron-security.ts')

const manualHeaders = new Headers({
  'x-cron-secret': 'super-secret',
})
assert.equal(isValidCronRequest(manualHeaders), true)

const vercelHeaders = new Headers({
  authorization: 'Bearer super-secret',
})
assert.equal(isValidCronRequest(vercelHeaders), true)

const invalidHeaders = new Headers({
  authorization: 'Bearer wrong-secret',
})
assert.equal(isValidCronRequest(invalidHeaders), false)

console.log('cron-security tests passed')
