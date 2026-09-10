export type Source = 'archive' | 'sourceforge' | 'xiaomi' | 'ota' | 'custom';
export type Entry = {
  id: string;
  source: Source;
  kind: 'folder' | 'file' | 'link';
  name: string;
  path: string;
  parent: string;
  device?: string;
  region?: string;
  category?: string;
  version?: string;
  size?: number;
  sizeLabel?: string;
  checksum?: string;
  checksumType?: string;
  sourceUrl: string;
  downloadUrl?: string;
  changelogUrl?: string;
  toolsUrl?: string;
  notes?: string[];
  description?: string;
  changelogVi?: string;
  hidden?: boolean;
  order?: number;
  mirrors?: { name: string; url: string }[];
  published?: number;
  isLatest?: boolean;
  expiresAt?: number;
};
export type Catalog = {
  path: string;
  source: Source;
  entries: Entry[];
  latest: Entry[];
  notes: string[];
  sourceUrl: string;
  title?: string;
  preview?: DevicePreview;
};
export type DevicePreview = {
  name: string;
  sourceUrl: string;
  imageUrl: string;
  imageAlt: string;
  summary: string[];
};
export type ZipEntry = {
  kind: 'folder' | 'file';
  name: string;
  path: string;
  sizeLabel?: string;
  important?: boolean;
  downloadUrl?: string;
  children?: ZipEntry[];
};
export type ZipBrowser = {
  id: string;
  name: string;
  summary: { files: number; folders: number; entries: number };
  entries: ZipEntry[];
  sourceUrl: string;
};
export type Cached<T> = {
  data: T;
  updatedAt: number;
  stale: boolean;
  error?: string;
  sourceUrl: string;
};
export type Settings = {
  name: string;
  logo: string;
  accent: string;
  brands: string[];
  devices: { name: string; enabled: boolean; order: number }[];
  sections: { id: string; enabled: boolean; order: number }[];
  groups: { name: string; url: string }[];
  donate: {
    enabled: boolean;
    text: string;
    bank: string;
    account: string;
    holder: string;
    qr: string;
    url: string;
  };
};
export type Override = {
  id: string;
  name?: string;
  description?: string;
  changelogVi?: string;
  hidden?: boolean;
  order?: number;
  mirrors?: { name: string; url: string }[];
};
export type SiteLog = {
  id: string;
  date: string;
  title: string;
  body: string;
  published: boolean;
};
export type RootPatchVariant = {
  id: string;
  label: string;
  version: string;
};
export type RootPatchCapability = {
  available: boolean;
  partition: 'init_boot' | 'boot';
  label?: string;
  variants: RootPatchVariant[];
  k?: string;
  csrf?: string;
  sessionCookie?: string;
  arb1?: boolean;
  message?: string;
};
export type RootPatchJobStatus = {
  state: 'queued' | 'running' | 'ready' | 'failed';
  token?: string;
  message?: string;
  wait_seconds?: number;
  position?: number;
  reference?: string;
};
export type OtaResolveResult = {
  ok: boolean;
  url: string;
  expires_at?: number;
  manual?: boolean;
  cached?: boolean;
  device?: string;
  region?: string;
  version?: string;
  error?: string;
};
export const defaultSettings: Settings = {
  name: 'Kho ROM Việt',
  logo: '/logo.png',
  accent: '#007aff',
  brands: ['OnePlus', 'Xiaomi', 'Redmi', 'POCO'],
  devices: [],
  sections: [
    'archive',
    'xiaomi',
    'recovery',
    'ota',
    'root-guide',
    'mirrors',
    'stats',
    'changelog',
  ].map((id, order) => ({ id, order, enabled: true })),
  groups: [],
  donate: {
    enabled: true,
    text: 'Mọi sự ủng hộ của bạn là nguồn động lực lớn để duy trì máy chủ tải và phát triển kho ROM cho cộng đồng.',
    bank: '',
    account: '',
    holder: '',
    qr: '',
    url: '',
  },
};
export const ARCHIVE = 'https://roms.danielspringer.at';
export const SF = 'https://sourceforge.net/projects/oneplus13flashers/files/';
export const OFOX =
  'https://xdaforums.com/t/recovery-official-beta-orangefox-recovery-r11-3.4751927';
export const recoveryEntry: Entry = {
  id: 'resource:orangefox-op13',
  source: 'custom',
  kind: 'link',
  name: 'OrangeFox Recovery',
  device: 'Oneplus 13',
  path: 'Recovery/OrangeFox',
  parent: 'Recovery',
  category: 'recovery',
  sourceUrl: OFOX,
  description:
    'Trang phát hành OrangeFox Recovery được kho nguồn giới thiệu cho OnePlus 13. Kiểm tra đúng mã thiết bị và hướng dẫn trước khi tải.',
};
export function brandOf(device: string) {
  if (/^(oneplus|op\s)/i.test(device)) return 'OnePlus';
  if (/^oppo/i.test(device)) return 'OPPO';
  if (/^realme/i.test(device)) return 'Realme';
  if (/^redmi/i.test(device)) return 'Redmi';
  if (/^poco/i.test(device)) return 'POCO';
  if (/^(xiaomi|mi\s)/i.test(device)) return 'Xiaomi';
  return '';
}
export function displayName(name: string) {
  const clean = name.replace(/\.+$/, '').trim();
  const names: Record<string, string> = {
    'Custom Roms': 'ROM tùy biến',
    'Super Flashers': 'Super Flashers',
    'Regional Flashers': 'Regional Flashers',
    'Hybrid Flashers': 'Hybrid Flashers',
    'Signal Fix Modules': 'Mô-đun sửa sóng',
    testbuilds: 'Bản thử nghiệm',
    Testbuilds: 'Bản thử nghiệm',
    'Universal Flasher': 'Universal Flasher',
    EDL: 'Cứu máy / EDL',
    Recovery: 'Recovery / OFOX',
  };
  return names[clean] || names[name] || clean.replace(/^Oneplus/i, 'OnePlus');
}
export function formatBytes(n?: number) {
  if (n == null || !Number.isFinite(n)) return 'Chưa có dữ liệu';
  const units = ['B', 'MB', 'GB', 'TB', 'PB'];
  if (n < 1e6) return `${Math.round(n / 1024)} KB`;
  let i = 1;
  let v = n / 1e6;
  while (v >= 1000 && i < 4) {
    v /= 1000;
    i++;
  }
  return `${v.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} ${units[i]}`;
}
export function normalizeDevice(s: string) {
  return s
    .toLowerCase()
    .replace(/^op\s/, 'oneplus ')
    .replace(/\s+/g, ' ')
    .trim();
}
export function visibleEntry(entry: Entry, settings: Settings) {
  const device = entry.device || entry.path.split('/')[0];
  const brand = brandOf(device);
  if (brand && !settings.brands.includes(brand)) return false;
  return (
    !entry.hidden &&
    !settings.devices.some(
      (d) => !d.enabled && normalizeDevice(d.name) === normalizeDevice(device),
    )
  );
}
