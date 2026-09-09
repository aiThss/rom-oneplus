import {
  databaseAdapter,
  fileAdapter,
  openDatabase,
  publicOrigin,
} from './storage.mjs';

// Vinext's server bundle expects the Worker-native `env` module. Dokploy runs
// this build in a regular Node container, so expose the same binding shape
// through the SQLite/R2-compatible local adapters used by the Node runtime.
const database = databaseAdapter(openDatabase());
const files = fileAdapter();

export const env = {
  DB: database,
  FILES: files,
  PUBLIC_ORIGIN: publicOrigin(),
};
