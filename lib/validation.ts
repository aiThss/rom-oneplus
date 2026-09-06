import {
  defaultSettings,
  type Settings,
  type Override,
  type Entry,
  type SiteLog,
} from './model.ts';
import { safeLink, normalizedPath } from './parsers.ts';
export function str(v: unknown, max = 300) {
  if (typeof v !== 'string' || v.length > max)
    throw new Error('Nội dung không hợp lệ hoặc quá dài.');
  return v.trim();
}
function list(v: unknown, max = 200): unknown[] {
  if (!Array.isArray(v) || v.length > max)
    throw new Error('Danh sách không hợp lệ.');
  return v;
}
function obj(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v))
    throw new Error('Dữ liệu không hợp lệ.');
  return v as Record<string, unknown>;
}
export function url(v: unknown, asset = false) {
  const value = str(v, 2000);
  if (!value) return '';
  if (asset && /^\/api\/assets\/[a-f0-9-]+\.(png|jpg|webp)$/.test(value))
    return value;
  const good = safeLink(value, 'https://invalid.local');
  if (!good || new URL(good).hostname === 'invalid.local')
    throw new Error('Liên kết phải là HTTPS hợp lệ.');
  return good;
}
const order = (v: unknown) =>
  typeof v === 'number' && Number.isFinite(v)
    ? Math.max(-10000, Math.min(10000, Math.trunc(v)))
    : 999;
function links(v: unknown) {
  return list(v, 25).map((x) => {
    const o = obj(x);
    const value = url(o.url);
    if (!value) throw new Error('Liên kết không được để trống.');
    return { name: str(o.name, 80), url: value };
  });
}
export function validateSettings(value: unknown): Settings {
  const o = obj(value);
  const d = obj(o.donate);
  const accent = str(o.accent, 7);
  if (!/^#[0-9a-f]{6}$/i.test(accent))
    throw new Error('Màu phải có dạng #007aff.');
  const name = str(o.name, 60);
  if (!name) throw new Error('Tên website không được để trống.');
  const allowed = defaultSettings.sections.map((s) => s.id);
  const sections = list(o.sections, 6).map((x) => {
    const s = obj(x);
    const id = str(s.id);
    if (!allowed.includes(id)) throw new Error('Danh mục không hợp lệ.');
    return { id, enabled: s.enabled === true, order: order(s.order) };
  });
  if (new Set(sections.map((s) => s.id)).size !== 6)
    throw new Error('Cần đủ sáu mục điều hướng.');
  return {
    name,
    logo: url(o.logo, true),
    accent,
    brands: list(o.brands, 6).map((x) => {
      const b = str(x);
      if (!['OnePlus', 'OPPO', 'Realme', 'Xiaomi', 'Redmi', 'POCO'].includes(b))
        throw new Error('Hãng không hợp lệ.');
      return b;
    }),
    devices: list(o.devices, 300).map((x) => {
      const d = obj(x);
      return {
        name: str(d.name, 100),
        enabled: d.enabled === true,
        order: order(d.order),
      };
    }),
    sections,
    groups: links(o.groups),
    donate: {
      enabled: d.enabled === true,
      text: str(d.text, 3000),
      bank: str(d.bank, 100),
      account: str(d.account, 100),
      holder: str(d.holder, 100),
      qr: url(d.qr, true),
      url: url(d.url),
    },
  };
}
export function validateOverride(value: unknown): Override {
  const o = obj(value);
  const result: Override = { id: str(o.id, 1000) };
  if (!result.id) throw new Error('Thiếu ID bản phát hành.');
  for (const k of ['name', 'description', 'changelogVi'] as const)
    if (o[k] !== undefined)
      result[k] = str(
        o[k],
        k === 'changelogVi' ? 60000 : k === 'description' ? 5000 : 300,
      );
  if (o.hidden !== undefined) result.hidden = o.hidden === true;
  if (o.order !== undefined) result.order = order(o.order);
  if (o.mirrors !== undefined) result.mirrors = links(o.mirrors);
  return result;
}
export function validateCustom(value: unknown): Entry {
  const o = obj(value);
  const name = str(o.name, 300);
  if (!name) throw new Error('Thiếu tên phần mềm.');
  const parent = normalizedPath(str(o.parent, 800));
  const sourceUrl = url(o.sourceUrl);
  if (!sourceUrl) throw new Error('Thiếu trang nguồn.');
  return {
    id: 'custom:' + crypto.randomUUID(),
    source: 'custom',
    kind: 'file',
    name,
    parent,
    path: parent + '/' + name,
    device: str(o.device, 100),
    category: o.category === 'recovery' ? 'recovery' : 'archive',
    sourceUrl,
    downloadUrl: url(o.downloadUrl) || undefined,
    description: str(o.description || '', 5000),
    changelogVi: str(o.changelogVi || '', 60000),
    checksum: str(o.checksum || '', 128) || undefined,
    checksumType: str(o.checksumType || 'MD5', 16),
    mirrors: links(o.mirrors || []),
  };
}
export function validateLog(value: unknown): SiteLog {
  const o = obj(value);
  const date = str(o.date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)))
    throw new Error('Ngày không hợp lệ.');
  const title = str(o.title, 200);
  if (!title) throw new Error('Thiếu tiêu đề.');
  return {
    id:
      typeof o.id === 'string' && /^[a-f0-9-]{36}$/.test(o.id)
        ? o.id
        : crypto.randomUUID(),
    date,
    title,
    body: str(o.body, 30000),
    published: o.published === true,
  };
}
