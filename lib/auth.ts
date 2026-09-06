import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { db } from './store';
export const SESSION_COOKIE = 'rom_session';
const digest = (s: string) => createHash('sha256').update(s).digest('hex');
export async function isAdmin(req: Request) {
  const token = (req.headers.get('cookie') || '')
    .split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith(SESSION_COOKIE + '='))
    ?.slice(SESSION_COOKIE.length + 1);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  return !!(await db()
    .prepare('SELECT token FROM sessions WHERE token=? AND expires>?')
    .bind(digest(token), Date.now())
    .first());
}
export function checkOrigin(req: Request) {
  if (
    req.headers.get('origin') !== new URL(req.url).origin ||
    req.headers.get('x-rom-csrf') !== '1'
  )
    throw new Error('Yêu cầu không cùng nguồn.');
}
export async function login(req: Request, username: string, password: string) {
  const limit = await db()
    .prepare('SELECT attempts,until FROM login_throttle WHERE id=1')
    .first<{ attempts: number; until: number }>();
  if (limit && limit.attempts >= 5 && limit.until > Date.now())
    throw new Error('Đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.');
  const admin = await db()
    .prepare('SELECT username,salt,hash FROM admin WHERE id=1')
    .first<{ username: string; salt: string; hash: string }>();
  if (!admin)
    throw new Error(
      'Chưa thiết lập tài khoản. Chạy npm run setup:local trên máy chủ.',
    );
  const computed = scryptSync(password, admin.salt, 32);
  const valid =
    timingSafeEqual(computed, Buffer.from(admin.hash, 'hex')) &&
    username === admin.username;
  if (!valid) {
    const attempts = limit && limit.until > Date.now() ? limit.attempts + 1 : 1;
    await db()
      .prepare(
        'INSERT INTO login_throttle(id,attempts,until) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET attempts=excluded.attempts,until=excluded.until',
      )
      .bind(attempts, Date.now() + 900000)
      .run();
    throw new Error('Tên đăng nhập hoặc mật khẩu không đúng.');
  }
  await db().batch([
    db().prepare('DELETE FROM login_throttle'),
    db().prepare('DELETE FROM sessions WHERE expires<?').bind(Date.now()),
  ]);
  const token = randomBytes(32).toString('hex');
  await db()
    .prepare('INSERT INTO sessions(token,expires) VALUES(?,?)')
    .bind(digest(token), Date.now() + 28800000)
    .run();
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export async function logout(req: Request) {
  const token = (req.headers.get('cookie') || '')
    .split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith(SESSION_COOKIE + '='))
    ?.slice(SESSION_COOKIE.length + 1);
  if (token)
    await db()
      .prepare('DELETE FROM sessions WHERE token=?')
      .bind(digest(token))
      .run();
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}
