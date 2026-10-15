'use client';
// React Compiler is not enabled; effects synchronize remote data and browser preferences.
/* eslint-disable react/react-compiler */
/* eslint-disable nextjs/no-img-element */
import { useState } from 'react';
import {
  Zap,
  Download,
  ExternalLink,
  HardDrive,
  Terminal,
  CheckCircle2,
  FolderArchive,
  Maximize2,
  Mail,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useRemote, Loading } from './common';
import { useLanguage } from '@/lib/language';
import { type Entry } from '@/lib/model';

type LightboxImage = {
  src: string;
  alt: string;
  caption?: string;
};

export function FlashingGuideView() {
  const { language } = useLanguage();
  const en = language === 'en';

  const [activeImage, setActiveImage] = useState<LightboxImage | null>(null);

  // Fetch custom tools & ROM links registered under flashing-guide category
  const customsResult = useRemote<Entry[]>('/api/flashing-guide');
  const customLinks = customsResult.data || [];

  return (
    <div className="root-guide-page flashing-guide-page">
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <div className="eyebrow flex items-center gap-1.5">
            <Zap size={14} className="text-amber-500 fill-amber-500/20" />
            FLASHING GUIDE · ONEPLUS 15
          </div>
          <h1>
            {en
              ? 'Flashing Guide · Fastboot Firmware Flasher for OnePlus 15'
              : 'Flashing Guide · Fastboot Firmware Flasher dành cho OnePlus 15'}
          </h1>
          <p>
            {en
              ? 'Complete step-by-step guide to extract and flash ROM via FastbootD using Fastboot Firmware Flasher (FFF).'
              : 'Hướng dẫn chi tiết từng bước giải nén và nạp ROM qua FastbootD bằng công cụ Fastboot Firmware Flasher (FFF).'}
          </p>
        </div>
        <span className="subtle-pill">
          <Zap size={15} />
          Fastboot Firmware Flasher (FFF)
        </span>
      </div>

      {/* Safety Warnings & Procedure (Cloned from Root Guide without firmware version restriction) */}
      <section className="panel guide-step-card safety-guide-card">
        <div className="step-header">
          <span className="step-badge">{en ? 'Safety' : 'Lưu ý'}</span>
          <h2>
            {en ? 'Process & Safety Warnings' : 'Quy trình & Cảnh báo an toàn'}
          </h2>
        </div>

        <div className="guide-steps-list">
          <div className="guide-bullet">
            <span className="bullet-num">1</span>
            <div>
              <strong>Mở khóa Bootloader (Unlock Bootloader)</strong>
              <p>
                {en
                  ? 'Required before flashing. Open Settings → Developer options → enable OEM unlocking and USB debugging. Reboot to bootloader and run '
                  : 'Bắt buộc trước khi flash. Vào Cài đặt → Tùy chọn nhà phát triển → Bật Mở khóa OEM và Gỡ lỗi USB. Khởi động vào bootloader và chạy '}
                <code>fastboot flashing unlock</code>{' '}
                {en
                  ? '(this erases all device data).'
                  : '(Thao tác này sẽ xóa sạch dữ liệu trên máy).'}
              </p>
            </div>
          </div>

          <div className="guide-bullet">
            <span className="bullet-num">2</span>
            <div>
              <strong>
                {en
                  ? 'OnePlus / Chinese device note'
                  : 'Lưu ý cho OnePlus / Máy nội địa Trung Quốc'}
              </strong>
              <p>
                {en
                  ? 'For a China-region OnePlus converted to OxygenOS, never relock the bootloader until standard Fastboot access has been restored.'
                  : 'Nếu bạn sở hữu máy OnePlus nội địa chuyển sang OxygenOS, tuyệt đối không khóa lại bootloader nếu chưa khôi phục quyền truy cập Fastboot tiêu chuẩn.'}
              </p>
            </div>
          </div>

          <div className="guide-bullet">
            <span className="bullet-num">3</span>
            <div>
              <strong>
                {en
                  ? 'Storage warning tip (Low space)'
                  : 'Bỏ qua cảnh báo bộ nhớ trống (Low space)'}
              </strong>
              <p>
                {en
                  ? 'The red "Low space: 18,8 GB (need ~20 GB)" in the tool is only an estimate and can be safely ignored as long as your drive has sufficient space.'
                  : 'Cảnh báo chữ đỏ "Low space: 18,8 GB (need ~20 GB)" trong giao diện FFF chỉ là ước lượng dự phòng của công cụ, bạn có thể an tâm bỏ qua mà không ảnh hưởng gì tới việc flash.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Steps Grid */}
      <div className="root-guide-grid">
        {/* Step 1: Download Tools & ROM */}
        <section className="panel guide-step-card wide-card">
          <div className="step-header">
            <span className="step-badge">{en ? 'Step 1' : 'Bước 1'}</span>
            <h2>
              {en
                ? 'Download Required Tools & ROM'
                : 'Tải các công cụ cần thiết & File ROM'}
            </h2>
          </div>
          <p className="step-desc">
            {en
              ? 'Download the Fastboot Firmware Flasher (FFF) tool, ADB/Fastboot drivers, and your target ROM package.'
              : 'Tải công cụ Fastboot Firmware Flasher (FFF), Driver điều khiển và bản ROM cần nạp cho thiết bị.'}
          </p>

          {customsResult.loading ? (
            <Loading />
          ) : customLinks.length > 0 ? (
            <div className="tool-links-grid">
              {customLinks.map((item) => (
                <div key={item.id} className="tool-card group">
                  <div className="tool-icon">
                    {item.name.toLowerCase().includes('rom') ? (
                      <FolderArchive size={22} />
                    ) : item.name.toLowerCase().includes('driver') ? (
                      <HardDrive size={22} />
                    ) : (
                      <Terminal size={22} />
                    )}
                  </div>
                  <div className="tool-info grow">
                    <strong>{item.name}</strong>
                    <span>
                      {item.description ||
                        (item.device ? `Dành cho ${item.device}` : 'Công cụ tải về')}
                    </span>
                    {item.checksum && (
                      <div className="text-[11px] opacity-70 mt-1 font-mono">
                        {item.checksumType || 'MD5'}: {item.checksum}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {item.downloadUrl && (
                      <a
                        href={item.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          buttonVariants({ variant: 'default', size: 'sm' }),
                          'flex items-center gap-1.5',
                        )}
                      >
                        <Download size={14} />
                        Tải trực tiếp
                      </a>
                    )}
                    {item.sourceUrl && (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          buttonVariants({ variant: 'outline', size: 'sm' }),
                          'flex items-center gap-1.5',
                        )}
                      >
                        <ExternalLink size={14} />
                        Trang nguồn
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="patch-unavailable-state border border-dashed border-border rounded-xl p-6 text-center">
              <Mail size={26} className="mx-auto mb-2 text-primary" />
              <strong className="block text-foreground mb-1 text-base">
                {en
                  ? 'Download links are currently being updated'
                  : 'Chưa có liên kết tải'}
              </strong>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-3">
                {en
                  ? 'Please wait for the administrator to update the links, or contact via email to request download links:'
                  : 'Vui lòng đợi admin cập nhật, hoặc bạn có thể gửi qua email này để yêu cầu link tải:'}
              </p>
              <a
                href="mailto:danhthai4560@gmail.com?subject=Y%C3%AAu%20c%E1%BA%A7u%20link%20t%E1%BA%A3i%20Tool%20FFF%20%26%20ROM%20OnePlus%2015"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'inline-flex items-center gap-2 font-mono text-xs hover:border-primary hover:text-primary transition',
                )}
              >
                <Mail size={14} className="text-primary" />
                danhthai4560@gmail.com
              </a>
            </div>
          )}
        </section>

        {/* Step 2: Open Tool FFF & Select Unpack */}
        <section className="panel guide-step-card">
          <div className="step-header">
            <span className="step-badge">{en ? 'Step 2' : 'Bước 2'}</span>
            <h2>{en ? 'Open FFF & Select Unpacker' : 'Mở tool FFF & Chọn Unpack'}</h2>
          </div>
          <p className="step-desc">
            {en
              ? 'Launch Fastboot Firmware Flasher. On the Home screen, click the "Unpacker" tile or open Firmware Unpacker on the left menu.'
              : 'Khởi động phần mềm Fastboot Firmware Flasher (FFF). Tại màn hình Home, nhấn chọn ô Unpacker (hoặc chọn thẻ Firmware Unpacker ở danh mục thanh bên trái).'}
          </p>

          <button
            type="button"
            className="guide-image-container group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-black/10 w-full text-left p-0 focus:outline-none focus:ring-2 focus:ring-primary"
            onClick={() =>
              setActiveImage({
                src: '/guide-flashing/step-1-home.jpg',
                alt: 'FFF Home Screen - Chọn Unpacker',
                caption: 'Màn hình chính Fastboot Firmware Flasher - Chọn Unpacker',
              })
            }
          >
            <img
              src="/guide-flashing/step-1-home.jpg"
              alt="FFF Home Screen - Chọn Unpacker"
              className="w-full object-cover rounded-xl transition duration-300 group-hover:scale-[1.02]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs gap-1.5 font-medium">
              <Maximize2 size={16} /> Nhấp để phóng to ảnh
            </div>
          </button>
        </section>

        {/* Step 3: Drag & Drop ROM */}
        <section className="panel guide-step-card">
          <div className="step-header">
            <span className="step-badge">{en ? 'Step 3' : 'Bước 3'}</span>
            <h2>{en ? 'Drag & Drop ROM File' : 'Kéo thả file ROM vào Tool'}</h2>
          </div>
          <p className="step-desc">
            {en
              ? 'Open the folder containing the downloaded ROM file. Drag and drop the ROM zip file directly into the Local Unpacker box.'
              : 'Mở thư mục máy tính chứa file ROM vừa tải về. Kéo và thả file ROM trực tiếp vào khu vực nét đứt "Drag & Drop" trong tab Local Unpacker.'}
          </p>

          <button
            type="button"
            className="guide-image-container group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-black/10 w-full text-left p-0 focus:outline-none focus:ring-2 focus:ring-primary"
            onClick={() =>
              setActiveImage({
                src: '/guide-flashing/step-2-unpack-drag.jpg',
                alt: 'Kéo thả file ROM vào khu vực Local Unpacker',
                caption: 'Giao diện Firmware Unpacker - Kéo thả file ROM vào ô Drag & Drop',
              })
            }
          >
            <img
              src="/guide-flashing/step-2-unpack-drag.jpg"
              alt="Kéo thả file ROM vào Local Unpacker"
              className="w-full object-cover rounded-xl transition duration-300 group-hover:scale-[1.02]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs gap-1.5 font-medium">
              <Maximize2 size={16} /> Nhấp để phóng to ảnh
            </div>
          </button>
        </section>

        {/* Step 4: Unpack ROM & Wait For Success */}
        <section className="panel guide-step-card wide-card">
          <div className="step-header">
            <span className="step-badge">{en ? 'Step 4' : 'Bước 4'}</span>
            <h2>{en ? 'Execute Unpack & Verification' : 'Bấm Unpack & Chờ giải nén thành công'}</h2>
          </div>
          <p className="step-desc">
            {en
              ? 'After dropping the ROM, verify firmware details (Product Name, Version, ARB Status) and click the purple "Unpack" button. Wait until "Unpacking Completed" appears, then click Close.'
              : 'Sau khi thả file ROM, kiểm tra thông tin hiển thị (Product Name, Version Name, ARB Status) và bấm nút màu tím Unpack. Đợi quá trình giải nén các phân vùng kết thúc và thông báo Unpacking Completed hiện lên, bấm Close để đóng.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              className="guide-image-container group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-black/10 w-full text-left p-0 focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={() =>
                setActiveImage({
                  src: '/guide-flashing/step-3-unpack-start.jpg',
                  alt: 'Bấm nút Unpack sau khi kéo file ROM vào',
                  caption: 'Kiểm tra thông số ROM và bấm nút Unpack',
                })
              }
            >
              <img
                src="/guide-flashing/step-3-unpack-start.jpg"
                alt="Bấm nút Unpack"
                className="w-full object-cover rounded-xl transition duration-300 group-hover:scale-[1.02]"
                loading="lazy"
              />
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded text-white text-xs">
                1. Sẵn sàng Unpack
              </div>
            </button>

            <button
              type="button"
              className="guide-image-container group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-black/10 w-full text-left p-0 focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={() =>
                setActiveImage({
                  src: '/guide-flashing/step-4-unpack-completed.jpg',
                  alt: 'Unpacking Completed thành công',
                  caption: 'Giải nén hoàn tất - Bấm Close trên hộp thoại',
                })
              }
            >
              <img
                src="/guide-flashing/step-4-unpack-completed.jpg"
                alt="Unpacking Completed"
                className="w-full object-cover rounded-xl transition duration-300 group-hover:scale-[1.02]"
                loading="lazy"
              />
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded text-white text-xs">
                2. Unpack thành công (Completed)
              </div>
            </button>
          </div>
        </section>

        {/* Step 5 & 6: Switch to Flasher & Connect Phone (3 Green Ticks & Red Box on Start) */}
        <section className="panel guide-step-card wide-card">
          <div className="step-header">
            <div className="flex items-center gap-2">
              <span className="step-badge">{en ? 'Step 5 & 6' : 'Bước 5 & 6'}</span>
              <span className="text-xs bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-full font-semibold">
                Quan trọng: Bấm nút Start ở thanh trên
              </span>
            </div>
            <h2>
              {en
                ? 'Firmware Flasher Tab · ADB Connection & Start Button'
                : 'Chuyển qua tab Firmware Flasher · Nhận ADB 3 Tick Xanh & Bấm Start'}
            </h2>
          </div>
          <div className="step-desc space-y-2">
            <p>
              {en
                ? 'Click on the "Firmware Flasher" tab (lightning bolt icon). Re-enable USB debugging on your device so FFF detects ADB. Ensure Drivers are installed, then check connection.'
                : 'Nhấp chọn tab Firmware Flasher (biểu tượng hình tia sét ở menu trái). Thao tác bật lại Gỡ lỗi USB (USB Debugging) trên điện thoại để máy tính nhận ADB. Nếu máy tính chưa cài driver, bấm Install Drivers để cài đặt rồi bấm Check.'}
            </p>
            <div className="p-3 bg-secondary/50 rounded-lg text-sm border border-border flex items-start gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <strong>Đạt chuẩn kết nối:</strong> Thiết bị nhận dạng ADB hiển thị trên thanh tiêu đề và <strong>đủ 3 dòng tick xanh (✓)</strong> gồm:
                <em> Install Drivers</em>, <em>Unpack Firmware</em> và <em>Connect Phone To PC</em>.
                <br />
                <span className="text-amber-500 font-medium">Lưu ý:</span> Cảnh báo chữ đỏ <em>Low space: 18,8 GB (need ~20 GB)</em> không ảnh hưởng gì, hoàn toàn có thể bỏ qua.
              </div>
            </div>
            <p>
              Sau khi được như ảnh dưới, bấm vào nút <strong>Start</strong> ở thanh tab phía trên (<strong>đã được khoanh đỏ nổi bật</strong>) để chuyển sang giao diện nạp ROM.
            </p>
          </div>

          <button
            type="button"
            className="guide-image-container group relative cursor-pointer overflow-hidden rounded-xl border border-red-500/30 bg-black/10 mt-2 w-full text-left p-0 focus:outline-none focus:ring-2 focus:ring-red-500"
            onClick={() =>
              setActiveImage({
                src: '/guide-flashing/step-6-flasher-adb-start.jpg',
                alt: 'Giao diện Firmware Flasher đủ 3 tick xanh và ô Start được khoanh đỏ',
                caption: 'Nhận đủ 3 dấu tick xanh ADB và nhấp vào nút Start ở trên cùng (ô khoanh đỏ)',
              })
            }
          >
            <img
              src="/guide-flashing/step-6-flasher-adb-start.jpg"
              alt="Firmware Flasher đủ 3 tick xanh - Khoanh đỏ ô Start"
              className="w-full object-cover rounded-xl transition duration-300 group-hover:scale-[1.01]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs gap-1.5 font-medium">
              <Maximize2 size={16} /> Nhấp để phóng to ảnh chi tiết
            </div>
          </button>
        </section>

        {/* Step 7: FastbootD & Execute Flashing */}
        <section className="panel guide-step-card">
          <div className="step-header">
            <span className="step-badge">{en ? 'Step 7' : 'Bước 7'}</span>
            <h2>{en ? 'Enter FastbootD & Start Flash' : 'Vào FastbootD & Bấm Start Flash'}</h2>
          </div>
          <p className="step-desc">
            {en
              ? 'On the Flash screen, click "To FastbootD" to reboot the phone into FastbootD mode. Once entered, click the large "Start" button below to begin flashing.'
              : 'Tại giao diện chuẩn bị flash, nhấp vào nút To FastbootD để tool tự động đưa điện thoại vào chế độ FastbootD. Sau khi máy đã vào FastbootD, bấm nút Start lớn ở dưới cùng để bắt đầu nạp ROM.'}
          </p>

          <button
            type="button"
            className="guide-image-container group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-black/10 w-full text-left p-0 focus:outline-none focus:ring-2 focus:ring-primary"
            onClick={() =>
              setActiveImage({
                src: '/guide-flashing/step-7-fastbootd-flash.jpg',
                alt: 'Bấm To FastbootD và Start Flash',
                caption: 'Chọn To FastbootD rồi bấm Start để flash ROM',
              })
            }
          >
            <img
              src="/guide-flashing/step-7-fastbootd-flash.jpg"
              alt="Bấm To FastbootD và Start Flash"
              className="w-full object-cover rounded-xl transition duration-300 group-hover:scale-[1.02]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs gap-1.5 font-medium">
              <Maximize2 size={16} /> Nhấp để phóng to ảnh
            </div>
          </button>
        </section>

        {/* Step 8: Flashing Speed, Bootloader Blink & Recovery Format Data */}
        <section className="panel guide-step-card">
          <div className="step-header">
            <span className="step-badge">{en ? 'Step 8' : 'Bước 8'}</span>
            <h2>{en ? 'Flash Duration & Format Data' : 'Thời gian Flash & Format Data'}</h2>
          </div>
          <div className="step-desc space-y-3">
            <div className="p-3 bg-secondary/50 rounded-lg text-sm border border-border">
              <strong className="text-foreground block mb-1">⚡ Tốc độ nạp siêu nhanh:</strong>
              Nếu bạn sử dụng cáp Type-C chất lượng cao, tool sẽ nạp hoàn tất toàn bộ phân vùng ROM trong khoảng từ <strong>30 giây đến 1 phút</strong>.
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-foreground">
              <strong className="text-amber-500 block mb-1">⚠️ Hiện tượng nháy Bootloader:</strong>
              Sau khi nạp xong, máy sẽ khởi động lại và có thể nháy màn hình Bootloader do tạm thời mất quyền truy cập. <strong>Hiện tượng này hoàn toàn bình thường</strong>.
            </div>

            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm">
              <strong className="text-primary block mb-1">🛠 Thao tác hoàn tất trong Recovery:</strong>
              <ol className="list-decimal pl-4 space-y-1 mt-1 text-sm">
                <li>Khi máy vào giao diện <strong>Recovery Mode</strong>, chọn ngôn ngữ <strong>English</strong>.</li>
                <li>Chọn mục <strong>Format data</strong>.</li>
                <li>Nhập mã xác nhận hiển thị trên màn hình và bấm <strong>Format</strong> để xóa sạch dữ liệu.</li>
                <li>Máy khởi động lại vào hệ điều hành thành công!</li>
              </ol>
            </div>

            <p className="text-xs text-muted-foreground italic">
              💡 Lưu ý: Sau này khi có các bản ROM SuperFlasher phát hành, bạn có thể sử dụng trực tiếp để fix bootloader và tinh chỉnh.
            </p>
          </div>
        </section>
      </div>

      {/* Lightbox Modal */}
      <Dialog
        open={!!activeImage}
        onOpenChange={(open) => {
          if (!open) setActiveImage(null);
        }}
      >
        <DialogContent className="max-w-5xl p-3 sm:p-5 overflow-hidden bg-background/95 backdrop-blur-md">
          <DialogHeader className="px-1 pt-0 pb-2">
            <DialogTitle className="text-base font-semibold">
              {activeImage?.caption || activeImage?.alt}
            </DialogTitle>
          </DialogHeader>
          {activeImage && (
            <div className="overflow-auto bg-black/20 rounded-lg p-2 flex items-center justify-center max-h-[78vh]">
              <img
                src={activeImage.src}
                alt={activeImage.alt}
                className="max-h-[72vh] w-auto max-w-full object-contain rounded-md shadow-sm"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
