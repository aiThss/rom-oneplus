'use client';
// React Compiler is not enabled; effects synchronize remote data and browser preferences.
/* eslint-disable react/react-compiler */
// Full page links initialize URL state; logo/QR URLs are served directly without an image proxy.
/* eslint-disable nextjs/no-html-link-for-pages, nextjs/no-img-element */
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Smartphone,
  Tablet,
  Folder,
  Search,
  Download,
  ChevronRight,
  ChevronDown,
  HardDrive,
  ShieldCheck,
  Clock,
  Activity,
  X,
  FileText,
  Heart,
  Send,
  Check,
  TriangleAlert,
} from 'lucide-react';
import { Shell } from './shell';
import {
  api,
  useRemote,
  CopyButton,
  External,
  EmptyState,
  Loading,
  ErrorState,
  SelectField,
  SearchPicker,
  timeLabel,
  Markdown,
} from './common';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  defaultSettings,
  displayName,
  formatBytes,
  type Settings,
  type Cached,
  type Catalog,
  type Entry,
  type ZipBrowser,
  type ZipEntry,
  type SiteLog,
} from '@/lib/model';
import type { Traffic } from '@/lib/parsers';
import { deviceSpecFor } from '@/lib/device-specs';

const CHINA_DEVICE_NOTE = 'Mọi thiết bị đến từ China chỉ sử dụng SuperFLasher';

function translateTechnicalNote(note: string) {
  const translations: Record<string, string> = {
    'CN devices: use Super Flashers.': CHINA_DEVICE_NOTE,
    'Other regions: use Regional Flashers.':
      'Các khu vực khác: sử dụng Regional Flasher.',
    'Custom ROMs work on both variants.':
      'ROM tùy biến hoạt động trên cả hai biến thể.',
    'Hybrid builds can also be flashed with OrangeFox Recovery.':
      'Bản Hybrid cũng có thể được flash bằng OrangeFox Recovery.',
  };
  return translations[note.trim()] || note;
}

function locationState() {
  if (typeof window === 'undefined') return { view: 'archive', path: '' };
  const p = new URLSearchParams(location.search);
  return { view: p.get('view') || 'archive', path: p.get('path') || '' };
}
function browse(view: string, path = '') {
  return `/?view=${view}${path ? '&path=' + encodeURIComponent(path) : ''}`;
}
function isArb(text?: string | null): boolean {
  if (!text) return false;
  return /\barb\b|anti-rollback/i.test(text);
}
export function Library() {
  const [loc, setLoc] = useState({ view: 'archive', path: '' });
  const { data: settings, error: configError } =
    useRemote<Settings>('/api/settings');
  const config = settings || defaultSettings;
  useEffect(() => {
    setLoc(locationState());
  }, []);
  useEffect(() => {
    document.title = config.name + ' — ROM, firmware & recovery';
  }, [config.name]);
  const visible =
    config.sections.find((s) => s.id === loc.view)?.enabled !== false;
  return (
    <Shell
      active={loc.view}
      {...config}
      donate={config.donate?.enabled ?? true}
      groups={config.groups}
    >
      <>
        {configError && <ErrorState error={configError} />}{' '}
        {!visible ? (
          <EmptyState
            title="Danh mục đang ẩn"
            description="Quản trị viên đã tắt mục này."
          />
        ) : loc.view === 'ota' ? (
          <OtaView />
        ) : loc.view === 'recovery' ? (
          <RecoveryView />
        ) : loc.view === 'stats' ? (
          <StatsView />
        ) : loc.view === 'changelog' ? (
          <ChangelogView />
        ) : loc.view === 'donate' ? (
          <DonateView config={config} />
        ) : (
          <ArchiveView
            view={loc.view === 'mirrors' ? 'mirrors' : 'archive'}
            path={loc.path}
          />
        )}
      </>
    </Shell>
  );
}
function Heading({
  eyebrow,
  title,
  description,
  extra,
}: {
  eyebrow: string;
  title: string;
  description: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {extra}
    </div>
  );
}
function Freshness({ value }: { value: Cached<unknown> }) {
  return (
    <div className={`freshness ${value.stale ? 'stale' : ''}`}>
      <span>
        <Clock size={13} />
        {value.stale ? 'Dữ liệu đã lưu' : 'Đồng bộ'} ·{' '}
        {timeLabel(value.updatedAt)}
      </span>
      <a href={value.sourceUrl} target="_blank" rel="noreferrer">
        Mở nguồn <ArrowUpRight size={13} />
      </a>
      {value.error && <p>{value.error} Đang hiển thị bản gần nhất.</p>}
    </div>
  );
}
function DevicePreviewCompact({ device }: { device: string }) {
  const spec = deviceSpecFor(device);
  if (!spec) return null;
  return (
    <a
      className="device-preview-compact"
      href={spec.sourceUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={`Xem cấu hình ${spec.name} trên GSMArena`}
    >
      <div className="device-preview-compact-media">
        <img src={spec.imageUrl} alt={spec.imageAlt} />
      </div>
      <div className="device-preview-compact-copy">
        <span className="device-preview-compact-label">CẤU HÌNH TÓM TẮT</span>
        <strong>{spec.name}</strong>
        <span className="device-preview-compact-specs">
          {spec.display.split(' · ').slice(0, 2).join(' · ')}
          {' · '}
          {spec.battery.split(' · ')[0]}
        </span>
      </div>
      <ArrowUpRight size={15} aria-hidden="true" />
    </a>
  );
}
function ArchiveView({ view, path }: { view: string; path: string }) {
  const source = view === 'mirrors' ? 'sourceforge' : 'archive';
  const result = useRemote<Cached<Catalog>>(
    `/api/catalog?source=${source}&path=${encodeURIComponent(path)}`,
  );
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Entry | null>(null);
  const [zipEntry, setZipEntry] = useState<Entry | null>(null);
  const [kind, setKind] = useState('all');
  const [sort, setSort] = useState('source');
  useEffect(() => {
    setQuery('');
    setKind('all');
  }, [path, view]);
  const data = result.data?.data;
  const deviceRoot = path.split('/')[0];
  const sourceNotes = (data?.notes ?? []).map(translateTechnicalNote);
  const technicalNotes =
    path && deviceSpecFor(deviceRoot) && !sourceNotes.includes(CHINA_DEVICE_NOTE)
      ? [CHINA_DEVICE_NOTE, ...sourceNotes]
      : sourceNotes;
  const entries = useMemo(() => {
    let list = (data?.entries || []).filter(
      (e) =>
        displayName(e.name).toLowerCase().includes(query.toLowerCase()) &&
        (kind === 'all' || e.kind === kind),
    );
    if (sort === 'name')
      list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    return list;
  }, [data, query, kind, sort]);
  const folders = entries.filter((e) => e.kind === 'folder');
  const files = entries.filter((e) => e.kind !== 'folder');
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (tool: unknown, options: unknown) => void;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const ctrl = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: 'filter_rom_catalog',
            title: 'Lọc danh mục ROM đang xem',
            description:
              'Đổi ô tìm kiếm và trả về các mục phù hợp trong danh mục đang mở. Không tải file.',
            inputSchema: {
              type: 'object',
              properties: { query: { type: 'string', maxLength: 200 } },
              required: ['query'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: true },
            execute: async (input: unknown) => {
              const q = (input as { query?: unknown })?.query;
              if (typeof q !== 'string' || q.length > 200)
                throw new Error('Từ khóa không hợp lệ.');
              setQuery(q);
              await new Promise(requestAnimationFrame);
              return {
                path,
                entries: (data?.entries || [])
                  .filter(
                    (e) =>
                      displayName(e.name)
                        .toLowerCase()
                        .includes(q.toLowerCase()) &&
                      (kind === 'all' || kind === e.kind),
                  )
                  .map(({ id, name, kind }) => ({ id, name, kind })),
              };
            },
          },
          { signal: ctrl.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => ctrl.abort();
  }, [data, path, kind]);
  const title = path
    ? displayName(path.split('/').at(-1)!)
    : view === 'mirrors'
      ? 'Kho lưu trữ SourceForge'
      : 'Chọn thiết bị của bạn';
  return (
    <>
      <Heading
        eyebrow={
          view === 'mirrors' ? 'SourceForge Mirrors' : 'Thư viện phần mềm'
        }
        title={title}
        description={
          path
            ? displayName(path.split('/')[0]) +
              ' · Chọn thư mục hoặc bản phần mềm cần tải.'
            : view === 'mirrors'
              ? 'Các bản lưu trữ và gói tải bổ sung từ SourceForge.'
              : 'Kho lưu trữ ROM tùy biến, firmware gốc, recovery và công cụ cứu máy.'
        }
        extra={
          <div className="heading-actions">
            {path && deviceSpecFor(path) ? (
              <DevicePreviewCompact device={path} />
            ) : (
              <span className="subtle-pill">
                <HardDrive size={15} />
                {view === 'mirrors' ? 'SourceForge' : 'ROM Archive'}
              </span>
            )}
          </div>
        }
      />
      {path && (
        <nav className="breadcrumbs" aria-label="Đường dẫn">
          <a href={browse(view)}>Thiết bị</a>
          {path.split('/').map((part, i) => (
            <span key={i}>
              <ChevronRight size={13} />
              <a
                href={browse(
                  view,
                  path
                    .split('/')
                    .slice(0, i + 1)
                    .join('/'),
                )}
              >
                {displayName(part)}
              </a>
            </span>
          ))}
        </nav>
      )}
      <div className="toolbar">
        <div className="search-box">
          <Search size={19} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={path ? 'Tìm tên trong thư mục này…' : 'Tìm thiết bị…'}
            aria-label="Tìm trong danh mục"
          />
        </div>
        <SelectField
          label="Hiển thị"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'all', label: 'Tất cả' },
            { value: 'folder', label: 'Thư mục' },
            { value: 'file', label: 'Gói phần mềm' },
            { value: 'link', label: 'Tài liệu' },
          ]}
        />
        <SelectField
          label="Sắp xếp"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'source', label: 'Theo nguồn' },
            { value: 'name', label: 'Tên A–Z' },
          ]}
        />
      </div>
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <>
          <ErrorState error={result.error} retry={result.reload} />
          <External
            href={
              source === 'archive'
                ? 'https://roms.danielspringer.at/'
                : 'https://sourceforge.net/projects/oneplus13flashers/files/'
            }
          >
            Mở kho nguồn
          </External>
        </>
      ) : (
        <>
          {folders.length > 0 && (
            <>
              <div className="section-title">
                <h2>{path ? 'Thư mục' : 'Thiết bị & công cụ'}</h2>
                <span>{folders.length} mục</span>
              </div>
              <div className="device-grid">
                {folders.map((entry, i) => {
                  const Icon = path
                    ? Folder
                    : /pad/i.test(entry.name)
                      ? Tablet
                      : /oneplus|oppo|realme/i.test(entry.name)
                        ? Smartphone
                        : HardDrive;
                  return (
                    <a
                      className="device-card"
                      href={browse(view, entry.path)}
                      key={entry.id}
                    >
                      <div className={`device-symbol tone-${i % 3}`}>
                        <Icon size={22} />
                      </div>
                      <div className="device-info">
                        <span className="meta">
                          {path
                            ? 'Thư mục'
                            : /pad/i.test(entry.name)
                              ? 'Máy tính bảng'
                              : /oneplus|oppo|realme/i.test(entry.name)
                                ? 'Điện thoại'
                                : 'Công cụ'}
                        </span>
                        <h3>{displayName(entry.name)}</h3>
                        <p>{entry.description || 'Xem thư mục'}</p>
                      </div>
                      <div className="device-arrow">
                        <ArrowUpRight size={17} />
                      </div>
                    </a>
                  );
                })}
              </div>
            </>
          )}
          {files.length > 0 && (
            <>
              <div className="section-title">
                <h2>Bản phần mềm & tài liệu</h2>
                <span>{files.length} mục</span>
              </div>
              <div className="file-list">
                {files.map((e) => (
                  <FileRow
                    key={e.id}
                    entry={e}
                    onSelect={setSelected}
                    onBrowseZip={setZipEntry}
                  />
                ))}
              </div>
            </>
          )}
          {!entries.length && (
            <EmptyState
              title={
                query ? 'Không tìm thấy kết quả' : 'Phần mềm chưa được thêm vào'
              }
              description={
                query
                  ? 'Thử tên thiết bị, phiên bản hoặc từ khóa ngắn hơn.'
                  : 'Chưa có kết quả phù hợp với các bộ lọc hiện tại.'
              }
            />
          )}
          {technicalNotes.length ? (
            <details className="technical-note">
              <summary>
                {technicalNotes.some(isArb) ? (
                  <TriangleAlert size={17} className="arb-icon" />
                ) : (
                  <ShieldCheck size={17} />
                )}
                <span>Lưu ý kỹ thuật quan trọng phải đọc</span>
                <ChevronDown
                  size={17}
                  className="technical-note-chevron"
                  aria-hidden="true"
                />
              </summary>
              <ul>
                {technicalNotes.map((n, i) => (
                  <li key={i} className={isArb(n) ? 'arb-text' : ''}>
                    {isArb(n) ? (
                      <span className="arb-tag">
                        <TriangleAlert size={12} />
                        <strong>{n} (Cảnh báo chống hạ cấp ARB)</strong>
                      </span>
                    ) : (
                      n
                    )}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          {!path && !query && data?.latest.length ? (
            <>
              <div className="section-title">
                <h2>Những cập nhật mới...</h2>
                <span>Cập nhật gần đây</span>
              </div>
              <div className="file-list">
                {data.latest.map((e) => (
                  <FileRow
                    key={e.id}
                    entry={e}
                    onSelect={setSelected}
                    onBrowseZip={setZipEntry}
                    compact
                  />
                ))}
              </div>
            </>
          ) : null}
          {result.data && <Freshness value={result.data} />}
        </>
      )}
      <EntrySheet entry={selected} onClose={() => setSelected(null)} />
      <ZipBrowserSheet
        entry={zipEntry}
        onClose={() => setZipEntry(null)}
      />
    </>
  );
}
export function FileRow({
  entry,
  onSelect,
  onBrowseZip,
  compact = false,
}: {
  entry: Entry;
  onSelect: (entry: Entry) => void;
  onBrowseZip?: (entry: Entry) => void;
  compact?: boolean;
}) {
  return (
    <article className="panel file-row">
      <div className="file-icon">
        {entry.kind === 'link' ? (
          <FileText size={18} />
        ) : (
          <Download size={18} />
        )}
      </div>
      <button className="file-title grow" onClick={() => onSelect(entry)}>
        <span className="meta">
          {displayName(entry.device || entry.parent || 'Thiết bị')}
          {entry.region ? ' · ' + entry.region : ''}
          {entry.notes?.filter(isArb).map((note, i) => (
            <span key={i} className="arb-tag">
              <TriangleAlert size={11} />
              <strong>{note}</strong>
            </span>
          ))}
        </span>
        <h3 className="file-name-mono">{entry.name}</h3>
        {!compact && (
          <p>
            {entry.size
              ? formatBytes(entry.size)
              : entry.sizeLabel || 'Dung lượng chưa có'}
            {entry.isLatest ? ' · Mới nhất' : ''}
          </p>
        )}
      </button>
      <div className="file-actions">
        {entry.toolsUrl &&
          entry.source === 'archive' &&
          entry.kind === 'file' &&
          onBrowseZip && (
          <Button
            variant="outline"
            className="action zip-action"
            onClick={(event) => {
              event.stopPropagation();
              onBrowseZip(entry);
            }}
          >
            <Folder size={15} />
            Browse ZIP
          </Button>
        )}
        <Button
          variant="outline"
          className="action"
          onClick={() => onSelect(entry)}
        >
          Chi tiết
          <ChevronRight size={14} />
        </Button>
      </div>
    </article>
  );
}
type Change = {
  original: string;
  vi: string;
  sourceUrl?: string;
  updatedAt: number;
  error?: string;
};
function TelegramMirrorButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleMirror = async () => {
    const text = `/m ${url}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // ignore
    }
    setCopied(true);
    window.open('https://t.me/jinmups_vn', '_blank', 'noopener,noreferrer');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Button
      variant="outline"
      className="action secondary-action"
      onClick={handleMirror}
      title="Sao chép cú pháp /m và mở nhóm Telegram để tạo mirror Google Drive"
    >
      {copied ? <Check size={15} /> : <Send size={15} />}
      {copied ? 'Đã chép lệnh mirror' : 'Mirror Google Drive'}
    </Button>
  );
}

export function EntrySheet({
  entry,
  onClose,
}: {
  entry: Entry | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState('info');
  useEffect(() => setTab('info'), [entry?.id]);
  const detail = useRemote<Entry>(
    entry ? '/api/entry?id=' + encodeURIComponent(entry.id) : null,
  );
  const changes = useRemote<Change>(
    entry && tab === 'changelog'
      ? '/api/changelog?id=' + encodeURIComponent(entry.id)
      : null,
  );
  const value = detail.data || entry;
  const [original, setOriginal] = useState(false);
  const [zipEntry, setZipEntry] = useState<Entry | null>(null);
  useEffect(() => setOriginal(false), [entry?.id]);
  useEffect(() => setZipEntry(null), [entry?.id]);
  return (
    <>
      <Sheet
        open={!!entry}
        onOpenChange={(o) => {
          if (!o) onClose();
        }}
      >
        <SheetContent className="entry-sheet" showCloseButton={false}>
        <SheetClose
          render={
            <Button variant="ghost" size="icon" className="sheet-close" />
          }
          aria-label="Đóng chi tiết"
        >
          <X size={20} />
        </SheetClose>
        {value && (
          <>
            <SheetHeader>
              <div className="sheet-icon">
                <Download size={26} />
              </div>
              <SheetTitle className="sheet-title">{value.name}</SheetTitle>
              <SheetDescription>
                {displayName(value.device || 'Phần mềm')}{' '}
                {value.region && '· ' + value.region}
                {value.notes?.filter(isArb).map((note, i) => (
                  <span key={i} className="arb-tag arb-tag-large">
                    <TriangleAlert size={12} />
                    <strong>{note}</strong>
                  </span>
                ))}
              </SheetDescription>
            </SheetHeader>
            <div className="sheet-body">
              <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
                <TabsList className="wide-tabs">
                  <TabsTrigger value="info">Thông tin & tải</TabsTrigger>
                  <TabsTrigger value="changelog">Changelog</TabsTrigger>
                </TabsList>
                <TabsContent value="info">
                  <div className="detail-grid">
                    <div>
                      <span>Dung lượng</span>
                      <strong>
                        {value.size
                          ? formatBytes(value.size)
                          : value.sizeLabel || 'Chưa có dữ liệu'}
                      </strong>
                    </div>
                    <div>
                      <span>Nguồn</span>
                      <strong>
                        {value.source === 'ota'
                          ? 'Danh mục OTA'
                          : value.source === 'sourceforge'
                            ? 'SourceForge'
                            : value.source === 'custom'
                              ? 'Liên kết bổ sung'
                              : 'ROM Archive'}
                      </strong>
                    </div>
                    {value.published && (
                      <div>
                        <span>Ngày phát hành</span>
                        <strong>
                          {new Date(value.published).toLocaleDateString(
                            'vi-VN',
                          )}
                        </strong>
                      </div>
                    )}
                  </div>
                  {value.description && (
                    <Markdown content={value.description} className="preserve-text" />
                  )}
                  <div className="checksum">
                    <span className="field-label">
                      {value.checksumType || 'Checksum'}
                    </span>
                    {detail.loading ? (
                      <p>Đang kiểm tra checksum…</p>
                    ) : value.checksum ? (
                      <>
                        <code>{value.checksum}</code>
                        <CopyButton
                          value={value.checksum}
                          label="Sao chép checksum"
                        />
                      </>
                    ) : (
                      <p>Nguồn chưa cung cấp checksum đã xác minh.</p>
                    )}
                  </div>
                  {detail.error && (
                    <p className="field-error">{detail.error}</p>
                  )}
                  {value.notes?.length ? (
                    <div className="notes-container">
                      {value.notes.map((n, i) => {
                        const arb = isArb(n);
                        return (
                          <div
                            key={i}
                            className={`notice ${arb ? 'arb-notice' : ''}`}
                          >
                            {arb ? (
                              <TriangleAlert size={20} className="arb-icon" />
                            ) : (
                              <ShieldCheck size={18} />
                            )}
                            <div>
                              <p className={arb ? 'arb-text' : ''}>
                                {arb ? (
                                  <strong>
                                    {n} (Cảnh báo chống hạ cấp Anti-Rollback)
                                  </strong>
                                ) : (
                                  n
                                )}
                              </p>
                              {arb && (
                                <p className="arb-warning-sub">
                                  Hạ cấp xuống bản có chỉ số ARB thấp hơn có thể làm máy mất nguồn / hard brick hoàn toàn!
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                  <div className="download-box">
                    <h3>
                      {value.source === 'ota'
                        ? 'Tải qua công cụ OTA'
                        : 'Liên kết tải'}
                    </h3>
                    <p>
                      {value.source === 'ota'
                        ? 'Mở công cụ nguồn, chọn đúng thiết bị, khu vực và phiên bản bên dưới.'
                        : 'File được cung cấp bởi máy chủ nguồn.'}
                    </p>
                    <div className="action-row">
                      {value.downloadUrl ? (
                        <>
                          <External href={value.downloadUrl} primary>
                            Tải xuống
                          </External>
                          <CopyButton
                            value={value.downloadUrl}
                            label="Sao chép link"
                          />
                        </>
                      ) : (
                        <External href={value.sourceUrl} primary>
                          {value.source === 'ota'
                            ? 'Mở công cụ OTA'
                            : 'Mở trang phát hành'}
                        </External>
                      )}
                      {(value.downloadUrl || value.sourceUrl) && (
                        <TelegramMirrorButton
                          url={value.downloadUrl || value.sourceUrl}
                        />
                      )}
                    </div>
                    {value.source === 'ota' && (
                      <>
                        <code className="ota-version">{value.version}</code>
                        <CopyButton
                          value={value.version || value.name}
                          label="Sao chép phiên bản"
                        />
                      </>
                    )}
                    {value.mirrors?.map((m, i) => (
                      <div className="mirror-row" key={i}>
                        <External href={m.url}>{m.name}</External>
                        <CopyButton value={m.url} label="Chép link" />
                      </div>
                    ))}
                  </div>
                  {value.toolsUrl &&
                    value.source === 'archive' &&
                    value.kind === 'file' && (
                    <div className="action-row zip-actions">
                      <Button
                        variant="outline"
                        className="action"
                        onClick={() => setZipEntry(value)}
                      >
                        <Folder size={15} />
                        Browse ZIP
                      </Button>
                      <External href={value.toolsUrl}>Mở nguồn</External>
                    </div>
                  )}
                  <div className="source-bottom">
                    <External href={value.sourceUrl}>Trang nguồn</External>
                  </div>
                </TabsContent>
                <TabsContent value="changelog">
                  {changes.loading ? (
                    <Loading />
                  ) : changes.error ? (
                    <ErrorState error={changes.error} />
                  ) : changes.data ? (
                    <>
                      <div className="action-row">
                        {changes.data.vi && (
                          <Button
                            variant="outline"
                            className="action"
                            onClick={() => setOriginal(!original)}
                          >
                            {original ? 'Xem tiếng Việt' : 'Xem bản gốc'}
                          </Button>
                        )}
                        {changes.data.sourceUrl && (
                          <External href={changes.data.sourceUrl}>
                            Mở changelog gốc
                          </External>
                        )}
                      </div>
                      {changes.data.error && (
                        <p className="field-error">{changes.data.error}</p>
                      )}
                      <div className="changelog-text">
                        <Markdown
                          content={
                            (!original && changes.data.vi) ||
                            changes.data.original ||
                            'Bản phát hành này chưa có nội dung changelog. Khi nguồn có liên kết, bạn có thể mở bản gốc ở trên.'
                          }
                        />
                      </div>
                    </>
                  ) : null}
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
        </SheetContent>
      </Sheet>
      <ZipBrowserSheet
        entry={zipEntry}
        onClose={() => setZipEntry(null)}
      />
    </>
  );
}

function ZipBrowserSheet({
  entry,
  onClose,
}: {
  entry: Entry | null;
  onClose: () => void;
}) {
  const result = useRemote<ZipBrowser>(
    entry ? '/api/zip?id=' + encodeURIComponent(entry.id) : null,
  );
  return (
    <Sheet
      open={!!entry}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="zip-sheet" showCloseButton={false}>
        <SheetClose
          render={
            <Button variant="ghost" size="icon" className="sheet-close" />
          }
          aria-label="Đóng Browse ZIP"
        >
          <X size={20} />
        </SheetClose>
        <SheetHeader>
          <div className="sheet-icon">
            <Folder size={26} />
          </div>
          <SheetTitle className="sheet-title">
            {result.data?.name || entry?.name || 'Browse ZIP'}
          </SheetTitle>
          <SheetDescription>
            {result.data
              ? `${result.data.summary.files} file · ${result.data.summary.folders} thư mục · ${result.data.summary.entries} mục`
              : 'Duyệt nội dung ZIP và tải riêng từng file.'}
          </SheetDescription>
        </SheetHeader>
        <div className="zip-browser-body">
          {result.loading ? (
            <Loading />
          ) : result.error ? (
            <>
              <ErrorState error="Chưa đọc được cây ZIP từ nguồn." retry={result.reload} />
              {entry?.toolsUrl && <External href={entry.toolsUrl}>Mở Browser ZIP nguồn</External>}
            </>
          ) : result.data ? (
            <ul className="zip-tree-list" aria-label="Nội dung ZIP">
              {result.data.entries.map((item) => (
                <ZipTreeItem key={item.path} item={item} />
              ))}
            </ul>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ZipTreeItem({ item }: { item: ZipEntry }) {
  const [open, setOpen] = useState(false);
  if (item.kind === 'folder') {
    return (
      <li className="zip-tree-item zip-tree-folder">
        <button
          type="button"
          className="zip-tree-toggle"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <Folder size={17} />
          <span className="zip-tree-name">
            <strong>{item.name}</strong>
            <small>{item.children?.length || 0} mục</small>
          </span>
          <ChevronDown size={16} className={open ? 'zip-tree-chevron open' : 'zip-tree-chevron'} />
        </button>
        {open && item.children?.length ? (
          <ul className="zip-tree-children">
            {item.children.map((child) => (
              <ZipTreeItem key={child.path} item={child} />
            ))}
          </ul>
        ) : null}
      </li>
    );
  }
  return (
    <li className={`zip-tree-item zip-tree-file ${item.important ? 'important' : ''}`}>
      <FileText size={17} />
      <span className="zip-tree-name">
        <strong>{item.name}</strong>
        <small>
          {item.important ? 'Important image' : 'Inner file'}
          {item.sizeLabel ? ` · ${item.sizeLabel}` : ''}
        </small>
      </span>
      {item.downloadUrl ? (
        <a
          className="action zip-download-action"
          href={item.downloadUrl}
          target="_blank"
          rel="noreferrer"
        >
          Tải file
        </a>
      ) : (
        <span className="zip-missing-link">Không có link</span>
      )}
    </li>
  );
}
function OtaView() {
  const result = useRemote<Cached<Entry[]>>('/api/ota');
  const [device, setDevice] = useState('');
  const [region, setRegion] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Entry | null>(null);
  const all = result.data?.data || [];
  const devices = [...new Set(all.map((e) => e.device || ''))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  const regions = [
    ...new Set(
      all
        .filter((e) => !device || e.device === device)
        .map((e) => e.region || ''),
    ),
  ];
  const filtered = all
    .filter(
      (e) =>
        (!device || e.device === device) &&
        (region === 'all' || e.region === region) &&
        e.name.toLowerCase().includes(query.toLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(b.isLatest) - Number(a.isLatest) ||
        (b.published || 0) - (a.published || 0),
    );
  return (
    <>
      <Heading
        eyebrow="FIRMWARE CHÍNH THỨC"
        title="Tìm bản OTA phù hợp"
        description="Chọn thiết bị và khu vực. Xem thông tin trước khi tải."
        extra={
          <span className="subtle-pill">
            <LayersIcon />
            OTA Catalog
          </span>
        }
      />
      <div className="panel ota-filters">
        <SearchPicker
          label="Thiết bị"
          value={device}
          onChange={(v) => {
            setDevice(v);
            setRegion('all');
          }}
          options={devices}
        />
        <SelectField
          label="Khu vực"
          value={region}
          onChange={setRegion}
          options={[
            { value: 'all', label: 'Tất cả khu vực' },
            ...regions.filter(Boolean).map((r) => ({ value: r, label: r })),
          ]}
        />
        <label className="filter-label" htmlFor="ota-version">
          <span>Phiên bản</span>
          <Input
            aria-label="Tìm phiên bản"
            id="ota-version"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="VD: 16.0.10…"
          />
        </label>
      </div>
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <ErrorState error={result.error} retry={result.reload} />
      ) : (
        <>
          <div className="section-title">
            <h2>{device ? displayName(device) : 'Các bản firmware'}</h2>
            <span>{filtered.length} bản</span>
          </div>
          <PaginatedEntries entries={filtered} onSelect={setSelected} />
          {result.data && <Freshness value={result.data} />}
        </>
      )}
      <EntrySheet entry={selected} onClose={() => setSelected(null)} />
    </>
  );
}
function LayersIcon() {
  return <HardDrive size={15} />;
}
function PaginatedEntries({
  entries,
  onSelect,
}: {
  entries: Entry[];
  onSelect: (e: Entry) => void;
}) {
  const [limit, setLimit] = useState(30);
  useEffect(() => setLimit(30), [entries.length]);
  return (
    <>
      {entries.length ? (
        <div className="file-list">
          {entries.slice(0, limit).map((e) => (
            <FileRow key={e.id} entry={e} onSelect={onSelect} />
          ))}
        </div>
      ) : (
        <EmptyState title="Không có phiên bản phù hợp" />
      )}
      {limit < entries.length && (
        <div className="load-more">
          <Button
            className="action"
            variant="outline"
            onClick={() => setLimit((v) => v + 30)}
          >
            Xem thêm ({entries.length - limit} bản)
          </Button>
        </div>
      )}
    </>
  );
}
function RecoveryView() {
  const result = useRemote<Entry[]>('/api/recovery');
  const [selected, setSelected] = useState<Entry | null>(null);
  return (
    <>
      <Heading
        eyebrow="RECOVERY & KHÔI PHỤC"
        title="Recovery / OFOX"
        description="Trang phát hành và bản recovery theo thiết bị."
      />
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <ErrorState error={result.error} />
      ) : result.data?.length ? (
        <div className="file-list">
          {result.data.map((e) => (
            <FileRow key={e.id} entry={e} onSelect={setSelected} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
      <div className="panel resource-card">
        <ShieldCheck size={24} />
        <div>
          <h3>Cứu máy / EDL</h3>
          <p>Tra cứu các gói hỗ trợ khôi phục trong kho nguồn.</p>
        </div>
        <a className="action secondary-action" href={browse('archive', 'EDL')}>
          Mở danh mục
          <ArrowUpRight size={16} />
        </a>
      </div>
      <EntrySheet entry={selected} onClose={() => setSelected(null)} />
    </>
  );
}
function StatsView() {
  const result = useRemote<Cached<Traffic>[]>('/api/stats');
  const [live, setLive] = useState<Cached<Traffic>[]>();
  useEffect(() => {
    if (result.data) setLive(result.data);
  }, [result.data]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible')
        api<Cached<Traffic>[]>('/api/stats')
          .then(setLive)
          .catch(() => {});
    }, 30000);
    return () => clearInterval(timer);
  }, []);
  return (
    <>
      <Heading
        eyebrow="TRẠNG THÁI MÁY CHỦ"
        title="Theo dõi kho tải"
        description="Lưu lượng của máy chủ nguồn, cập nhật mỗi 30 giây khi bạn đang xem."
        extra={
          <span className="subtle-pill">
            <Activity size={16} /> Lưu lượng nguồn
          </span>
        }
      />
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <ErrorState error={result.error} retry={result.reload} />
      ) : (
        live?.map((row, i) => {
          const d = row.data;
          const stale =
            row.stale ||
            d.stale ||
            !d.updatedAt ||
            Date.now() - d.updatedAt > 300000;
          return (
            <section className="traffic-section" key={i}>
              <div className="section-title">
                <h2>{d.name}</h2>
                <span className={`state-badge ${stale ? 'is-stale' : ''}`}>
                  <span className="status-dot" />
                  {stale ? 'Dữ liệu cũ / chưa xác minh' : 'Đang cập nhật'}
                </span>
              </div>
              <div className="stats-grid">
                <div className="panel stat-card prominent">
                  <span>Băng thông đang tải lên</span>
                  <strong>
                    {d.speed != null
                      ? d.speed.toLocaleString('vi-VN', {
                          maximumFractionDigits: 1,
                        })
                      : '—'}
                    <small> MB/s</small>
                  </strong>
                  <Activity size={28} />
                </div>
                {(['today', 'last24', 'month', 'year', 'total'] as const).map(
                  (k, j) => (
                    <div className="panel stat-card" key={k}>
                      <span>
                        {
                          [
                            'Hôm nay',
                            '24 giờ qua',
                            'Tháng này',
                            'Năm nay',
                            'Tổng cộng',
                          ][j]
                        }
                      </span>
                      <strong>{d[k] != null ? formatBytes(d[k]) : '—'}</strong>
                    </div>
                  ),
                )}
              </div>
              <p className="stats-note">
                {d.updatedAt
                  ? 'Nguồn cập nhật: ' + timeLabel(d.updatedAt)
                  : 'Nguồn chưa cung cấp thời điểm cập nhật đáng tin cậy.'}
                {stale
                  ? ' · Không dùng các số này như trạng thái trực tiếp.'
                  : ''}
              </p>
              {(d.error || row.error) && (
                <p className="field-error">{d.error || row.error}</p>
              )}
            </section>
          );
        })
      )}
    </>
  );
}
function ChangelogView() {
  const result = useRemote<SiteLog[]>('/api/logs');
  return (
    <>
      <Heading
        eyebrow="NHẬT KÝ CẬP NHẬT"
        title="Changelog của website"
        description="Các thay đổi của Kho ROM Việt. Changelog ROM nằm trong từng bản tải."
      />
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <ErrorState error={result.error} />
      ) : result.data?.length ? (
        <div className="timeline">
          {result.data.map((l) => (
            <article className="panel log-entry" key={l.id}>
              <time>
                {new Date(l.date + 'T00:00:00').toLocaleDateString('vi-VN')}
              </time>
              <h2>{l.title}</h2>
              <Markdown content={l.body} className="preserve-text" />
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Chưa có cập nhật được đăng"
          description="Nhật ký của website sẽ xuất hiện ở đây sau khi quản trị viên xuất bản."
        />
      )}
    </>
  );
}
function DonateView({ config }: { config: Settings }) {
  const d = config.donate;
  return (
    <>
      <Heading
        eyebrow="ĐỒNG HÀNH CÙNG WEBSITE"
        title="Ủng hộ"
        description="Thông tin do quản trị viên website cung cấp."
      />
      <div className="panel donate-card">
        <Heart size={30} />
        <Markdown
          content={
            d?.text ||
            'Mọi sự ủng hộ của bạn là nguồn động lực lớn để duy trì máy chủ tải tốc độ cao và phát triển kho lưu trữ ROM OnePlus cho cộng đồng.'
          }
          className="preserve-text"
        />
        {d?.qr && <img className="donate-qr" src={d.qr} alt="Mã QR ủng hộ" />}
        <dl className="bank-details">
          {[
            [d.bank, 'Ngân hàng'],
            [d.holder, 'Chủ tài khoản'],
            [d.account, 'Số tài khoản'],
          ].map(
            ([v, k]) =>
              v && (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ),
          )}
        </dl>
        {d.account && (
          <CopyButton value={d.account} label="Sao chép số tài khoản" />
        )}
        {d.url && (
          <External href={d.url} primary>
            Mở liên kết ủng hộ
          </External>
        )}
      </div>
    </>
  );
}
