import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  readFileSync,
} from 'node:fs';
import { randomBytes, scryptSync } from 'node:crypto';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
process.chdir(root);
const cli = resolve('node_modules/wrangler/bin/wrangler.js');
function run(args) {
  const r = spawnSync(
    process.execPath,
    [cli, ...args, '--config', 'wrangler.local.json', '--local'],
    {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        WRANGLER_SEND_METRICS: 'false',
        WRANGLER_WRITE_LOGS: 'false',
      },
    },
  );
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
  return r.stdout;
}
console.log('Chuẩn bị cơ sở dữ liệu local…');
console.log(run(['d1', 'migrations', 'apply', 'DB']));
const status = JSON.parse(
  run([
    'd1',
    'execute',
    'DB',
    '--command',
    'SELECT id FROM admin WHERE id=1',
    '--json',
  ]),
);
if (!status[0]?.results?.length || process.argv.includes('--reset-admin')) {
  mkdirSync('.local', { recursive: true });
  const password = randomBytes(18).toString('base64url');
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 32).toString('hex');
  const sql = resolve('.local/bootstrap.sql');
  writeFileSync(
    sql,
    `INSERT INTO admin(id,username,salt,hash) VALUES(1,'admin','${salt}','${hash}') ON CONFLICT(id) DO UPDATE SET username=excluded.username,salt=excluded.salt,hash=excluded.hash;\nDELETE FROM sessions;\nDELETE FROM login_throttle;`,
  );
  try {
    run(['d1', 'execute', 'DB', '--file', sql]);
  } finally {
    rmSync(sql, { force: true });
  }
  writeFileSync(
    '.local/admin-access.txt',
    `Kho ROM Việt — tài khoản quản trị local\n\nĐịa chỉ: http://127.0.0.1:4313/admin\nTên đăng nhập: admin\nMật khẩu: ${password}\n\nTệp này chỉ nằm trên máy, bị loại khỏi Git. Giữ riêng hoặc xóa sau khi lưu vào trình quản lý mật khẩu.\nĐặt lại bằng: npm run admin:reset\n`,
    { mode: 0o600 },
  );
  console.log(
    'Tài khoản đã tạo. Thông tin tại .local/admin-access.txt (không đưa vào Git).',
  );
} else {
  const accessFile = '.local/admin-access.txt';
  if (existsSync(accessFile)) {
    writeFileSync(
      accessFile,
      readFileSync(accessFile, 'utf8').replace(
        /^Địa chỉ: .*$/m,
        'Địa chỉ: http://127.0.0.1:4313/admin',
      ),
    );
  }
  console.log('Giữ nguyên tài khoản quản trị đã có.');
}
