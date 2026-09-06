import { openDatabase, databaseAdapter, fileAdapter, publicOrigin } from '../runtime/storage.mjs';
import type { Platform, Query } from './platform-types';

let database: ReturnType<typeof databaseAdapter> | undefined;

export const platform: Platform = {
  db: {
    prepare(sql: string) {
      database ||= databaseAdapter(openDatabase());
      return database.prepare(sql) as Query;
    },
  },
  files: fileAdapter(),
  get publicOrigin() {
    return publicOrigin();
  },
};
