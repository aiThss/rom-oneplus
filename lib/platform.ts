import { env } from 'cloudflare:workers';
import type { Platform, Query } from './platform-types';

type WorkerEnv = {
  DB?: { prepare(sql: string): Query };
  FILES?: Platform['files'];
  PUBLIC_ORIGIN?: string;
};

const bindings = env as unknown as WorkerEnv;

export const platform: Platform = {
  db: {
    prepare(sql: string) {
      if (!bindings.DB) throw new Error('D1 binding DB is not configured.');
      return bindings.DB.prepare(sql);
    },
  },
  files: {
    get(key) {
      if (!bindings.FILES)
        throw new Error('R2 binding FILES is not configured.');
      return bindings.FILES.get(key);
    },
    put(key, bytes, options) {
      if (!bindings.FILES)
        throw new Error('R2 binding FILES is not configured.');
      return bindings.FILES.put(key, bytes, options);
    },
  },
  get publicOrigin() {
    const raw = (bindings.PUBLIC_ORIGIN || process.env.PUBLIC_ORIGIN)?.trim();
    if (!raw) return '';
    try {
      const url = new URL(raw);
      return url.origin;
    } catch {
      return '';
    }
  },
};
