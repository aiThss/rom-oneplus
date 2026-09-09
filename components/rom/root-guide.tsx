'use client';
// React Compiler is not enabled; effects synchronize remote data and browser preferences.
/* eslint-disable react/react-compiler */
import { useEffect, useMemo, useState } from 'react';
import {
  Terminal,
  Download,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  Cpu,
  RefreshCw,
  Sparkles,
  Info,
  HardDrive,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Markdown } from './markdown';
import {
  api,
  useRemote,
  SelectField,
  SearchPicker,
} from './common';
import {
  type Cached,
  type Entry,
  type RootPatchCapability,
  type RootPatchJobStatus,
  type RootPatchVariant,
} from '@/lib/model';

function isSupportedRootVariant(variant: RootPatchVariant) {
  const variantName = `${variant.id} ${variant.label}`.toLowerCase();
  return (
    !variantName.includes('apatch') &&
    !variantName.includes('magisk') &&
    /kernelsu|sukisu/.test(variantName)
  );
}

export function RootGuideView() {
  const otaResult = useRemote<Cached<Entry[]>>('/api/ota');
  const [device, setDevice] = useState<string>('OP 13');
  const [region, setRegion] = useState<string>('EU');
  const [versionQuery, setVersionQuery] = useState<string>('');

  // Capability state
  const [capLoading, setCapLoading] = useState<boolean>(false);
  const [capError, setCapError] = useState<string>('');
  const [capability, setCapability] = useState<RootPatchCapability | null>(
    null,
  );

  // Patching process state
  const [selectedFlavor, setSelectedFlavor] = useState<string>('');
  const [patchStatus, setPatchStatus] = useState<RootPatchJobStatus | null>(
    null,
  );
  const [isPatching, setIsPatching] = useState<boolean>(false);
  const [downloadFilename, setDownloadFilename] = useState<string>(
    'init_boot_patched.img',
  );

  // Fastboot command options
  const [useBothSlots, setUseBothSlots] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const rawEntries = otaResult.data?.data;
  const allEntries = useMemo(() => rawEntries || [], [rawEntries]);

  // Filter devices list
  const devices = useMemo(() => {
    const list = [...new Set(allEntries.map((e) => e.device || ''))].filter(
      Boolean,
    );
    return list.sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );
  }, [allEntries]);

  // Available regions for selected device
  const regions = useMemo(() => {
    const list = [
      ...new Set(
        allEntries
          .filter((e) => !device || e.device === device)
          .map((e) => e.region || ''),
      ),
    ].filter(Boolean);
    return list;
  }, [allEntries, device]);

  // Available versions for selected device and region
  const matchingVersions = useMemo(() => {
    return allEntries.filter(
      (e) =>
        (!device || e.device === device) && (!region || e.region === region),
    );
  }, [allEntries, device, region]);

  // Selected entry (defaults to latest)
  const activeEntry = useMemo(() => {
    if (!matchingVersions.length) return null;
    if (versionQuery) {
      const match = matchingVersions.find(
        (e) => e.version?.toLowerCase() === versionQuery.toLowerCase(),
      );
      if (match) return match;
    }
    return matchingVersions[0];
  }, [matchingVersions, versionQuery]);

  // Default region when device changes
  useEffect(() => {
    if (regions.length > 0 && (!region || !regions.includes(region))) {
      setRegion(regions.includes('EU') ? 'EU' : regions[0]);
    }
  }, [regions, region]);

  // Check capability whenever device or activeEntry changes
  useEffect(() => {
    let cancelled = false;
    if (!device) {
      setCapability(null);
      return;
    }

    setCapLoading(true);
    setCapError('');
    setPatchStatus(null);
    setIsPatching(false);

    const versionIdx = matchingVersions.findIndex(
      (e) => e.id === activeEntry?.id,
    );
    const targetIdx = versionIdx >= 0 ? versionIdx : 0;

    const url = `/api/root-patch/check?device=${encodeURIComponent(device)}&region=${encodeURIComponent(region || '')}&versionIndex=${targetIdx}`;

    api<RootPatchCapability>(url)
      .then((data) => {
        if (cancelled) return;
        const variants = (data.variants || []).filter(isSupportedRootVariant);
        setCapability({ ...data, variants, available: data.available && variants.length > 0 });
        if (variants.length) {
          setSelectedFlavor(variants[0].id);
          const partition = data.partition || 'init_boot';
          const cleanVersion = (activeEntry?.version || 'build').replace(
            /[^a-zA-Z0-9_.-]/g,
            '_',
          );
          setDownloadFilename(
            `${partition}_patched_${variants[0].id}_${cleanVersion}.img`,
          );
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setCapError(err.message || 'Chưa kiểm tra được phân vùng vá từ nguồn.');
        setCapability(null);
      })
      .finally(() => {
        if (!cancelled) setCapLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [device, region, activeEntry?.id, activeEntry?.version, matchingVersions]);

  // Handle patch flavour change
  const handleFlavorChange = (flavorId: string) => {
    setSelectedFlavor(flavorId);
    if (capability) {
      const partition = capability.partition || 'init_boot';
      const cleanVersion = (activeEntry?.version || 'build').replace(
        /[^a-zA-Z0-9_.-]/g,
        '_',
      );
      setDownloadFilename(
        `${partition}_patched_${flavorId}_${cleanVersion}.img`,
      );
    }
  };

  // Start Patch Process
  const handleStartPatch = async () => {
    if (!capability || !capability.k || !capability.csrf || !selectedFlavor)
      return;

    setIsPatching(true);
    setPatchStatus({
      state: 'queued',
      message: 'Đang gửi yêu cầu vá tới máy chủ nguồn...',
    });

    try {
      const startResult = await api<RootPatchJobStatus>(
        '/api/root-patch/start',
        {
          k: capability.k,
          csrf: capability.csrf,
          flavor: selectedFlavor,
          sessionCookie: capability.sessionCookie,
        },
      );

      setPatchStatus(startResult);

      if (startResult.state === 'ready' && startResult.token) {
        triggerDownload(startResult.token, capability.sessionCookie);
        setIsPatching(false);
        return;
      }

      // Poll status
      if (startResult.token) {
        const token = startResult.token;
        const cookie = capability.sessionCookie || '';
        const interval = setInterval(async () => {
          try {
            const status = await api<RootPatchJobStatus>(
              `/api/root-patch/status?token=${encodeURIComponent(token)}&session=${encodeURIComponent(cookie)}`,
            );
            setPatchStatus(status);
            if (status.state === 'ready') {
              clearInterval(interval);
              setIsPatching(false);
              triggerDownload(token, cookie);
            } else if (status.state === 'failed') {
              clearInterval(interval);
              setIsPatching(false);
            }
          } catch {
            clearInterval(interval);
            setIsPatching(false);
          }
        }, 2000);
      }
    } catch (err: unknown) {
      setPatchStatus({
        state: 'failed',
        message:
          err instanceof Error
            ? err.message
            : 'Lỗi trong quá trình khởi tạo tác vụ vá.',
      });
      setIsPatching(false);
    }
  };

  const triggerDownload = (token: string, session = '') => {
    const downloadUrl = `/api/root-patch/download?token=${encodeURIComponent(token)}&session=${encodeURIComponent(session)}`;
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.setAttribute('download', downloadFilename);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const partitionName = capability?.partition || 'init_boot';

  const fastbootMarkdown = useMemo(() => {
    const file = downloadFilename || `${partitionName}_patched.img`;
    const flashCommands = useBothSlots
      ? `fastboot flash init_boot_a ${file}\nfastboot flash init_boot_b ${file}`
      : `fastboot flash init_boot ${file}`;

    return [
      '### Bước 1 · Vào Fastboot',
      'Khởi động thiết bị vào chế độ Bootloader.',
      '',
      '```bash',
      'adb reboot bootloader',
      '```',
      '',
      '### Bước 2 · Kiểm tra kết nối',
      'Đảm bảo máy đã được nhận trước khi flash.',
      '',
      '```bash',
      'fastboot devices',
      '```',
      '',
      '### Bước 3 · Flash init_boot',
      useBothSlots
        ? 'Kéo file đã vá vừa tải xuống vào CMD để ghi vào cả Slot A và Slot B.'
        : 'Kéo file đã vá vừa tải xuống vào CMD để có dạng lệnh bên dưới.',
      '',
      '```bash',
      flashCommands,
      '```',
      '',
      '### Bước 4 · Khởi động lại',
      'Hoàn tất quá trình flash và khởi động vào hệ điều hành.',
      '',
      '```bash',
      'fastboot reboot',
      '```',
    ].join('\n');
  }, [partitionName, downloadFilename, useBothSlots]);

  const handleCopyCode = async (code: string) => {
    const copyText = code.startsWith('fastboot flash init_boot ')
      ? 'fastboot flash init_boot'
      : code;

    try {
      await navigator.clipboard.writeText(copyText);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="root-guide-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">ROOT & BOOT PATCH</div>
          <h1>Root Guide · Vá Boot Image & Lệnh Fastboot</h1>
          <p>
            Vá trực tiếp file <code>init_boot.img</code> (hoặc{' '}
            <code>boot.img</code>) từ OTA nguồn bằng KernelSU / SukiSU
            và nhận bộ câu lệnh Fastboot tương ứng.
          </p>
        </div>
        <span className="subtle-pill">
          <Terminal size={15} />
          All-in-One Fastboot Tool
        </span>
      </div>

      <section className="panel guide-step-card safety-guide-card">
        <div className="step-header">
          <span className="step-badge">Lưu ý</span>
          <h2>Quy trình & Cảnh báo an toàn</h2>
        </div>

        <div className="guide-steps-list">
          <div className="guide-bullet">
            <span className="bullet-num">1</span>
            <div>
              <strong>Mở khóa Bootloader (Unlock Bootloader)</strong>
              <p>
                Bắt buộc trước khi flash. Vào Cài đặt → Tùy chọn nhà phát
                triển → Bật <em>Mở khóa OEM</em> và <em>Gỡ lỗi USB</em>. Chạy
                lệnh <code>fastboot flashing unlock</code> (Thao tác này sẽ
                xóa sạch dữ liệu máy).
              </p>
            </div>
          </div>

          <div className="guide-bullet">
            <span className="bullet-num">2</span>
            <div>
              <strong>Đúng phiên bản firmware</strong>
              <p>
                Tuyệt đối chỉ flash file <code>init_boot</code> đã vá tương
                ứng đúng với bản build hệ điều hành đang chạy trên thiết bị để
                tránh lỗi treo bootloop.
              </p>
            </div>
          </div>

          <div className="guide-bullet">
            <span className="bullet-num">3</span>
            <div>
              <strong>Lưu ý cho OnePlus / Máy nội địa Trung Quốc</strong>
              <p>
                Nếu bạn sở hữu máy OnePlus nội địa chuyển sang OxygenOS,
                tuyệt đối không khóa lại bootloader nếu chưa khôi phục quyền
                truy cập Fastboot tiêu chuẩn.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="root-guide-grid">
        {/* Step 1: OTA Selection */}
        <section className="panel guide-step-card">
          <div className="step-header">
            <span className="step-badge">Bước 1</span>
            <h2>Chọn thiết bị & Phiên bản Firmware</h2>
          </div>
          <p className="step-desc">
            Chọn model và bản firmware đang hoạt động trên máy của bạn để đảm
            bảo file vá tương thích tuyệt đối.
          </p>

          <div className="ota-filters root-selectors">
            <SearchPicker
              label="Thiết bị"
              value={device}
              onChange={(v) => {
                setDevice(v);
                setVersionQuery('');
              }}
              options={devices}
            />

            <SelectField
              label="Khu vực (Region)"
              value={region}
              onChange={(r) => {
                setRegion(r);
                setVersionQuery('');
              }}
              options={regions.map((r) => ({ value: r, label: r }))}
            />

            <SelectField
              label="Phiên bản OTA"
              value={activeEntry?.version || ''}
              onChange={(v) => setVersionQuery(v)}
              options={matchingVersions.map((e) => ({
                value: e.version || e.name,
                label: `${e.version || e.name}${e.isLatest ? ' (Mới nhất)' : ''}`,
              }))}
            />
          </div>

          {activeEntry && (
            <div className="current-ota-meta">
              <span>Đang chọn:</span>
              <strong>{activeEntry.device}</strong> ·{' '}
              <span>{activeEntry.region}</span> ·{' '}
              <code>{activeEntry.version}</code>
              {activeEntry.checksum && (
                <small className="ota-meta-checksum">
                  MD5: {activeEntry.checksum}
                </small>
              )}
            </div>
          )}
        </section>

        {/* Step 2: Patch & Download */}
        <section className="panel guide-step-card">
          <div className="step-header">
            <span className="step-badge">Bước 2</span>
            <h2>Vá & Tải Boot Image</h2>
          </div>

          {capLoading ? (
            <div className="cap-loading-state">
              <RefreshCw className="animate-spin" size={20} />
              <p>Đang kiểm tra khả năng vá từ máy chủ nguồn...</p>
            </div>
          ) : capError ? (
            <div className="notice arb-notice">
              <ShieldAlert size={20} className="arb-icon" />
              <div>
                <p>
                  <strong>{capError}</strong>
                </p>
                <p className="arb-warning-sub">
                  Máy chủ nguồn có thể đang bận hoặc bản OTA này chưa được lập
                  chỉ mục phân vùng.
                </p>
              </div>
            </div>
          ) : capability && capability.available ? (
            <div className="root-patch-interactive">
              <div className="patch-target-banner">
                <HardDrive size={18} />
                <span>
                  Phân vùng đích cần vá:{' '}
                  <strong>{capability.label || `${partitionName}.img`}</strong>
                </span>
                {capability.arb1 && (
                  <span className="arb-chip">
                    <ShieldAlert size={14} /> ARB: 1
                  </span>
                )}
              </div>

              {capability.arb1 && (
                <div className="notice arb-notice">
                  <ShieldAlert size={20} className="arb-icon" />
                  <div>
                    <p>
                      <strong>Cảnh báo Anti-Rollback (ARB: 1)</strong>
                    </p>
                    <p className="arb-warning-sub">
                      Bản cập nhật này có cơ chế khóa hạ cấp. Không hạ cấp xuống
                      bản firmware cũ hơn sau khi flash.
                    </p>
                  </div>
                </div>
              )}

              <div className="flavor-select-wrapper">
                <span className="filter-label" id="root-solution-label">
                  Giải pháp Root (Root Solution)
                </span>
                <div className="flavor-pills">
                  {capability.variants.map((v: RootPatchVariant) => (
                    <button
                      key={v.id}
                      type="button"
                      className={`flavor-pill ${selectedFlavor === v.id ? 'active' : ''}`}
                      onClick={() => handleFlavorChange(v.id)}
                      disabled={isPatching}
                      aria-pressed={selectedFlavor === v.id}
                    >
                      <Sparkles size={14} />
                      <span className="flavor-pill-copy">
                        <strong>{v.label}</strong>
                        {v.version && <small>{v.version}</small>}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="patch-action-box">
                <Button
                  className="patch-submit-btn"
                  onClick={handleStartPatch}
                  disabled={isPatching || !selectedFlavor}
                >
                  {isPatching ? (
                    <>
                      <RefreshCw className="animate-spin" size={16} />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      Vá & Tải file ({selectedFlavor.toUpperCase()})
                    </>
                  )}
                </Button>

                {patchStatus && (
                  <div className={`patch-status-box ${patchStatus.state}`}>
                    <div className="status-text">
                      <strong>
                        {patchStatus.state === 'queued' &&
                          'Đang xếp hàng trên máy chủ...'}
                        {patchStatus.state === 'running' &&
                          'Máy chủ đang trích xuất và vá phân vùng...'}
                        {patchStatus.state === 'ready' &&
                          'Đã vá thành công! File đang tải về.'}
                        {patchStatus.state === 'failed' && 'Thất bại'}
                      </strong>
                      <p>{patchStatus.message}</p>
                      {patchStatus.wait_seconds !== undefined &&
                        patchStatus.wait_seconds > 0 && (
                          <small>
                            Thời gian chờ: {patchStatus.wait_seconds}s
                          </small>
                        )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="patch-unavailable-state">
              <Info size={20} />
              <p>
                {capability?.message ||
                  'Bản OTA này chưa hỗ trợ vá tự động trực tiếp. Bạn có thể tải ROM đầy đủ hoặc trích xuất thủ công.'}
              </p>
            </div>
          )}
        </section>

        {/* Step 3: Fastboot Commands Generator */}
        <section className="panel guide-step-card wide-card">
          <div className="step-header">
            <span className="step-badge">Bước 3</span>
            <h2>Câu lệnh Fastboot Flash</h2>
            <div className="card-header-actions">
              <label className="toggle-slot-label">
                <input
                  type="checkbox"
                  checked={useBothSlots}
                  onChange={(e) => setUseBothSlots(e.target.checked)}
                />
                <span>Flash cả 2 Slot (A/B)</span>
              </label>
            </div>
          </div>

          <div className="filename-input-row">
            <label htmlFor="fastboot-filename">
              <span>Tên file đã tải (trong thư mục làm việc):</span>
            </label>
            <Input
              id="fastboot-filename"
              value={downloadFilename}
              onChange={(e) => setDownloadFilename(e.target.value)}
              placeholder="VD: init_boot_patched.img"
              className="filename-input"
            />
          </div>

          <div className="terminal-window">
            <div className="terminal-header">
              <span className="terminal-dot red" />
              <span className="terminal-dot yellow" />
              <span className="terminal-dot green" />
              <span className="terminal-title">
                Terminal / Command Prompt / PowerShell
              </span>
            </div>
            <Markdown
              content={fastbootMarkdown}
              className="terminal-body terminal-markdown"
              onCodeBlockCopy={handleCopyCode}
              copiedCode={copiedCode}
            />
          </div>
        </section>

        {/* Step 4: Tools and Manager APKs */}
        <section className="panel guide-step-card wide-card">
          <div className="step-header">
            <span className="step-badge">Bước 4</span>
            <h2>Công cụ & Ứng dụng Quản lý Root</h2>
          </div>
          <p className="step-desc">
            Cài đặt các công cụ cần thiết trên máy tính và file APK quản lý
            tương ứng trên điện thoại.
          </p>

          <div className="tool-links-grid">
            <a
              href="https://dl.google.com/android/repository/platform-tools-latest-windows.zip"
              target="_blank"
              rel="noopener noreferrer"
              className="tool-card"
            >
              <div className="tool-icon">
                <Terminal size={22} />
              </div>
              <div className="tool-info">
                <strong>Google Platform-Tools</strong>
                <span>ADB & Fastboot chính thức cho Windows</span>
              </div>
              <ExternalLink size={16} />
            </a>

            <a
              href="https://github.com/tiann/KernelSU/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="tool-card"
            >
              <div className="tool-icon">
                <Sparkles size={22} />
              </div>
              <div className="tool-info">
                <strong>KernelSU Manager APK</strong>
                <span>Ứng dụng quản lý KernelSU chính thức</span>
              </div>
              <ExternalLink size={16} />
            </a>

            <a
              href="https://github.com/rifsxd/KernelSU-Next/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="tool-card"
            >
              <div className="tool-icon">
                <Cpu size={22} />
              </div>
              <div className="tool-info">
                <strong>KernelSU Next Manager</strong>
                <span>Quản lý KernelSU-Next thế hệ mới</span>
              </div>
              <ExternalLink size={16} />
            </a>

            <a
              href="https://github.com/SukiSU-Ultra/SukiSU-Ultra/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="tool-card"
            >
              <div className="tool-icon">
                <ShieldCheck size={22} />
              </div>
              <div className="tool-info">
                <strong>SukiSU Ultra Releases</strong>
                <span>Tải bản phát hành SukiSU Ultra chính thức</span>
              </div>
              <ExternalLink size={16} />
            </a>
          </div>
        </section>

      </div>
    </div>
  );
}
