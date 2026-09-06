import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { readFile, writeFile, rename, mkdir, unlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash, randomBytes, randomUUID, scryptSync } from 'node:crypto';

export function dataDirectory() {
  return resolve(process.env.DATA_DIR || '.local/node-data');
}
export function publicOrigin() {
  const raw = process.env.PUBLIC_ORIGIN;
  if (!raw) throw new Error('Set PUBLIC_ORIGIN to the public HTTPS origin of this site.');
  const url = new URL(raw);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('PUBLIC_ORIGIN must be an HTTPS origin without a path, query or credentials.');
  }
  return url.origin;
}
export function openDatabase(directory = dataDirectory()) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const database = new DatabaseSync(join(directory, 'rom.sqlite'));
  database.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  return database;
}
export function migrate(database, migrationsDirectory) {
  database.exec('CREATE TABLE IF NOT EXISTS rom_migrations (name TEXT PRIMARY KEY, digest TEXT NOT NULL, applied_at INTEGER NOT NULL)');
  for (const name of readdirSync(migrationsDirectory).filter((f) => f.endsWith('.sql')).sort()) {
    const sql = readFileSync(join(migrationsDirectory, name), 'utf8');
    const digest = createHash('sha256').update(sql).digest('hex');
    const applied = database.prepare('SELECT digest FROM rom_migrations WHERE name=?').get(name);
    if (applied) {
      if (applied.digest !== digest) throw new Error(`Applied migration was changed: ${name}`);
      continue;
    }
    database.exec('BEGIN IMMEDIATE');
    try {
      database.exec(sql);
      database.prepare('INSERT INTO rom_migrations(name,digest,applied_at) VALUES(?,?,?)').run(name, digest, Date.now());
      database.exec('COMMIT');
    } catch (error) { database.exec('ROLLBACK'); throw error; }
  }
}
export function provisionAdmin(database, { reset = false } = {}) {
  if (database.prepare('SELECT id FROM admin WHERE id=1').get() && !reset) return false;
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || '';
  if (!/^[a-zA-Z0-9_.-]{3,60}$/.test(username)) throw new Error('ADMIN_USERNAME must contain 3–60 letters, digits, _, . or -.');
  if (password.length < 14 || password.length > 200) throw new Error('Set ADMIN_PASSWORD to a unique password of 14–200 characters before the first start.');
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 32).toString('hex');
  database.exec('BEGIN IMMEDIATE');
  try {
    database.prepare("INSERT INTO admin(id,username,salt,hash) VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET username=excluded.username,salt=excluded.salt,hash=excluded.hash").run(username, salt, hash);
    database.exec('DELETE FROM sessions; DELETE FROM login_throttle; COMMIT;');
  } catch (error) { database.exec('ROLLBACK'); throw error; }
  return true;
}

class PreparedQuery {
  constructor(database, sql, values = []) { this.database = database; this.sql = sql; this.values = values; }
  bind(...values) { return new PreparedQuery(this.database, this.sql, values); }
  async first() { return this.database.prepare(this.sql).get(...this.values) || null; }
  async all() { return { results: this.database.prepare(this.sql).all(...this.values) }; }
  async run() {
    const result = this.database.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}
export function databaseAdapter(database) { return { prepare: (sql) => new PreparedQuery(database, sql) }; }

function assetPath(directory, key) {
  if (!/^[a-f0-9-]+\.(png|jpg|webp)$/.test(key)) throw new Error('Invalid image key.');
  return join(directory, 'uploads', key);
}
export function fileAdapter(directory = dataDirectory()) {
  return {
    async get(key) {
      const file = assetPath(directory, key);
      try {
        const bytes = await readFile(file);
        const contentType = key.endsWith('.jpg') ? 'image/jpeg' : key.endsWith('.webp') ? 'image/webp' : 'image/png';
        return { body: new Uint8Array(bytes), httpMetadata: { contentType } };
      } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    },
    async put(key, bytes) {
      const file = assetPath(directory, key);
      await mkdir(join(directory, 'uploads'), { recursive: true, mode: 0o700 });
      const temporary = file + '.' + randomUUID() + '.tmp';
      try {
        await writeFile(temporary, bytes, { mode: 0o600, flag: 'wx' });
        await rename(temporary, file);
      } finally { await unlink(temporary).catch((error) => { if (error.code !== 'ENOENT') throw error; }); }
    },
  };
}
