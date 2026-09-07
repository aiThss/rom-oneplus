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
      if (!bindings.FILES) throw new Error('R2 binding FILES is not configured.');
      return bindings.FILES.get(key);
    },
    put(key, bytes, options) {
      if (!bindings.FILES) throw new Error('R2 binding FILES is not configured.');
      return bindings.FILES.put(key, bytes, options);
    },
  },
  get publicOrigin() {
    const raw = bindings.PUBLIC_ORIGIN;
    if (!raw) throw new Error('Set PUBLIC_ORIGIN to the public HTTPS origin of this site.');
    const url = new URL(raw);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (
      (url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      throw new Error('PUBLIC_ORIGIN must be an HTTPS origin without a path, query or credentials.');
    return url.origin;
  },
};
