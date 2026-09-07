import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:4313';
const credentials = readFileSync(
  new URL('../.local/admin-access.txt', import.meta.url),
  'utf8',
);
const password = credentials.match(/Mật khẩu: (.+)/)?.[1];
if (!password) throw new Error('Không tìm thấy mật khẩu local.');
let cookie = '';
async function request(path, body, auth = true) {
  const res = await fetch(origin + '/api/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(body !== undefined
        ? {
            'Content-Type': 'application/json',
            'X-ROM-CSRF': '1',
            Origin: origin,
          }
        : {}),
      ...(auth && cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  return { res, data };
}
assert.equal((await request('aiths/data', undefined, false)).res.status, 401);
assert.equal((await request('aiths/settings', {}, false)).res.status, 401);
assert.equal((await request('admin/data', undefined, false)).res.status, 404);
assert.equal((await request('admin/settings', {}, false)).res.status, 404);
assert.equal((await fetch(origin + '/admin')).status, 404);
assert.equal((await fetch(origin + '/aiths')).status, 200);
const csrf = await fetch(origin + '/api/aiths/settings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Origin: 'https://other.example',
  },
  body: '{}',
});
assert.ok(
  [400, 403].includes(csrf.status),
  `Cross-origin status ${csrf.status}: ${await csrf.text()}`,
);
const signIn = await request(
  'auth/login',
  { username: 'admin', password },
  false,
);
assert.equal(signIn.res.status, 200, JSON.stringify(signIn.data));
cookie = signIn.res.headers.get('set-cookie').split(';')[0];
assert.ok(signIn.res.headers.get('set-cookie').includes('HttpOnly'));
console.log(
  'PASS authentication, session cookie, authorization and cross-origin rejection',
);
const root = await request('catalog');
assert.equal(root.res.status, 200);
assert.ok(root.data.data.entries.some((e) => e.name === 'Oneplus 13'));
const folder = 'Oneplus 13/Custom Roms/crDroid Official';
const catalog = await request('catalog?path=' + encodeURIComponent(folder));
const file = catalog.data.data.entries.find((e) => e.kind === 'file');
assert.ok(file);
const detail = await request('entry?id=' + encodeURIComponent(file.id));
assert.match(detail.data.checksum, /^[a-f0-9]{32}$/i);
assert.equal(
  new URL(detail.data.downloadUrl).hostname,
  'roms.danielspringer.at',
);
const zip = await request('zip?id=' + encodeURIComponent(file.id));
assert.equal(zip.res.status, 200);
assert.ok(zip.data.summary.entries > 0);
assert.ok(zip.data.entries.some((entry) => entry.kind === 'file' || entry.kind === 'folder'));
console.log('PASS real archive navigation, direct link and exact-file MD5');
const ota = await request('ota');
assert.ok(ota.data.data.length);
assert.ok(ota.data.data.every((e) => !e.downloadUrl));
console.log('PASS real OTA metadata, no unresolved download links');
const sf = await request('catalog?source=sourceforge&path=Oneplus%2013');
assert.ok(sf.data.data.entries.length);
console.log('PASS real SourceForge metadata');
  const before = (await request('aiths/data')).data;
  const adminOta = await request('aiths/catalog?source=ota');
assert.equal(adminOta.res.status, 200);
const release = adminOta.data.data.entries.find(
  (e) => e.id === ota.data.data[0].id,
);
assert.ok(release);
const previousOta = before.overrides.find((e) => e.id === release.id);
const id = 'archive:Oneplus 13';
const previous = before.overrides.find((e) => e.id === id);
let customId;
let logId;
try {
    await request('aiths/override', {
    id: release.id,
    changelogVi: 'Bản dịch đúng mã phát hành',
  });
  const releaseDetails = await request(
    'entry?id=' + encodeURIComponent(release.id),
  );
  assert.equal(releaseDetails.data.changelogVi, 'Bản dịch đúng mã phát hành');
  assert.equal(releaseDetails.data.id, release.id);
  console.log('PASS admin can edit the exact OTA release');
  assert.equal(
    (
      await request('aiths/override', {
        id,
        description: 'Kiểm tra giữ nội dung sau đồng bộ',
        hidden: true,
      })
    ).res.status,
    200,
  );
    await request('aiths/sync', { source: 'archive', path: '' });
    const changed = (await request('aiths/data')).data;
  assert.equal(
    changed.overrides.find((e) => e.id === id).description,
    'Kiểm tra giữ nội dung sau đồng bộ',
  );
  assert.ok(
    !(await request('catalog')).data.data.entries.some((e) => e.id === id),
  );
  assert.equal(
    (await request('catalog?path=' + encodeURIComponent(folder))).data.data
      .entries.length,
    0,
  );
  assert.notEqual(
    (await request('entry?id=' + encodeURIComponent(file.id))).res.status,
    200,
  );
  console.log(
    'PASS overrides survive real sync and hidden entries stay hidden',
  );
    const custom = await request('aiths/custom', {
    name: 'Mục kiểm thử tự động',
    parent: '',
    device: 'Oneplus 13',
    category: 'recovery',
    sourceUrl: 'https://example.com/release',
    downloadUrl: 'https://example.com/test.zip',
    description: '<script>test-only</script>',
    changelogVi: 'Nội dung tiếng Việt',
    checksum: '',
    checksumType: 'MD5',
    mirrors: [],
  });
  assert.equal(custom.res.status, 200);
  customId = custom.data.id;
    const log = await request('aiths/log', {
    date: '2026-09-06',
    title: 'Bản nháp kiểm thử',
    body: 'Không xuất bản',
    published: false,
  });
  assert.equal(log.res.status, 200);
  logId = log.data.id;
  assert.ok(!(await request('logs')).data.some((e) => e.id === logId));
  console.log(
    'PASS custom link persistence and unpublished changelog visibility',
  );
  const fd = new FormData();
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jHf0AAAAASUVORK5CYII=',
    'base64',
  );
  fd.set('file', new Blob([png], { type: 'image/png' }), 'test.png');
  const uploaded = await fetch(origin + '/api/aiths/upload', {
    method: 'POST',
    headers: { Cookie: cookie, Origin: origin, 'X-ROM-CSRF': '1' },
    body: fd,
  });
  assert.equal(uploaded.status, 200);
  const image = await uploaded.json();
  const img = await fetch(origin + image.url);
  assert.equal(img.headers.get('content-type'), 'image/png');
  assert.equal((await img.arrayBuffer()).byteLength, png.length);
  console.log('PASS local R2 image upload/read');
  assert.notEqual((await request('catalog?path=..%2Fsecret')).res.status, 200);
  assert.notEqual(
    (await request('changelog?id=https%3A%2F%2F127.0.0.1')).res.status,
    200,
  );
  console.log('PASS invalid paths and arbitrary changelog fetch are rejected');
} finally {
  if (previousOta) await request('aiths/override', previousOta);
  else await request('aiths/reset-override', { id: release.id });
  if (previous) await request('aiths/override', previous);
  else await request('aiths/reset-override', { id });
  if (customId) await request('aiths/delete-custom', { id: customId });
  if (logId) await request('aiths/delete-log', { id: logId });
}
// Seed only a disposable cache entry; a missing upstream folder must preserve it.
const key = 'archive:__rom_missing_test__';
const cached = {
  source: 'archive',
  path: '__rom_missing_test__',
  entries: [],
  latest: [],
  notes: ['fixture retained'],
  sourceUrl:
    'https://roms.danielspringer.at/index.php?dir=__rom_missing_test__',
};
function sql(command) {
  const path = '.local/integration-cache.sql';
  writeFileSync(path, command);
  try {
    const r = spawnSync(
      process.execPath,
      [
        'node_modules/wrangler/bin/wrangler.js',
        'd1',
        'execute',
        'DB',
        '--config',
        'wrangler.local.json',
        '--local',
        '--file',
        path,
      ],
      { encoding: 'utf8' },
    );
    assert.equal(r.status, 0, r.stderr);
  } finally {
    rmSync(path, { force: true });
  }
}
sql(
  `INSERT OR REPLACE INTO source_cache(key,body,source_url,updated_at,attempted_at,error) VALUES('${key}','${JSON.stringify(cached)}','${cached.sourceUrl}',1,1,NULL);`,
);
try {
  const fallback = await request('catalog?path=__rom_missing_test__');
  assert.equal(fallback.res.status, 200);
  assert.equal(fallback.data.stale, true);
  assert.equal(fallback.data.data.notes[0], 'fixture retained');
  assert.ok(fallback.data.error);
  console.log(
    'PASS upstream failure preserves last good snapshot with stale flag',
  );
} finally {
  sql(`DELETE FROM source_cache WHERE key='${key}';`);
}
try {
  const cold = await request('catalog?path=__rom_missing_test__');
  assert.equal(cold.res.status, 502);
  const status = (await request('aiths/data')).data.cache.find(
    (v) => v.key === key,
  );
  assert.equal(status.updated_at, 0);
  assert.ok(status.error);
  assert.equal(
    (await request('catalog?path=__rom_missing_test__')).res.status,
    502,
  );
  console.log(
    'PASS failed first sync records its error without exposing an empty catalog',
  );
} finally {
  sql(`DELETE FROM source_cache WHERE key='${key}';`);
}
const signOut = await request('auth/logout', {});
assert.equal(signOut.res.status, 200);
assert.equal((await request('aiths/data')).res.status, 401);
console.log('PASS logout invalidates server-side session');
console.log('Integration checks complete; temporary content restored/removed.');
