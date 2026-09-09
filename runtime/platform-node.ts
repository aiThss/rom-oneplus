import {
  openDatabase,
  databaseAdapter,
  fileAdapter,
  publicOrigin,
} from './storage.mjs';
import type { Platform, Query } from '../lib/platform-types';
let database: ReturnType<typeof databaseAdapter> | undefined;
export const platform: Platform = {
  db: {
    prepare(sql) {
      database ||= databaseAdapter(openDatabase());
      // SQL rows are typed by each query's caller, as with the D1 adapter.
      return database.prepare(sql) as Query;
    },
  },
  files: fileAdapter(),
  get publicOrigin() {
    return publicOrigin();
  },
};
