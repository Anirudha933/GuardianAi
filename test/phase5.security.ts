import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { hashPhone, isRateLimited, verifySignature } from '../lib/security.js';
import { validateScrapeUrl } from '../skills/scrape.skill.js';

process.env.WEBHOOK_SECRET = 'phase5-test-secret';

const payload = JSON.stringify({ message: 'hello' });
const expected = createHmac('sha256', process.env.WEBHOOK_SECRET)
  .update(payload)
  .digest('hex');

assert.equal(verifySignature(payload, `sha256=${expected}`), true);
assert.equal(verifySignature(payload, 'sha256=bad'), false);

const hash = hashPhone('+911234567890');
assert.match(hash, /^[a-f0-9]{16}$/);
assert.equal(hashPhone('+911234567890'), hash);
assert.notEqual(hash, '+911234567890');

const userHash = `phase5-${Date.now()}`;
for (let i = 0; i < 10; i++) {
  assert.equal(isRateLimited(userHash), false);
}
assert.equal(isRateLimited(userHash), true);

await assert.rejects(() => validateScrapeUrl('notawebsite'), /Invalid URL/);
await assert.rejects(() => validateScrapeUrl('file:///etc/passwd'), /Invalid URL protocol/);
await assert.rejects(() => validateScrapeUrl('http://localhost:3000'), /Blocked private or local URL/);
await assert.rejects(() => validateScrapeUrl('http://127.0.0.1:3000'), /Blocked private or local URL/);
await assert.rejects(() => validateScrapeUrl('http://169.254.169.254'), /Blocked private or local URL/);

console.log('Phase 5 security checks passed.');
