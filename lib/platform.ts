import { env } from 'cloudflare:workers';
import type { Platform } from './platform-types';
// The Node/Docker build replaces this module through a Vite alias.
export const platform: Platform = {
  db: { prepare: (sql) => env.DB.prepare(sql) },
  files: {
    get: (key) => env.FILES.get(key),
    put: (key, bytes, options) => env.FILES.put(key, bytes, options),
  },
};
