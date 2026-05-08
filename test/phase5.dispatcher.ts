import assert from 'node:assert/strict';

let dispatcher: typeof import('../lib/dispatcher.js');

try {
  dispatcher = await import('../lib/dispatcher.js');
} catch (err) {
  console.error('Dispatcher import failed:', err);
  throw err;
}

const { extractUrl, handleGuardianMessage } = dispatcher;

assert.equal(extractUrl('Scan https://example.com now'), 'https://example.com');
assert.equal(extractUrl('hello'), null);

const help = await handleGuardianMessage({
  userId: 'telegram:phase5-dispatcher-help',
  text: 'hello',
});

assert.equal(help.rateLimited, false);
assert.match(help.userHash, /^[a-f0-9]{16}$/);
assert.equal(help.reply, 'Send: Scan https://example.com');

const invalid = await handleGuardianMessage({
  userId: 'telegram:phase5-dispatcher-invalid',
  text: 'Scan http://localhost:3000',
});

assert.equal(invalid.rateLimited, false);
assert.match(invalid.reply, /valid public http or https URL/);

let limited = false;
for (let i = 0; i < 11; i++) {
  const result = await handleGuardianMessage({
    userId: 'telegram:phase5-dispatcher-rate-limit',
    text: 'hello',
  });
  limited = result.rateLimited;
}

assert.equal(limited, true);

console.log('Phase 5 dispatcher checks passed.');
