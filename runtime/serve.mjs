import { resolve } from 'node:path';
import { startProdServer } from 'vinext/server/prod-server';
import { openDatabase, migrate, provisionAdmin, publicOrigin } from './storage.mjs';
const applicationRoot = resolve(import.meta.dirname, '..');
const origin = publicOrigin();
const database = openDatabase();
try {
  migrate(database, resolve(applicationRoot, 'drizzle'));
  provisionAdmin(database);
} finally { database.close(); }
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port.');
console.log(`Kho ROM Việt · public origin ${origin}`);
await startProdServer({ host: process.env.HOST || '0.0.0.0', port, outDir: resolve(applicationRoot, 'dist') });
