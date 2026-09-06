import { env } from 'cloudflare:workers';
import {
  defaultSettings,
  type Settings,
  type Override,
  type Entry,
  type SiteLog,
} from './model';
export function db() {
  return env.DB;
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
export const settings = () =>
  readDocument<Settings>('settings', defaultSettings);
export const overrides = () => readDocument<Override[]>('overrides', []);
export const customs = () => readDocument<Entry[]>('customs', []);
export const logs = () => readDocument<SiteLog[]>('logs', []);
export function applyOverrides(entries: Entry[], changes: Override[]) {
  return entries
    .map((e) => {
      const entry = { ...e, ...changes.find((o) => o.id === e.id) };
      // Hiding a source folder also hides descendants reached via an old URL or latest list.
      if (e.source === 'archive' || e.source === 'sourceforge') {
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
