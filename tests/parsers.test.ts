import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseArchive,
  parseSourceForge,
  parseOta,
  parseMd5,
  parseChangelog,
  parseTraffic,
  parseZipBrowser,
  normalizedPath,
  safeLink,
  safeZipDownload,
  matchMirror,
} from '../lib/parsers.ts';
import { defaultSettings, visibleEntry, type Entry } from '../lib/model.ts';
import { validateSettings, validateCustom } from '../lib/validation.ts';
import { parseXiaomiDevice, parseXiaomiIndex } from '../lib/xiaomi.ts';
const path = 'Oneplus 13/Custom Roms';
void test('archive parses actual folder/file markup and keeps build-specific actions', () => {
  const html = `<div id="browser"></div><div id="download-browser-grid"><a class="folder-badge" href="/index.php?dir=Oneplus+13%2FCustom+Roms%2FcrDroid"><span class="item-name">crDroid</span></a><div class="item-wrapper"><article class="item-file-card"><a class="item-main-link" href="/download.php?file=Files%2FOneplus+13%2FCustom+Roms%2FBuild+A.zip&amp;download=true"><span class="item-name">Build A.zip</span></a><div class="file-info">Size <strong>3.74 GB</strong></div><a class="btn-changelog" href="/index.php?view=changelog&amp;id=build-a">Changelog</a><a href="/index.php?view=arb">ARB: 1</a></article></div></div>`;
  const parsed = parseArchive(html, path);
  assert.equal(parsed.entries.length, 2);
  const f = parsed.entries[1];
  assert.equal(f.name, 'Build A.zip');
  assert.equal(f.sizeLabel, '3.74 GB');
  assert.equal(new URL(f.changelogUrl!).searchParams.get('id'), 'build-a');
  assert.deepEqual(f.notes, ['ARB: 1']);
  assert.ok(f.downloadUrl?.includes('Files%2F'));
  assert.equal(f.id, 'archive:' + path + '/Build A.zip');
});
void test('changed HTML or an unverified empty list fails instead of erasing cached data', () => {
  assert.throws(() => parseArchive('<html>maintenance</html>'));
  assert.throws(() =>
    parseArchive(
      '<span id="browser"></span><div id="download-browser-grid">new markup</div>',
    ),
  );
  assert.equal(
    parseArchive(
      '<span id="browser"></span><div class="empty-folder">No files found</div>',
    ).entries.length,
    0,
  );
});
void test('ZIP browser parses nested entries and keeps only verified source downloads', () => {
  const html = `<section id="zip-browser"><h2 id="zip-inline-title">Build A.zip</h2><div class="zip-browser-summary"><span><strong>2</strong> files</span><span><strong>1</strong> folders</span><span><strong>3</strong> entries</span></div><ul class="zip-tree-root-list"><li>ignored outside the ZIP schema</li><li class="zip-dir"><span class="zip-entry-copy"><strong>images</strong></span><ul><li class="zip-file highlight"><span class="zip-entry-copy"><strong>boot.img</strong></span><span class="zip-size">96 MB</span><span class="zip-priority-badge">Important image</span><a class="zip-download" href="/index.php?action=download_from_zip&amp;zip=Oneplus+13%2FBuild+A.zip&amp;file=images%2Fboot.img">Download</a></li></ul></li><li class="zip-file"><span class="zip-entry-copy"><strong>README.txt</strong></span><a class="zip-download" href="https://evil.example/file">Download</a></li></ul></section>`;
  const result = parseZipBrowser(
    html,
    'archive:Oneplus 13/Build A.zip',
    'https://roms.danielspringer.at/index.php?dir=Oneplus+13&zip=Build+A.zip',
  );
  assert.equal(result.name, 'Build A.zip');
  assert.deepEqual(result.summary, { files: 2, folders: 1, entries: 3 });
  const image = result.entries[0].children?.[0];
  assert.equal(image?.important, true);
  assert.equal(image?.sizeLabel, '96 MB');
  assert.equal(new URL(image!.downloadUrl!).hostname, 'roms.danielspringer.at');
  assert.equal(result.entries[1].downloadUrl, undefined);
  assert.equal(
    safeZipDownload(
      'https://roms.danielspringer.at/index.php?action=download_from_zip&zip=Build.zip&file=../secret',
    ),
    undefined,
  );
  assert.throws(() =>
    parseZipBrowser(
      '<ul class="zip-tree-root-list"><li class="zip-file"><span class="zip-entry-copy"><strong>outside.txt</strong></span></li></ul>',
      'archive:Build A.zip',
      'https://roms.danielspringer.at/index.php?zip=Build+A.zip',
    ),
  );
});
void test('SourceForge metadata is parsed as JSON, never executed', () => {
  const value = {
    folder: {
      name: 'Regional Flashers',
      full_path: 'Oneplus 13/Regional Flashers',
      type: 'd',
      url: '/projects/oneplus13flashers/files/Oneplus%2013/Regional%20Flashers/',
    },
    file: {
      name: 'A.zip',
      full_path: 'Oneplus 13/A.zip',
      type: 'f',
      downloadable: true,
      url: '/projects/oneplus13flashers/files/Oneplus%2013/A.zip/',
      download_url:
        'https://sourceforge.net/projects/oneplus13flashers/files/Oneplus%2013/A.zip/download',
      sha256: 'a'.repeat(64),
    },
  };
  const result = parseSourceForge(
    `<script>net.sf.files = ${JSON.stringify(value)};</script>`,
    'Oneplus 13',
  );
  assert.equal(result.entries.length, 2);
  assert.equal(result.entries[0].downloadUrl, undefined);
  assert.equal(result.entries[1].checksumType, 'SHA-256');
  assert.throws(() =>
    parseSourceForge('<script>net.sf.files = evil();</script>'),
  );
  assert.throws(() => parseSourceForge('<script>net.sf.files = {};</script>'));
  assert.throws(() =>
    parseSourceForge(
      '<script>net.sf.files = {"renamed":{"title":"Changed"}};</script>',
    ),
  );
});
void test('OTA unresolved URLs never become direct downloads and missing fields stay missing', () => {
  const entry = parseOta({
    releases: [
      {
        id: 'one',
        device: 'OP 13',
        region: 'EU',
        version: '16.0',
        source_url: 'https://vendor.example/downloadCheck',
        build_timestamp: '2026-09-06',
      },
    ],
  })[0];
  assert.equal(entry.downloadUrl, undefined);
  assert.equal(entry.size, undefined);
  assert.equal(entry.published, undefined);
  assert.equal(
    entry.sourceUrl,
    'https://roms.danielspringer.at/index.php?view=ota',
  );
  assert.throws(() => parseOta({ releases: [{ version: 'bad' }] }));
  assert.throws(() => parseOta({ releases: [] }));
});
void test('checksum cards bind hashes to exact names', () => {
  const out = parseMd5(
    '<article class="checksum-card"><h2>Build A.zip</h2><code class="checksum-code">38a7c9abdf28d021a248e8f751b44380</code></article>',
  );
  assert.equal(out['Build A.zip'], '38a7c9abdf28d021a248e8f751b44380');
  assert.equal(out['Build B.zip'], undefined);
});
void test('changelog extraction removes executable text and unrelated footer', () => {
  const out = parseChangelog(
    '<title>Daniel Springer</title><article class="changelog-content"><h2>System</h2><p>Fixed camera.</p><script>alert(1)</script><img src=x onerror=evil()></article><footer>Donate</footer>',
  );
  assert.ok(out.includes('Fixed camera.'));
  assert.ok(!out.includes('alert'));
  assert.ok(!out.includes('Donate'));
  assert.ok(!out.includes('onerror'));
});
void test('mirror identity requires exact path and matching confirmed checksum', () => {
  const a = {
    kind: 'file',
    path: 'Oneplus 13/A.zip',
    checksum: 'aa',
    checksumType: 'MD5',
  } as Entry;
  assert.ok(matchMirror(a, { ...a, source: 'sourceforge' }));
  assert.ok(!matchMirror(a, { ...a, path: 'Oneplus 15/A.zip' }));
  assert.ok(!matchMirror(a, { ...a, checksum: undefined }));
  assert.ok(!matchMirror(a, { ...a, checksum: 'bb' }));
});
void test('traffic marks stale and unknown timestamps; legacy MB fields are MiB', () => {
  const now = Date.now();
  const out = parseTraffic(
    { today_mbytes: 1 },
    new Date(now - 600000).toUTCString(),
    'Mirror',
    'https://example.com',
    now,
  );
  assert.equal(out.today, 1048576);
  assert.equal(out.stale, true);
  assert.equal(out.total, undefined);
  assert.equal(parseTraffic({}, null, 'Main', 'url', now).stale, true);
  assert.equal(
    parseTraffic(
      { today_bytes: 1000, today_mbytes: 99 },
      new Date(now).toUTCString(),
      'Main',
      'url',
      now,
    ).today,
    1000,
  );
});
void test('paths and links reject traversal, executable schemes and credentials', () => {
  for (const p of ['../a', 'Oneplus/../a', 'x\\y', '%2e%2e/a', 'a\u0000'])
    assert.throws(() => normalizedPath(p));
  assert.equal(
    normalizedPath('Oneplus 13/Custom Roms'),
    'Oneplus 13/Custom Roms',
  );
  assert.equal(safeLink('javascript:alert(1)'), undefined);
  assert.equal(safeLink('https://user:secret@example.com'), undefined);
});
void test('configuration validation does not accept arbitrary fields or unsafe links', () => {
  assert.equal(validateSettings(defaultSettings).name, 'Kho ROM Việt');
  assert.throws(() =>
    validateSettings({ ...defaultSettings, logo: 'javascript:alert(1)' }),
  );
  assert.throws(() => validateSettings({ ...defaultSettings, sections: [] }));
  assert.throws(() =>
    validateCustom({
      name: 'x',
      parent: '..',
      sourceUrl: 'https://example.com',
    }),
  );
});
void test('OnePlus aliases share device visibility settings across archive and OTA', () => {
  const entry = { device: 'OP 13', path: 'release', id: 'ota:x' } as Entry;
  const config = {
    ...defaultSettings,
    devices: [{ name: 'Oneplus 13', enabled: false, order: 0 }],
  };
  assert.equal(visibleEntry(entry, config), false);
  assert.equal(visibleEntry(entry, defaultSettings), true);
  assert.equal(
    visibleEntry(
      { device: 'Mi 10', path: 'release', id: 'xiaomi:umi' } as Entry,
      { ...defaultSettings, brands: ['OnePlus'] },
    ),
    false,
  );
});
void test('Xiaomi catalog reads HyperOS device data and builds official downloads', () => {
  const root = parseXiaomiIndex(
    '<div><a href="devices/nuwa.json" data-name-en="Xiaomi 13 Pro(nuwa)">Xiaomi</a><a href="devices/nuwa.json" data-name-en="duplicate">Duplicate</a></div>',
  );
  assert.equal(root.entries.length, 1);
  assert.equal(root.entries[0].name, 'Xiaomi 13 Pro');
  const device = parseXiaomiDevice(
    {
      device: 'nuwa',
      name: { en: 'Xiaomi 13 Pro' },
      supports: ['OS2.0'],
      android: ['15.0'],
      type: 'phone',
      branches: [
        {
          name: { en: 'Xiaomi HyperOS Stable' },
          region: 'cn',
          show: '1',
          roms: {
            'OS2.0.1.0.VMBCNXM': {
              android: '15.0',
              release: '2026-01-02',
              recovery: 'nuwa-recovery.zip',
              fastboot: 'nuwa-images.tgz',
            },
          },
        },
      ],
    },
    'nuwa/branch-0',
  );
  assert.equal(device.preview?.name, 'Xiaomi 13 Pro');
  assert.equal(device.preview?.imageUrl, 'https://data.hyperos.fans/assets/images/nuwa.png');
  assert.equal(device.entries.length, 2);
  assert.ok(device.entries[0].downloadUrl?.startsWith('https://bigota.d.miui.com/'));
  assert.ok(device.entries.every((entry) => entry.source === 'xiaomi'));
});
