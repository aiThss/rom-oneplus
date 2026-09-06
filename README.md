# Kho ROM Việt

Kho tra cứu ROM/firmware/recovery bằng tiếng Việt, giao diện lấy cảm hứng từ pinball. Phần người dùng ở `/`, trang quản trị ở `/admin`. File ROM luôn tải từ nguồn; ứng dụng chỉ lưu metadata, cấu hình, nội dung biên tập và ảnh logo/QR.

## Chạy trên máy

Yêu cầu Node.js 22.13 trở lên (đã kiểm tra với Node 24) và npm.

```powershell
cd 'D:\memory\Rom Onelus'
npm ci
npm run dev
```

Mở địa chỉ local do lệnh in ra, mặc định [http://localhost:3000](http://localhost:3000). `predev` áp dụng migration local và chỉ tạo tài khoản khi chưa có. Tài khoản hiện có và nội dung được giữ nguyên khi khởi động lại.

- Thông tin đăng nhập: `.local/admin-access.txt`. Tệp này bị loại khỏi Git và bị chặn khỏi máy chủ phát triển. Không chia sẻ tệp hoặc đưa lên hosting công khai.
- Đặt lại mật khẩu: dừng ứng dụng rồi chạy `npm run admin:reset`. Lệnh tạo mật khẩu ngẫu nhiên mới, cập nhật tệp local và vô hiệu hóa các phiên cũ.
- Chưa có triển khai online hoặc kết nối tên miền. Không dùng máy chủ phát triển để phục vụ công khai.

## Sử dụng và quản trị

1. Chọn thiết bị, duyệt cây thư mục hoặc lọc tên trong danh mục đang xem. Mở **Chi tiết** để xem checksum, changelog và các link tải.
2. Trong OTA, chọn thiết bị/khu vực/phiên bản. **Mở công cụ OTA** đưa đến nguồn; sao chép phiên bản để chọn đúng bản. API công khai không cấp link CDN đã chuẩn bị. Duyệt ZIP và trích xuất cũng mở công cụ nguồn.
3. Recovery/OFOX có trang phát hành OrangeFox cho OnePlus 13, cùng lối vào EDL. Có thể bổ sung recovery khác trong admin.
4. Admin → **Nhận diện**: tên/logo/màu, hãng, thiết bị, thứ tự điều hướng, nhóm và donate. Nhóm rỗng và donate tắt mặc định. Tải logo/QR PNG, JPG hoặc WebP tối đa 2 MB, hoặc dùng URL HTTPS.
5. **Danh mục nguồn**: chọn Archive, SourceForge hoặc bản OTA rồi biên tập tên, mô tả, changelog tiếng Việt, thứ tự, trạng thái ẩn và mirror đã xác minh. Lọc OTA theo tên phiên bản, thiết bị hoặc khu vực. Ẩn thư mục sẽ ẩn cả mục con. **Về dữ liệu nguồn** bỏ tùy chỉnh của đúng mục; không sửa dữ liệu ở máy chủ nguồn.
6. **Liên kết riêng**: thêm/sửa/xóa phần mềm hoặc recovery. Thư mục chứa phải khớp đường dẫn trong kho (ví dụ `Oneplus 13/Custom Roms`), để trống để hiện ở trang đầu. Chọn Recovery để đưa vào mục OFOX.
7. **Changelog web**: biên tập bản nháp hoặc xuất bản nhật ký của website. Changelog ROM nằm trong bản phát hành tương ứng, có nút xem bản gốc.
8. **Đồng bộ**: làm mới một thư mục, danh mục OTA hoặc thống kê; xem thời điểm và lỗi kết nối. Không quét đệ quy toàn bộ nguồn.

Metadata danh mục có cache 15 phút, changelog 24 giờ. Dữ liệu máy chủ lấy tối đa mỗi 30 giây khi trang thống kê đang được xem; thời điểm không xác minh hoặc cũ hơn 5 phút được đánh dấu. Lỗi nguồn giữ bản tốt gần nhất. Không tự dịch nội dung kỹ thuật; admin có thể bổ sung bản tiếng Việt.

Mirror tự động chỉ xuất hiện khi đường dẫn gói và checksum trùng khớp. SourceForge cũng có danh mục độc lập cho các bản chưa ghép được. Các mirror do admin thêm phải được admin kiểm tra đúng gói.

## Sao lưu và khôi phục

Dữ liệu thật nằm trong `.wrangler/state` (D1/SQLite và R2 local), không ở trình duyệt. Chủ đề sáng/tối là tùy chọn duy nhất lưu trong localStorage.

1. Dừng `npm run dev` hoặc `npm start` bằng Ctrl+C để tránh ghi trong lúc sao lưu.
2. Chạy `npm run backup -- --server-stopped`.
3. Bản sao lưu nằm trong `.local/backups/<thời điểm>`, gồm `state`, thông tin tài khoản nếu còn tệp và hướng dẫn khôi phục. Sao chép thư mục này sang nơi riêng tư ngoài máy để có bản dự phòng.
4. Khi khôi phục, dừng ứng dụng, giữ bản `.wrangler/state` hiện tại ở nơi khác rồi thay bằng thư mục `state` trong bản sao lưu. Chép lại tệp tài khoản nếu cần; chạy `npm run dev` để áp dụng migration còn thiếu.

Giữ nguyên migration đã áp dụng trong `drizzle`. Thay đổi schema bằng migration bổ sung; không xóa `.wrangler` để sửa lỗi giao diện.

## Cấu trúc và API

- Sites/Vinext + React/TypeScript, Shadcn/Base UI; Workers-compatible backend, D1 và R2 giả lập local.
- `lib/parsers.ts`: adapter archive, SourceForge, OTA, MD5/changelog và thống kê. HTML chỉ được trích thành văn bản/dữ liệu, không chèn HTML nguồn vào giao diện.
- `lib/sources.ts`: giới hạn miền/đường dẫn metadata, timeout, giới hạn dung lượng, cache bền vững, xác minh mirror. Không có endpoint nhận URL tùy ý để proxy.
- `source_cache` chứa bản nguồn. `documents` chứa cấu hình, ghi đè, link riêng và nhật ký, tách biệt khi đồng bộ. Các bảng `admin`, `sessions`, `login_throttle` quản lý đăng nhập.
- API đọc: `GET /api/settings`, `/api/catalog?source=archive|sourceforge&path=...`, `/api/ota`, `/api/entry?id=...`, `/api/changelog?id=...`, `/api/recovery`, `/api/stats`, `/api/logs`.
- API ghi nằm dưới `/api/admin/*`, bắt buộc phiên quản trị, `Origin` cùng nguồn và header `X-ROM-CSRF: 1`. Đăng nhập/đăng xuất ở `/api/auth/login` và `/api/auth/logout`; phiên 8 giờ, cookie HttpOnly/SameSite=Strict và Secure trên HTTPS. Mật khẩu scrypt, token phiên chỉ lưu hash trong DB; giới hạn thử sai 5 lần/15 phút.
- Ảnh đã lưu phục vụ qua `/api/assets/<id>`; chỉ nhận các định dạng có chữ ký file hợp lệ.
- WebMCP `filter_rom_catalog` dùng chung ô tìm kiếm trong danh mục hiện tại, không tải phần mềm.

## Kiểm tra

```powershell
npm test
npm run typecheck
npm run build
# Cần server local đang chạy, tài khoản local và mạng tới nguồn:
npm run test:integration
```

Kiểm tra tích hợp dùng dữ liệu tạm, khôi phục phần ghi đè đã có và xóa các mục nội dung do test tạo. Không chạy song song với việc admin biên tập. Test ảnh có thể để lại một ảnh PNG 1 pixel trong kho local.

Build sản xuất tạo `dist/server` và `dist/client`. `npm start` chạy bản build bằng Wrangler trên loopback, vẫn dùng dữ liệu local; chưa publish. Trước khi triển khai thật cần chọn hosting, cấu hình binding và rà lại phiên bản toolchain. Các gói React/Vinext/Vite đã được nâng từ starter để sửa cảnh báo hiện có; toolchain Cloudflare của starter vẫn có cảnh báo npm audit (bao gồm undici trong Miniflare), không phải một xác nhận an toàn để mở máy chủ dev ra Internet.

Để dùng bản build: dừng `npm run dev`, chạy `npm run build`, rồi `npm start`. Cả hai chế độ dùng cùng dữ liệu và địa chỉ `http://localhost:3000`; chỉ chạy một chế độ tại một thời điểm. Dừng bằng Ctrl+C trong cửa sổ lệnh đang chạy.

Kiểm tra lưu qua khởi động lại: chạy `node tests/restart.mjs prepare` khi server hoạt động, dừng rồi khởi động lại server, sau đó chạy `node tests/restart.mjs verify`. Bước verify kiểm tra cấu hình, nội dung biên tập và bản nháp; khôi phục nội dung trước kiểm tra. Không biên tập đồng thời trong quá trình này. Khi bàn giao, 11 kiểm thử parser/validation, kiểm thử API với nguồn thật, kiểm tra lưu sau khởi động lại, ảnh R2 và build đã đạt.

## Nguồn dữ liệu và giới hạn

- [ROM Archive](https://roms.danielspringer.at/)
- [Tài liệu OTA API](https://roms.danielspringer.at/api/ota.php?help=1&format=html)
- [SourceForge OnePlus13Flashers](https://sourceforge.net/projects/oneplus13flashers/files/)

Archive và SourceForge phụ thuộc cấu trúc metadata/HTML công khai, có thể cần cập nhật adapter khi nguồn đổi giao diện. Không suy luận link chia sẻ OTA theo ID chưa xác minh, không chuẩn bị bản tải hay trích xuất ở backend này. Trạng thái và dung lượng thiếu được để trống thay vì điền số phỏng đoán.
