import { parseHTML } from 'linkedom';
import type { Catalog, DevicePreview, Entry } from './model';
import { normalizedPath } from './parsers.ts';

export const XIAOMI_DATA = 'https://data.hyperos.fans';
export const XIAOMI_INDEX_URL = `${XIAOMI_DATA}/`;
export const XIAOMI_DOWNLOAD = 'https://bigota.d.miui.com';
const XIAOMI_NOTE =
  'Metadata và ảnh lấy từ HyperOS.fans; file ROM mở từ máy chủ Xiaomi chính thức.';

type XiaomiName = { en?: unknown; zh?: unknown };
type XiaomiRom = {
  os?: unknown;
  android?: unknown;
  release?: unknown;
  aspatch?: unknown;
  [key: string]: unknown;
};
type XiaomiBranch = {
  name?: XiaomiName;
  branchCode?: unknown;
  brand?: unknown;
  device?: XiaomiName;
  idtag?: unknown;
  tag?: unknown;
  branchtag?: unknown;
  show?: unknown;
  region?: unknown;
  roms?: unknown;
};
export type XiaomiDevice = {
  device?: unknown;
  name?: XiaomiName;
  supports?: unknown;
  android?: unknown;
  type?: unknown;
  branches?: unknown;
};

function string(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}
function list(value: unknown) {
  return Array.isArray(value) ? value.filter((v): v is string => !!string(v)).map(string) : [];
}
function name(value: unknown) {
  if (!value || typeof value !== 'object') return '';
  const v = value as XiaomiName;
  return string(v.en) || string(v.zh);
}
function validCode(value: string) {
  return /^[a-z0-9_]+$/i.test(value) && value.length <= 80;
}
export function xiaomiDeviceUrl(code: string) {
  return `${XIAOMI_DATA}/devices/${encodeURIComponent(code)}.json`;
}
function imageUrl(code: string) {
  return `${XIAOMI_DATA}/assets/images/${encodeURIComponent(code)}.png`;
}
function branchPath(code: string, index: number) {
  return `${code}/branch-${index}`;
}
function branchIndex(path: string) {
  const match = path.match(/\/branch-(\d+)$/);
  return match ? Number(match[1]) : -1;
}
function regionLabel(region: string) {
  return (
    {
      cn: 'China',
      global: 'Quốc tế',
      eea: 'Châu Âu (EEA)',
      in: 'Ấn Độ',
      id: 'Indonesia',
      ru: 'Nga',
      tw: 'Đài Loan',
      tr: 'Thổ Nhĩ Kỳ',
      jp: 'Nhật Bản',
      kr: 'Hàn Quốc',
      vn: 'Việt Nam',
    }[region] || region || 'Không rõ khu vực'
  );
}
function fileLabel(key: string) {
  return (
    {
      recovery: 'Recovery ZIP',
      fastboot: 'Fastboot TGZ',
      ctelecom: 'China Telecom TGZ',
      cnmobile: 'China Mobile TGZ',
      cnunicom: 'China Unicom TGZ',
    }[key] || key
  );
}
function downloadUrl(version: string, filename: string) {
  return `${XIAOMI_DOWNLOAD}/${encodeURIComponent(version)}/${encodeURIComponent(filename)}`;
}

export function parseXiaomiIndex(html: string): Catalog {
  const { document } = parseHTML(html);
  const entries: Entry[] = [];
  const seen = new Set<string>();
  document.querySelectorAll('a[href]').forEach((anchor) => {
    const href = anchor.getAttribute('href') || '';
    const match = href.match(/^devices\/([a-z0-9_]+)\.json$/i);
    if (!match) return;
    const code = match[1];
    if (!validCode(code) || seen.has(code)) return;
    seen.add(code);
    const label =
      anchor.getAttribute('data-name-en') ||
      anchor.querySelector('[data-lang-en]')?.getAttribute('data-lang-en') ||
      anchor.textContent?.replace(/\s+/g, ' ').trim() ||
      code;
    entries.push({
      id: `xiaomi:${code}`,
      source: 'xiaomi',
      kind: 'folder',
      name: label.replace(/\s*\([^)]*\)\s*$/, '').trim() || code,
      path: code,
      parent: '',
      device: code,
      sourceUrl: xiaomiDeviceUrl(code),
      description: `Mã máy ${code} · mở danh sách ROM HyperOS`,
    });
  });
  if (!entries.length) throw new Error('Danh sách thiết bị Xiaomi trả về rỗng.');
  entries.sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
  return {
    source: 'xiaomi',
    path: '',
    entries,
    latest: [],
    notes: [XIAOMI_NOTE],
    sourceUrl: XIAOMI_INDEX_URL,
  };
}

function devicePreview(
  device: XiaomiDevice,
  code: string,
  branchCount: number,
): DevicePreview {
  const deviceName = name(device.name) || code;
  const supports = list(device.supports);
  const android = list(device.android);
  const type = string(device.type) || 'phone';
  return {
    name: deviceName,
    sourceUrl: xiaomiDeviceUrl(code),
    imageUrl: imageUrl(code),
    imageAlt: `${deviceName} · ảnh từ HyperOS.fans`,
    summary: [
      `Mã máy: ${code}`,
      `HyperOS: ${supports.join(' / ') || 'chưa có dữ liệu'}`,
      `Android: ${android.join(' / ') || 'chưa có dữ liệu'}`,
      `${branchCount} nhánh ROM · loại ${type}`,
    ],
  };
}

export function parseXiaomiDevice(value: XiaomiDevice, path: string): Catalog {
  const code = path.split('/')[0];
  if (!validCode(code) || string(value.device) !== code)
    throw new Error('Mã thiết bị Xiaomi không hợp lệ.');
  const branches = Array.isArray(value.branches)
    ? value.branches.filter((v): v is XiaomiBranch => !!v && typeof v === 'object')
    : [];
  const deviceName = name(value.name) || code;
  const preview = devicePreview(value, code, branches.length);
  const url = xiaomiDeviceUrl(code);
  const index = branchIndex(path);
  if (path === code) {
    const entries = branches
      .map((branch, i) => {
        const branchName = name(branch.name) || `Nhánh ROM ${i + 1}`;
        const region = string(branch.region);
        const roms =
          branch.roms && typeof branch.roms === 'object'
            ? Object.keys(branch.roms).length
            : 0;
        return {
          id: `xiaomi:${branchPath(code, i)}`,
          source: 'xiaomi',
          kind: 'folder',
          name: branchName,
          path: branchPath(code, i),
          parent: code,
          device: deviceName,
          region: regionLabel(region),
          sourceUrl: url,
          description: `${regionLabel(region)} · ${roms} phiên bản`,
        } satisfies Entry;
      });
    return {
      source: 'xiaomi',
      path,
      entries,
      latest: [],
      notes: [XIAOMI_NOTE],
      sourceUrl: url,
      title: deviceName,
      preview,
    };
  }
  if (index < 0 || index >= branches.length)
    throw new Error('Nhánh ROM Xiaomi không tồn tại.');
  const branch = branches[index];
  const region = string(branch.region);
  const roms =
    branch.roms && typeof branch.roms === 'object'
      ? (branch.roms as Record<string, XiaomiRom>)
      : {};
  const entries: Entry[] = [];
  Object.entries(roms)
    .sort(([, a], [, b]) => string(b.release).localeCompare(string(a.release)))
    .forEach(([version, rom]) => {
      if (!/^[A-Za-z0-9._-]{1,160}$/.test(version)) return;
      Object.entries(rom).forEach(([key, raw]) => {
        const filename = string(raw);
        if (!filename || !/^[^/\\]{1,500}\.(?:zip|tgz)$/i.test(filename)) return;
        const filePath = normalizedPath(`${path}/${version}/${key}`);
        const release = string(rom.release);
        const published = release ? Date.parse(`${release}T00:00:00Z`) : NaN;
        entries.push({
          id: `xiaomi:${filePath}`,
          source: 'xiaomi',
          kind: 'file',
          name: `${version} · ${fileLabel(key)}`,
          path: filePath,
          parent: path,
          device: deviceName,
          region: regionLabel(region),
          version,
          sourceUrl: url,
          downloadUrl: downloadUrl(version, filename),
          sizeLabel: fileLabel(key),
          description: [
            string(rom.android) && `Android ${string(rom.android)}`,
            string(rom.aspatch) && `bản vá ${string(rom.aspatch)}`,
            release && `phát hành ${release}`,
          ]
            .filter(Boolean)
            .join(' · '),
          published: Number.isFinite(published) ? published : undefined,
        });
      });
    });
  return {
    source: 'xiaomi',
    path,
    entries,
    latest: [],
    notes: [XIAOMI_NOTE],
    sourceUrl: url,
    title: name(branch.name) || `Nhánh ROM ${index + 1}`,
    preview,
  };
}
