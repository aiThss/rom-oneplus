import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
const origin = 'http://localhost:3000';
const password = readFileSync('.local/admin-access.txt', 'utf8').match(
  /Mật khẩu: (.+)/,
)[1];
let cookie = '';
async function api(path, body) {
  const response = await fetch(origin + '/api/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Cookie: cookie,
      Origin: origin,
      'X-ROM-CSRF': '1',
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  assert.equal(response.status, 200, path + ' status');
  if (path === 'auth/login')
    cookie = response.headers.get('set-cookie').split(';')[0];
  return response.json();
}
await api('auth/login', { username: 'admin', password });
const probePath = '.local/restart-proof.json';
const id = 'resource:orangefox-op13';
if (process.argv[2] === 'prepare') {
  const before = await api('admin/data');
  const oldOverride = before.overrides.find((v) => v.id === id);
  const testOverride = {
    ...oldOverride,
    id,
    description: 'Kiểm tra lưu bền vững sau khởi động lại',
  };
  const saved = await api('admin/log', {
    title: 'Kiểm tra khởi động lại',
    date: '2026-09-06',
    body: 'Bản nháp tạm của kiểm thử',
    published: false,
  });
  writeFileSync(
    probePath,
    JSON.stringify({
      settings: before.settings,
      oldOverride,
      testOverride,
      log: saved,
    }),
  );
  await api('admin/settings', before.settings);
  await api('admin/override', testOverride);
  console.log(
    'Prepared private restart probe. Stop server, back up, restart, then run verify.',
  );
} else if (process.argv[2] === 'verify') {
  const proof = JSON.parse(readFileSync(probePath, 'utf8'));
  const after = await api('admin/data');
  assert.deepEqual(after.settings, proof.settings);
  assert.deepEqual(
    after.overrides.find((v) => v.id === id),
    proof.testOverride,
  );
  assert.deepEqual(
    after.logs.find((v) => v.id === proof.log.id),
    proof.log,
  );
  if (proof.oldOverride) await api('admin/override', proof.oldOverride);
  else await api('admin/reset-override', { id });
  await api('admin/delete-log', { id: proof.log.id });
  unlinkSync(probePath);
  console.log(
    'PASS settings, edited source content, draft journal and credentials survive restart. Probe removed.',
  );
} else throw new Error('Use prepare or verify.');
await api('auth/logout', {});
