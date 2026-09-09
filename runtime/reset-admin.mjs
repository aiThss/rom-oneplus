import { openDatabase, provisionAdmin } from './storage.mjs';
const database = openDatabase();
try {
  provisionAdmin(database, { reset: true });
  console.log('Admin password reset; old sessions revoked.');
} finally {
  database.close();
}
