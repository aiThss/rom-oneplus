import { cpSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
process.chdir(resolve(import.meta.dirname, '..'));
// The caller stops dev/start first so D1 metadata and R2 objects form one consistent snapshot.
if (!process.argv.includes('--server-stopped')) {
  console.error(
    'Dừng ứng dụng bằng Ctrl+C trước. Sau đó chạy: npm run backup -- --server-stopped',
  );
  process.exit(1);
}
if (!existsSync('.wrangler/state'))
  throw new Error('Chưa có dữ liệu local để sao lưu.');
const target = resolve(
  '.local/backups',
  new Date().toISOString().replace(/[:.]/g, '-'),
);
mkdirSync(target, { recursive: true });
cpSync('.wrangler/state', resolve(target, 'state'), { recursive: true });
if (existsSync('.local/admin-access.txt'))
  cpSync('.local/admin-access.txt', resolve(target, 'admin-access.txt'));
writeFileSync(
  resolve(target, 'RESTORE.txt'),
  'Dừng ứng dụng. Giữ lại thư mục .wrangler/state hiện tại ở nơi khác trước khi thay thế. Chép thư mục state trong bản sao lưu về .wrangler/state. Nếu cần, chép admin-access.txt về .local/admin-access.txt. Chạy npm run dev. Bản sao lưu chứa tài khoản và phiên đăng nhập; chỉ giữ ở nơi riêng tư.\n',
);
console.log('Đã sao lưu dữ liệu và ảnh local vào: ' + target);
