import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getOtaVersionIndex,
  resolveOtaDownload,
  getCachedOtaUrl,
} from '../lib/ota-resolver.ts';

void test('resolveOtaDownload requires device and version', async () => {
  await assert.rejects(
    () => resolveOtaDownload({ device: '', version: '' }),
    /Thiếu thông tin thiết bị hoặc phiên bản OTA/,
  );
  await assert.rejects(
    () => resolveOtaDownload({ device: 'OP 10 PRO', version: '' }),
    /Thiếu thông tin thiết bị hoặc phiên bản OTA/,
  );
});

void test('getOtaVersionIndex throws for unknown device or version', async () => {
  await assert.rejects(
    () => getOtaVersionIndex('NonExistentDevice123', 'GLO', '1.0'),
    /Không tìm thấy phiên bản/,
  );
});

void test('getOtaVersionIndex finds real device and region version', async () => {
  // OP 10 PRO GLO has NE2213_16.0.3.530(EX01)
  const idx = await getOtaVersionIndex(
    'OP 10 PRO',
    'GLO',
    'NE2213_16.0.3.530(EX01)',
  );
  assert.equal(typeof idx, 'number');
  assert.ok(idx >= 0);
});

void test('getCachedOtaUrl returns null when no entry cached', () => {
  const res = getCachedOtaUrl('UnknownDevice', 'GLO', '1.0');
  assert.equal(res, null);
});
