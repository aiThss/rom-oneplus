import { platform } from '@/lib/platform';
import {
  defaultSettings,
  type Settings,
  type Override,
  type Entry,
  type SiteLog,
} from './model';
export function db() {
  return platform.db;
}
export async function readDocument<T>(key: string, fallback: T): Promise<T> {
  const row = await db()
    .prepare('SELECT body FROM documents WHERE key=?')
    .bind(key)
    .first<{ body: string }>();
  return row ? JSON.parse(row.body) : structuredClone(fallback);
}
export async function writeDocument(key: string, value: unknown) {
  await db()
    .prepare(
      'INSERT INTO documents(key,body,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET body=excluded.body,updated_at=excluded.updated_at',
    )
    .bind(key, JSON.stringify(value), Date.now())
    .run();
}
function currentSettings(value: Settings): Settings {
  const storedSections = Array.isArray(value.sections) ? value.sections : [];
  const hasXiaomi = storedSections.some((section) => section.id === 'xiaomi');
  const lastOrder = storedSections.reduce(
    (max, section) => Math.max(max, section.order),
    -1,
  );
  const sections = defaultSettings.sections.map((fallback) =>
    storedSections.find((section) => section.id === fallback.id) ||
    (fallback.id === 'xiaomi' && !hasXiaomi
      ? { ...fallback, order: lastOrder + 1 }
      : fallback),
  );
  return {
    ...defaultSettings,
    ...value,
    brands: hasXiaomi
      ? value.brands
      : [...new Set([...value.brands, 'Xiaomi', 'Redmi', 'POCO'])],
    sections,
  };
}
export const settings = async () =>
  currentSettings(await readDocument<Settings>('settings', defaultSettings));
export const overrides = () => readDocument<Override[]>('overrides', []);
export const customs = () => readDocument<Entry[]>('customs', []);
export const logs = () => readDocument<SiteLog[]>('logs', []);
export function applyOverrides(entries: Entry[], changes: Override[]) {
  return entries
    .map((e) => {
      const entry = { ...e, ...changes.find((o) => o.id === e.id) };
      // Hiding a source folder also hides descendants reached via an old URL or latest list.
      if (['archive', 'sourceforge', 'xiaomi'].includes(e.source)) {
        const prefix = e.source + ':';
        if (
          changes.some(
            (o) =>
              o.hidden &&
              o.id.startsWith(prefix) &&
              e.path.startsWith(o.id.slice(prefix.length) + '/'),
          )
        ) {
          entry.hidden = true;
        }
      }
      return entry;
    })
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}
