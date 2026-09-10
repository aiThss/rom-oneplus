'use client';
// React Compiler is not enabled; effects synchronize remote data and browser preferences.
/* eslint-disable react/react-compiler */
// Full page links initialize URL state; logo/QR URLs are served directly without an image proxy.
/* eslint-disable nextjs/no-html-link-for-pages, nextjs/no-img-element */
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
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
  Loader2,
  RotateCw,
  Terminal,
  Sparkles,
} from 'lucide-react';
import { Shell } from './shell';
import { RootGuideView } from './root-guide';
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
  brandOf,
  displayName,
  formatBytes,
  type Settings,
  type Cached,
  type Catalog,
  type Entry,
  type ZipBrowser,
  type ZipEntry,
  type SiteLog,
  type DevicePreview,
} from '@/lib/model';
import type { Traffic } from '@/lib/parsers';
import { deviceSpecFor } from '@/lib/device-specs';
import { regionLabel, useLanguage } from '@/lib/language';

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
  if (typeof window === 'undefined')
    return { view: 'archive', path: '', brand: '' };
  const p = new URLSearchParams(location.search);
  return {
    view: p.get('view') || 'archive',
    path: p.get('path') || '',
    brand: p.get('brand') || '',
  };
}
function browse(view: string, path = '', brand = '') {
  const params = new URLSearchParams({ view });
  if (path) params.set('path', path);
  if (brand) params.set('brand', brand);
  return `/?${params.toString()}`;
}
function isArb(text?: string | null): boolean {
  if (!text) return false;
  return /\barb\b|anti-rollback/i.test(text);
}

function localizedEntryDescription(
  description: string | undefined,
  en: boolean,
) {
  if (!description || !en) return description;
  return description
    .replace(
      /^Mã máy\s+(.+?)\s*·\s*mở danh sách ROM HyperOS$/i,
      'Device code $1 · open HyperOS ROM list',
    )
    .replace(/^Mã máy:\s*/i, 'Device code: ')
    .replace(/mở danh sách ROM HyperOS/gi, 'open HyperOS ROM list');
}
export function Library() {
  const [loc, setLoc] = useState({ view: 'archive', path: '', brand: '' });
  const { language } = useLanguage();
  const en = language === 'en';
  const {
    data: settings,
    error: configError,
    loading: configLoading,
  } = useRemote<Settings>('/api/settings');
  const config = settings || defaultSettings;
  useEffect(() => {
    setLoc(locationState());
  }, []);
  useEffect(() => {
    document.title = en
      ? config.name + ' — ROM, firmware & recovery'
      : config.name + ' — ROM, firmware & recovery';
  }, [config.name, en]);
  if (configLoading && !settings && !configError) return <Loading />;
  const activeView = loc.view === 'xiaomi' ? 'archive' : loc.view;
  const visible =
    config.sections.find((s) => s.id === activeView)?.enabled !== false;
  return (
    <Shell
      active={activeView}
      {...config}
      donate={config.donate?.enabled ?? true}
      groups={config.groups}
    >
      <>
        {configError && <ErrorState error={configError} />}{' '}
        {!visible ? (
          <EmptyState
            title={en ? 'Category hidden' : 'Danh mục đang ẩn'}
            description={
              en
                ? 'The administrator has disabled this category.'
                : 'Quản trị viên đã tắt mục này.'
            }
          />
        ) : activeView === 'ota' ? (
          <OtaView />
        ) : activeView === 'root-guide' ? (
          <RootGuideView />
        ) : activeView === 'recovery' ? (
          <RecoveryView />
        ) : activeView === 'stats' ? (
          <StatsView />
        ) : activeView === 'changelog' ? (
          <ChangelogView />
        ) : activeView === 'donate' ? (
          <DonateView config={config} />
        ) : (
          <ArchiveView
            view={activeView === 'mirrors' ? 'mirrors' : 'archive'}
            path={loc.path}
            brand={
              activeView === 'archive'
                ? loc.brand ||
                  (loc.view === 'xiaomi' && loc.path ? 'xiaomi' : '')
                : ''
            }
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
  const { language } = useLanguage();
  const en = language === 'en';
  return (
    <div className={`freshness ${value.stale ? 'stale' : ''}`}>
      <span>
        <Clock size={13} />
        {value.stale
          ? en
            ? 'Cached data'
            : 'Dữ liệu đã lưu'
          : en
            ? 'Synced'
            : 'Đồng bộ'}{' '}
        · {timeLabel(value.updatedAt)}
      </span>
      <a href={value.sourceUrl} target="_blank" rel="noreferrer">
        {en ? 'Open source' : 'Mở nguồn'} <ArrowUpRight size={13} />
      </a>
      {value.error && (
        <p>
          {value.error}{' '}
          {en
            ? 'Showing the latest available copy.'
            : 'Đang hiển thị bản gần nhất.'}
        </p>
      )}
    </div>
  );
}
function DevicePreviewCompact({
  device,
  preview,
}: {
  device: string;
  preview?: DevicePreview;
}) {
  const { language } = useLanguage();
  const en = language === 'en';
  const spec = deviceSpecFor(device);
  const value =
    preview ||
    (spec && {
      name: spec.name,
      sourceUrl: spec.sourceUrl,
      imageUrl: spec.imageUrl,
      imageAlt: spec.imageAlt,
      summary: [spec.display, spec.chipset, spec.battery],
    });
  if (!value) return null;
  return (
    <a
      className="device-preview-compact"
      href={value.sourceUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={`${en ? 'View specs for' : 'Xem cấu hình'} ${value.name} ${en ? 'on' : 'trên'} ${
        spec ? 'GSMArena' : 'HyperOS.fans'
      }`}
    >
      <div className="device-preview-compact-media">
        <img src={value.imageUrl} alt={value.imageAlt} />
      </div>
      <div className="device-preview-compact-copy">
        <span className="device-preview-compact-label">
          {en ? 'QUICK SPECS' : 'CẤU HÌNH TÓM TẮT'}
        </span>
        <strong>{value.name}</strong>
        <span className="device-preview-compact-specs">
          {value.summary.slice(0, 2).join(' · ')}
        </span>
      </div>
      <ArrowUpRight size={15} aria-hidden="true" />
    </a>
  );
}
const BRAND_CHOICES = [
  {
    id: 'oneplus',
    name: 'OnePlus',
    description: 'ROM tùy biến, firmware, recovery và công cụ cứu máy.',
    descriptionEn: 'Custom ROMs, firmware, recovery, and rescue tools.',
    source: 'Kho ROM Việt',
  },
  {
    id: 'xiaomi',
    name: 'Xiaomi',
    description: 'Thiết bị Xiaomi và các nhánh HyperOS theo khu vực.',
    descriptionEn: 'Xiaomi devices and regional HyperOS branches.',
    source: 'HyperOS.fans',
  },
  {
    id: 'redmi',
    name: 'Redmi',
    description: 'Danh sách Redmi, phiên bản hệ điều hành và gói ROM.',
    descriptionEn: 'Redmi devices, OS versions, and ROM packages.',
    source: 'HyperOS.fans',
  },
  {
    id: 'poco',
    name: 'POCO',
    description: 'Danh sách POCO và các gói Recovery/Fastboot tương ứng.',
    descriptionEn: 'POCO devices and matching Recovery/Fastboot packages.',
    source: 'HyperOS.fans',
  },
] as const;

function BrandChooser() {
  const { language } = useLanguage();
  const en = language === 'en';
  return (
    <section
      className="brand-chooser panel"
      aria-labelledby="brand-chooser-title"
    >
      <div className="brand-chooser-heading">
        <span className="eyebrow">
          {en ? 'DEVICE LIBRARY' : 'THƯ VIỆN THIẾT BỊ'}
        </span>
        <h2 id="brand-chooser-title">
          {en
            ? 'Which phone brand are you using?'
            : 'Bạn đang sử dụng hãng điện thoại gì?'}
        </h2>
        <p>
          {en
            ? 'Choose a brand to browse supported devices.'
            : 'Chọn hãng để mở nhóm thiết bị được hỗ trợ.'}
        </p>
      </div>
      <div className="brand-choice-grid">
        {BRAND_CHOICES.map((brand, i) => (
          <a
            className="brand-choice-card"
            href={browse('archive', '', brand.id)}
            key={brand.id}
          >
            <div className={`brand-choice-symbol tone-${i % 3}`}>
              <Smartphone size={23} />
            </div>
            <div className="brand-choice-info">
              <span className="meta">{brand.source}</span>
              <h3>{brand.name}</h3>
              <p>{en ? brand.descriptionEn : brand.description}</p>
            </div>
            <ArrowUpRight size={17} className="brand-choice-arrow" />
          </a>
        ))}
      </div>
    </section>
  );
}

function ArchiveView({
  view,
  path,
  brand = '',
}: {
  view: string;
  path: string;
  brand?: string;
}) {
  const { language } = useLanguage();
  const en = language === 'en';
  const brandChoice = BRAND_CHOICES.find((item) => item.id === brand);
  const source =
    view === 'mirrors'
      ? 'sourceforge'
      : brandChoice && brandChoice.id !== 'oneplus'
        ? 'xiaomi'
        : 'archive';
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
  }, [path, view, brand]);
  const data = result.data?.data;
  const deviceRoot = path.split('/')[0];
  const sourceNotes = (data?.notes ?? []).map(translateTechnicalNote);
  const technicalNotes =
    path &&
    (deviceSpecFor(deviceRoot) || data?.preview) &&
    !sourceNotes.includes(CHINA_DEVICE_NOTE)
      ? [CHINA_DEVICE_NOTE, ...sourceNotes]
      : sourceNotes;
  const entries = useMemo(() => {
    let list = (data?.entries || []).filter(
      (e) =>
        displayName(e.name).toLowerCase().includes(query.toLowerCase()) &&
        (kind === 'all' || e.kind === kind),
    );
    if (!path && brandChoice && source === 'xiaomi') {
      list = list.filter((entry) => brandOf(entry.name) === brandChoice.name);
    }
    if (sort === 'name')
      list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    return list;
  }, [data, query, kind, sort, path, brandChoice, source]);
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
            title: en
              ? 'Filter the current ROM catalog'
              : 'Lọc danh mục ROM đang xem',
            description: en
              ? 'Update the search field and return matching entries in the open catalog. Does not download files.'
              : 'Đổi ô tìm kiếm và trả về các mục phù hợp trong danh mục đang mở. Không tải file.',
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
                throw new Error(
                  en ? 'Invalid search keyword.' : 'Từ khóa không hợp lệ.',
                );
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
  }, [data, path, kind, en]);
  const chooser = view === 'archive' && !path && !brandChoice;
  const title = path
    ? data?.title || displayName(path.split('/').at(-1)!)
    : view === 'mirrors'
      ? en
        ? 'SourceForge Archive'
        : 'Kho lưu trữ SourceForge'
      : brandChoice
        ? en
          ? `${brandChoice.name} devices`
          : `Thiết bị ${brandChoice.name}`
        : en
          ? 'Choose your device'
          : 'Chọn thiết bị của bạn';
  const description = path
    ? (source === 'xiaomi'
        ? data?.preview?.name || displayName(path.split('/')[0])
        : displayName(path.split('/')[0])) +
      (en
        ? ' · Choose a folder or software package to download.'
        : ' · Chọn thư mục hoặc bản phần mềm cần tải.')
    : view === 'mirrors'
      ? en
        ? 'Archives and additional download packages from SourceForge.'
        : 'Các bản lưu trữ và gói tải bổ sung từ SourceForge.'
      : brandChoice
        ? en
          ? `${brandChoice.name} · Choose a supported device to view download packages.`
          : `${brandChoice.name} · Chọn thiết bị được hỗ trợ để xem các gói tải.`
        : en
          ? 'Choose a phone brand to browse supported devices.'
          : 'Chọn hãng điện thoại để mở nhóm thiết bị hỗ trợ.';
  return (
    <>
      <Heading
        eyebrow={
          view === 'mirrors'
            ? 'SourceForge Mirrors'
            : brandChoice
              ? brandChoice.name.toUpperCase()
              : en
                ? 'Software Library'
                : 'Thư viện phần mềm'
        }
        title={title}
        description={description}
        extra={
          <div className="heading-actions">
            {path && (data?.preview || deviceSpecFor(deviceRoot)) ? (
              <DevicePreviewCompact
                device={deviceRoot}
                preview={data?.preview}
              />
            ) : (
              <span className="subtle-pill">
                <HardDrive size={15} />
                {view === 'mirrors'
                  ? 'SourceForge'
                  : brandChoice && brandChoice.id !== 'oneplus'
                    ? 'HyperOS.fans'
                    : 'ROM Archive'}
              </span>
            )}
          </div>
        }
      />
      {brandChoice && !path && view === 'archive' && (
        <nav
          className="breadcrumbs brand-back"
          aria-label={en ? 'Back to brand selection' : 'Quay lại chọn hãng'}
        >
          <a href={browse('archive')}>
            <ArrowLeft size={14} aria-hidden="true" />
            {en ? 'Choose phone brand' : 'Chọn hãng điện thoại'}
          </a>
        </nav>
      )}
      {path && (
        <nav
          className="breadcrumbs"
          aria-label={en ? 'Breadcrumbs' : 'Đường dẫn'}
        >
          <a href={browse(view, '', brand)}>
            {view === 'mirrors'
              ? 'SourceForge'
              : en
                ? 'Choose phone brand'
                : 'Chọn hãng điện thoại'}
          </a>
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
                  brand,
                )}
              >
                {source === 'xiaomi' && i === 0
                  ? data?.preview?.name || displayName(part)
                  : source === 'xiaomi' && i === 1
                    ? data?.title || displayName(part)
                    : displayName(part)}
              </a>
            </span>
          ))}
        </nav>
      )}
      {technicalNotes.length ? (
        <details className="technical-note">
          <summary>
            {technicalNotes.some(isArb) ? (
              <TriangleAlert size={17} className="arb-icon" />
            ) : (
              <ShieldCheck size={17} />
            )}
            <span>
              {en
                ? 'Important technical notes'
                : 'Lưu ý kỹ thuật quan trọng phải đọc'}
            </span>
            <ChevronDown
              size={17}
              className="technical-note-chevron"
              aria-hidden="true"
            />
          </summary>
          <ul>
            {technicalNotes.map((n, i) => (
              <li
                key={i}
                className={`${isArb(n) ? 'arb-text' : ''}${
                  n === CHINA_DEVICE_NOTE ? ' china-device-note' : ''
                }`}
              >
                {isArb(n) ? (
                  <span className="arb-tag">
                    <TriangleAlert size={12} />
                    <strong>
                      {n} (
                      {en
                        ? 'Anti-Rollback warning'
                        : 'Cảnh báo chống hạ cấp ARB'}
                      )
                    </strong>
                  </span>
                ) : (
                  n
                )}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {chooser ? (
        <BrandChooser />
      ) : (
        <>
          <div className="toolbar">
            <div className="search-box">
              <Search size={19} />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  path
                    ? en
                      ? 'Search this folder…'
                      : 'Tìm tên trong thư mục này…'
                    : en
                      ? 'Search devices…'
                      : 'Tìm thiết bị…'
                }
                aria-label={en ? 'Search catalog' : 'Tìm trong danh mục'}
              />
            </div>
            <SelectField
              label={en ? 'Show' : 'Hiển thị'}
              value={kind}
              onChange={setKind}
              options={[
                { value: 'all', label: en ? 'All' : 'Tất cả' },
                { value: 'folder', label: en ? 'Folders' : 'Thư mục' },
                { value: 'file', label: en ? 'Packages' : 'Gói phần mềm' },
                { value: 'link', label: en ? 'Documents' : 'Tài liệu' },
              ]}
            />
            <SelectField
              label={en ? 'Sort' : 'Sắp xếp'}
              value={sort}
              onChange={setSort}
              options={[
                { value: 'source', label: en ? 'By source' : 'Theo nguồn' },
                { value: 'name', label: en ? 'Name A–Z' : 'Tên A–Z' },
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
                    : source === 'xiaomi'
                      ? 'https://hyperos.fans/en/devices/'
                      : 'https://sourceforge.net/projects/oneplus13flashers/files/'
                }
              >
                {en ? 'Open source archive' : 'Mở kho nguồn'}
              </External>
            </>
          ) : (
            <>
              {folders.length > 0 && (
                <>
                  <div className="section-title">
                    <h2>
                      {path
                        ? en
                          ? 'Folder'
                          : 'Thư mục'
                        : en
                          ? 'Devices & tools'
                          : 'Thiết bị & công cụ'}
                    </h2>
                    <span>
                      {folders.length} {en ? 'items' : 'mục'}
                    </span>
                  </div>
                  <div className="device-grid">
                    {folders.map((entry, i) => {
                      const xiaomiDevice =
                        source === 'xiaomi' && !path && Boolean(brandChoice);
                      const Icon = path
                        ? Folder
                        : /pad/i.test(entry.name)
                          ? Tablet
                          : xiaomiDevice
                            ? Smartphone
                            : /oneplus|oppo|realme|xiaomi|redmi|poco/i.test(
                                  entry.name,
                                )
                              ? Smartphone
                              : HardDrive;
                      return (
                        <a
                          className="device-card"
                          href={browse(view, entry.path, brand)}
                          key={entry.id}
                        >
                          <div className={`device-symbol tone-${i % 3}`}>
                            <Icon size={22} />
                          </div>
                          <div className="device-info">
                            <span className="meta">
                              {path
                                ? en
                                  ? 'Folder'
                                  : 'Thư mục'
                                : /pad/i.test(entry.name)
                                  ? en
                                    ? 'Tablet'
                                    : 'Máy tính bảng'
                                  : xiaomiDevice
                                    ? en
                                      ? 'Phone / tablet'
                                      : 'Điện thoại / máy tính bảng'
                                    : /oneplus|oppo|realme|xiaomi|redmi|poco/i.test(
                                          entry.name,
                                        )
                                      ? en
                                        ? 'Phone'
                                        : 'Điện thoại'
                                      : en
                                        ? 'Tool'
                                        : 'Công cụ'}
                            </span>
                            <h3>{displayName(entry.name)}</h3>
                            <p>
                              {localizedEntryDescription(
                                entry.description,
                                en,
                              ) || (en ? 'Browse folder' : 'Xem thư mục')}
                            </p>
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
                    <h2>
                      {en ? 'Software & documents' : 'Bản phần mềm & tài liệu'}
                    </h2>
                    <span>
                      {files.length} {en ? 'items' : 'mục'}
                    </span>
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
                    query
                      ? en
                        ? 'No results found'
                        : 'Không tìm thấy kết quả'
                      : en
                        ? 'No software has been added'
                        : 'Phần mềm chưa được thêm vào'
                  }
                  description={
                    query
                      ? en
                        ? 'Try a device name, version, or shorter keyword.'
                        : 'Thử tên thiết bị, phiên bản hoặc từ khóa ngắn hơn.'
                      : en
                        ? 'No results match the current filters.'
                        : 'Chưa có kết quả phù hợp với các bộ lọc hiện tại.'
                  }
                />
              )}
              {!path && !query && data?.latest.length ? (
                <>
                  <div className="section-title">
                    <h2>
                      {en ? 'Latest updates...' : 'Những cập nhật mới...'}
                    </h2>
                    <span>{en ? 'Recently updated' : 'Cập nhật gần đây'}</span>
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
          <ZipBrowserSheet entry={zipEntry} onClose={() => setZipEntry(null)} />
        </>
      )}
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
  const { language } = useLanguage();
  const en = language === 'en';
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
          {displayName(
            entry.device || entry.parent || (en ? 'Device' : 'Thiết bị'),
          )}
          {entry.region ? ' · ' + regionLabel(entry.region, language) : ''}
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
              : entry.sizeLabel ||
                (en ? 'Size unavailable' : 'Dung lượng chưa có')}
            {entry.isLatest ? ` · ${en ? 'Latest' : 'Mới nhất'}` : ''}
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
          {entry.source === 'ota'
            ? en
              ? 'Get link & Download'
              : 'Lấy link & Tải'
            : en
              ? 'Details'
              : 'Chi tiết'}
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
  const { language } = useLanguage();
  const en = language === 'en';
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
      title={
        en
          ? 'Copy the /m command and open Telegram to create a Google Drive mirror'
          : 'Sao chép cú pháp /m và mở nhóm Telegram để tạo mirror Google Drive'
      }
    >
      {copied ? <Check size={15} /> : <Send size={15} />}
      {copied
        ? en
          ? 'Mirror command copied'
          : 'Đã chép lệnh mirror'
        : 'Mirror Google Drive'}
    </Button>
  );
}

function OtaDownloadBox({ entry }: { entry: Entry }) {
  const { language } = useLanguage();
  const en = language === 'en';
  const [resolvedUrl, setResolvedUrl] = useState<string>(
    entry.downloadUrl || '',
  );
  const [expiresAt, setExpiresAt] = useState<number>(entry.expiresAt || 0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [remaining, setRemaining] = useState<number>(0);
  const [showCli, setShowCli] = useState<boolean>(false);

  useEffect(() => {
    setResolvedUrl(entry.downloadUrl || '');
    setExpiresAt(entry.expiresAt || 0);
    setError('');
  }, [entry.id, entry.downloadUrl, entry.expiresAt]);

  useEffect(() => {
    if (!expiresAt || !resolvedUrl) {
      setRemaining(0);
      return;
    }
    const update = () => {
      const rem = expiresAt - Math.floor(Date.now() / 1000);
      setRemaining(rem > 0 ? rem : 0);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, resolvedUrl]);

  const triggerDownload = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
    }, 200);
  };

  const handleResolve = async (autoDownload: boolean) => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({
        id: entry.id,
        device: entry.device || '',
        region: entry.region || '',
        version: entry.version || entry.name || '',
      });
      const data = await api<{
        ok: boolean;
        url: string;
        expires_at?: number;
        manual?: boolean;
      }>(`/api/ota/resolve?${query.toString()}`);

      if (data.ok && data.url) {
        setResolvedUrl(data.url);
        setExpiresAt(data.expires_at || 0);
        if (autoDownload) {
          triggerDownload(data.url);
        }
      } else {
        throw new Error(
          en
            ? 'Could not retrieve OTA link.'
            : 'Không lấy được link OTA từ máy chủ nguồn.',
        );
      }
    } catch (err) {
      setError(
        (err as Error).message ||
          (en
            ? 'Failed to resolve OTA link.'
            : 'Không thể lấy link tải từ máy chủ nguồn.'),
      );
    } finally {
      setLoading(false);
    }
  };

  const isExpired = expiresAt > 0 && remaining <= 0 && resolvedUrl !== '';
  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="download-box ota-download-box">
      <h3>{en ? 'Direct OTA Download' : 'Tải trực tiếp bản OTA'}</h3>
      <p>
        {en
          ? 'Link is requested directly from the source server in the background without needing the external tool.'
          : 'Hệ thống tự động request lấy link tải trực tiếp từ máy chủ nguồn ngầm mà không cần mở công cụ OTA bên ngoài.'}
      </p>

      <div className="action-row">
        {resolvedUrl && !isExpired ? (
          <>
            <External href={resolvedUrl} primary>
              <Download size={15} />
              {en ? 'Download File' : 'Tải xuống File'}
            </External>
            <CopyButton
              value={resolvedUrl}
              label={en ? 'Copy link' : 'Sao chép link tải'}
            />
            <TelegramMirrorButton url={resolvedUrl} />
            <Button
              variant="outline"
              className="action secondary-action"
              onClick={() => handleResolve(false)}
              disabled={loading}
              title={en ? 'Refresh download link' : 'Làm mới link tải'}
            >
              <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
              {en ? 'Refresh link' : 'Làm mới link'}
            </Button>
          </>
        ) : (
          <>
            <Button
              className="action primary"
              onClick={() => handleResolve(true)}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  {en
                    ? 'Resolving link from source...'
                    : 'Đang lấy link từ nguồn ngầm...'}
                </>
              ) : (
                <>
                  <Download size={15} />
                  {isExpired
                    ? en
                      ? 'Renew & Download'
                      : 'Lấy lại link & Tải xuống'
                    : en
                      ? 'Auto Download (Direct)'
                      : 'Tự động lấy link & Tải xuống'}
                </>
              )}
            </Button>
            {!loading && (
              <Button
                variant="outline"
                className="action secondary-action"
                onClick={() => handleResolve(false)}
              >
                <Sparkles size={14} />
                {en ? 'Get direct link only' : 'Chỉ lấy link tải'}
              </Button>
            )}
            <External href={entry.sourceUrl}>
              {en ? 'Open source tool' : 'Mở công cụ nguồn'}
            </External>
          </>
        )}
      </div>

      {error && (
        <div
          className="field-error"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <TriangleAlert size={14} />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            style={{ padding: '0 8px', height: '24px' }}
            onClick={() => handleResolve(true)}
          >
            {en ? 'Retry' : 'Thử lại'}
          </Button>
        </div>
      )}

      {resolvedUrl && !isExpired && expiresAt > 0 && remaining > 0 && (
        <div className="ota-timer-info">
          <Clock size={13} />
          <span>
            {en
              ? `Link expires in ${formatTimer(remaining)} (Ongoing downloads continue normally)`
              : `Link tải có hiệu lực trong ${formatTimer(remaining)} (Tiến trình tải dở dang vẫn tiếp tục bình thường)`}
          </span>
        </div>
      )}

      {resolvedUrl && !isExpired && expiresAt === 0 && (
        <div className="ota-timer-info ota-timer-permanent">
          <Check size={13} />
          <span>
            {en
              ? 'Official permanent download link prepared'
              : 'Đã chuẩn bị link tải trực tiếp chính thức'}
          </span>
        </div>
      )}

      {isExpired && (
        <div className="ota-timer-info ota-timer-expired">
          <TriangleAlert size={13} />
          <span>
            {en
              ? 'Link has expired. Click Renew to prepare a fresh link.'
              : 'Link tải đã hết hạn. Nhấn Lấy lại link để tạo link mới.'}
          </span>
        </div>
      )}

      <div
        className="ota-meta-row"
        style={{
          marginTop: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <code className="ota-version">{entry.version}</code>
        <CopyButton
          value={entry.version || entry.name}
          label={en ? 'Copy version' : 'Sao chép phiên bản'}
        />
        {resolvedUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setShowCli((prev) => !prev)}
            style={{ height: '28px', padding: '0 8px' }}
          >
            <Terminal size={13} />
            {showCli
              ? en
                ? 'Hide cURL / aria2'
                : 'Ẩn lệnh cURL / aria2'
              : en
                ? 'cURL / aria2 command'
                : 'Lệnh cURL / aria2'}
          </Button>
        )}
      </div>

      {resolvedUrl && showCli && (
        <div
          className="ota-cli-box"
          style={{
            marginTop: 12,
            padding: '12px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--card)',
            fontSize: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <span style={{ fontWeight: 600 }}>aria2c:</span>
            <CopyButton
              value={`aria2c -x8 -s8 "${resolvedUrl}"`}
              label={en ? 'Copy aria2c' : 'Chép lệnh aria2c'}
            />
          </div>
          <code
            style={{
              display: 'block',
              wordBreak: 'break-all',
              marginBottom: 10,
              color: 'var(--foreground)',
              padding: '6px 8px',
              borderRadius: '6px',
              background: 'var(--background)',
            }}
          >
            {`aria2c -x8 -s8 "${resolvedUrl}"`}
          </code>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <span style={{ fontWeight: 600 }}>cURL:</span>
            <CopyButton
              value={`curl -LO "${resolvedUrl}"`}
              label={en ? 'Copy cURL' : 'Chép lệnh cURL'}
            />
          </div>
          <code
            style={{
              display: 'block',
              wordBreak: 'break-all',
              color: 'var(--foreground)',
              padding: '6px 8px',
              borderRadius: '6px',
              background: 'var(--background)',
            }}
          >
            {`curl -LO "${resolvedUrl}"`}
          </code>
        </div>
      )}

      {entry.mirrors?.map((m, i) => (
        <div className="mirror-row" key={i}>
          <External href={m.url}>{m.name}</External>
          <CopyButton value={m.url} label="Chép link" />
        </div>
      ))}
    </div>
  );
}

export function EntrySheet({
  entry,
  onClose,
}: {
  entry: Entry | null;
  onClose: () => void;
}) {
  const { language } = useLanguage();
  const en = language === 'en';
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
                  {value.region && '· ' + regionLabel(value.region, language)}
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
                    <TabsTrigger value="info">
                      {en ? 'Info & downloads' : 'Thông tin & tải'}
                    </TabsTrigger>
                    <TabsTrigger value="changelog">Changelog</TabsTrigger>
                  </TabsList>
                  <TabsContent value="info">
                    <div className="detail-grid">
                      <div>
                        <span>{en ? 'Size' : 'Dung lượng'}</span>
                        <strong>
                          {value.size
                            ? formatBytes(value.size)
                            : value.sizeLabel ||
                              (en ? 'No data' : 'Chưa có dữ liệu')}
                        </strong>
                      </div>
                      <div>
                        <span>{en ? 'Source' : 'Nguồn'}</span>
                        <strong>
                          {value.source === 'ota'
                            ? 'Danh mục OTA'
                            : value.source === 'sourceforge'
                              ? 'SourceForge'
                              : value.source === 'xiaomi'
                                ? 'HyperOS.fans'
                                : value.source === 'custom'
                                  ? en
                                    ? 'Additional link'
                                    : 'Liên kết bổ sung'
                                  : 'ROM Archive'}
                        </strong>
                      </div>
                      {value.published && (
                        <div>
                          <span>{en ? 'Release date' : 'Ngày phát hành'}</span>
                          <strong>
                            {new Date(value.published).toLocaleDateString(
                              'vi-VN',
                            )}
                          </strong>
                        </div>
                      )}
                    </div>
                    {value.description && (
                      <Markdown
                        content={value.description}
                        className="preserve-text"
                      />
                    )}
                    <div className="checksum">
                      <span className="field-label">
                        {value.checksumType || 'Checksum'}
                      </span>
                      {detail.loading ? (
                        <p>
                          {en
                            ? 'Checking checksum…'
                            : 'Đang kiểm tra checksum…'}
                        </p>
                      ) : value.checksum ? (
                        <>
                          <code>{value.checksum}</code>
                          <CopyButton
                            value={value.checksum}
                            label="Sao chép checksum"
                          />
                        </>
                      ) : (
                        <p>
                          {en
                            ? 'The source has not provided a verified checksum.'
                            : 'Nguồn chưa cung cấp checksum đã xác minh.'}
                        </p>
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
                                      {n} (
                                      {en
                                        ? 'Anti-Rollback warning'
                                        : 'Cảnh báo chống hạ cấp Anti-Rollback'}
                                      )
                                    </strong>
                                  ) : (
                                    n
                                  )}
                                </p>
                                {arb && (
                                  <p className="arb-warning-sub">
                                    {en
                                      ? 'Downgrading to a build with a lower ARB index can permanently hard-brick the device.'
                                      : 'Hạ cấp xuống bản có chỉ số ARB thấp hơn có thể làm máy mất nguồn / hard brick hoàn toàn!'}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                    {value.source === 'ota' ? (
                      <OtaDownloadBox entry={value} />
                    ) : (
                      <div className="download-box">
                        <h3>{en ? 'Download links' : 'Liên kết tải'}</h3>
                        <p>
                          {en
                            ? 'The file is provided by the source server.'
                            : 'File được cung cấp bởi máy chủ nguồn.'}
                        </p>
                        <div className="action-row">
                          {value.downloadUrl ? (
                            <>
                              <External href={value.downloadUrl} primary>
                                {en ? 'Download' : 'Tải xuống'}
                              </External>
                              <CopyButton
                                value={value.downloadUrl}
                                label="Sao chép link"
                              />
                            </>
                          ) : (
                            <External href={value.sourceUrl} primary>
                              {en ? 'Open release page' : 'Mở trang phát hành'}
                            </External>
                          )}
                          {(value.downloadUrl || value.sourceUrl) && (
                            <TelegramMirrorButton
                              url={value.downloadUrl || value.sourceUrl}
                            />
                          )}
                        </div>
                        {value.mirrors?.map((m, i) => (
                          <div className="mirror-row" key={i}>
                            <External href={m.url}>{m.name}</External>
                            <CopyButton value={m.url} label="Chép link" />
                          </div>
                        ))}
                      </div>
                    )}
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
                          <External href={value.toolsUrl}>
                            {en ? 'Open source' : 'Mở nguồn'}
                          </External>
                        </div>
                      )}
                    <div className="source-bottom">
                      <External href={value.sourceUrl}>
                        {en ? 'Source page' : 'Trang nguồn'}
                      </External>
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
                              {original
                                ? en
                                  ? 'View Vietnamese'
                                  : 'Xem tiếng Việt'
                                : en
                                  ? 'View original'
                                  : 'Xem bản gốc'}
                            </Button>
                          )}
                          {changes.data.sourceUrl && (
                            <External href={changes.data.sourceUrl}>
                              {en
                                ? 'Open original changelog'
                                : 'Mở changelog gốc'}
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
                              (en
                                ? 'This release has no changelog content. Open the original above when the source provides a link.'
                                : 'Bản phát hành này chưa có nội dung changelog. Khi nguồn có liên kết, bạn có thể mở bản gốc ở trên.')
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
      <ZipBrowserSheet entry={zipEntry} onClose={() => setZipEntry(null)} />
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
  const { language } = useLanguage();
  const en = language === 'en';
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
          aria-label={en ? 'Close ZIP browser' : 'Đóng Browse ZIP'}
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
              ? `${result.data.summary.files} ${en ? 'files' : 'file'} · ${result.data.summary.folders} ${en ? 'folders' : 'thư mục'} · ${result.data.summary.entries} ${en ? 'items' : 'mục'}`
              : en
                ? 'Browse the ZIP contents and download individual files.'
                : 'Duyệt nội dung ZIP và tải riêng từng file.'}
          </SheetDescription>
        </SheetHeader>
        <div className="zip-browser-body">
          {result.loading ? (
            <Loading />
          ) : result.error ? (
            <>
              <ErrorState
                error={
                  en
                    ? 'Could not read the ZIP tree from the source.'
                    : 'Chưa đọc được cây ZIP từ nguồn.'
                }
                retry={result.reload}
              />
              {entry?.toolsUrl && (
                <External href={entry.toolsUrl}>
                  {en ? 'Open source ZIP browser' : 'Mở Browser ZIP nguồn'}
                </External>
              )}
            </>
          ) : result.data ? (
            <ul
              className="zip-tree-list"
              aria-label={en ? 'ZIP contents' : 'Nội dung ZIP'}
            >
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
  const { language } = useLanguage();
  const en = language === 'en';
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
            <small>
              {item.children?.length || 0} {en ? 'items' : 'mục'}
            </small>
          </span>
          <ChevronDown
            size={16}
            className={open ? 'zip-tree-chevron open' : 'zip-tree-chevron'}
          />
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
    <li
      className={`zip-tree-item zip-tree-file ${item.important ? 'important' : ''}`}
    >
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
          {en ? 'Download file' : 'Tải file'}
        </a>
      ) : (
        <span className="zip-missing-link">
          {en ? 'No link available' : 'Không có link'}
        </span>
      )}
    </li>
  );
}
function OtaView() {
  const { language } = useLanguage();
  const en = language === 'en';
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
        eyebrow={en ? 'OFFICIAL FIRMWARE' : 'FIRMWARE CHÍNH THỨC'}
        title={en ? 'Find the right OTA build' : 'Tìm bản OTA phù hợp'}
        description={
          en
            ? 'Choose a device and region. Review details before downloading.'
            : 'Chọn thiết bị và khu vực. Xem thông tin trước khi tải.'
        }
        extra={
          <span className="subtle-pill">
            <LayersIcon />
            OTA Catalog
          </span>
        }
      />
      <div className="panel ota-filters">
        <SearchPicker
          label={en ? 'Device' : 'Thiết bị'}
          value={device}
          onChange={(v) => {
            setDevice(v);
            setRegion('all');
          }}
          options={devices}
        />
        <SelectField
          label={en ? 'Region' : 'Khu vực'}
          value={region}
          onChange={setRegion}
          options={[
            { value: 'all', label: en ? 'All regions' : 'Tất cả khu vực' },
            ...regions
              .filter(Boolean)
              .map((r) => ({ value: r, label: regionLabel(r, language) })),
          ]}
        />
        <label className="filter-label" htmlFor="ota-version">
          <span>{en ? 'Version' : 'Phiên bản'}</span>
          <Input
            aria-label={en ? 'Search version' : 'Tìm phiên bản'}
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
            <h2>
              {device
                ? displayName(device)
                : en
                  ? 'Firmware builds'
                  : 'Các bản firmware'}
            </h2>
            <span>
              {filtered.length} {en ? 'builds' : 'bản'}
            </span>
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
  const { language } = useLanguage();
  const en = language === 'en';
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
        <EmptyState
          title={en ? 'No matching versions' : 'Không có phiên bản phù hợp'}
        />
      )}
      {limit < entries.length && (
        <div className="load-more">
          <Button
            className="action"
            variant="outline"
            onClick={() => setLimit((v) => v + 30)}
          >
            {en ? 'Load more' : 'Xem thêm'} ({entries.length - limit}{' '}
            {en ? 'builds' : 'bản'})
          </Button>
        </div>
      )}
    </>
  );
}
function RecoveryView() {
  const { language } = useLanguage();
  const en = language === 'en';
  const result = useRemote<Entry[]>('/api/recovery');
  const [selected, setSelected] = useState<Entry | null>(null);
  return (
    <>
      <Heading
        eyebrow={en ? 'RECOVERY & RESTORATION' : 'RECOVERY & KHÔI PHỤC'}
        title="Recovery / OFOX"
        description={
          en
            ? 'Recovery releases organized by device.'
            : 'Trang phát hành và bản recovery theo thiết bị.'
        }
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
          <h3>{en ? 'Device rescue / EDL' : 'Cứu máy / EDL'}</h3>
          <p>
            {en
              ? 'Browse recovery packages in the source archive.'
              : 'Tra cứu các gói hỗ trợ khôi phục trong kho nguồn.'}
          </p>
        </div>
        <a className="action secondary-action" href={browse('archive', 'EDL')}>
          {en ? 'Open catalog' : 'Mở danh mục'}
          <ArrowUpRight size={16} />
        </a>
      </div>
      <EntrySheet entry={selected} onClose={() => setSelected(null)} />
    </>
  );
}
function StatsView() {
  const { language } = useLanguage();
  const en = language === 'en';
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
        eyebrow={en ? 'SERVER STATUS' : 'TRẠNG THÁI MÁY CHỦ'}
        title={en ? 'Download server monitor' : 'Theo dõi kho tải'}
        description={
          en
            ? 'Source server traffic, refreshed every 30 seconds while you watch.'
            : 'Lưu lượng của máy chủ nguồn, cập nhật mỗi 30 giây khi bạn đang xem.'
        }
        extra={
          <span className="subtle-pill">
            <Activity size={16} /> {en ? 'Source traffic' : 'Lưu lượng nguồn'}
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
                  {stale
                    ? en
                      ? 'Stale / unverified data'
                      : 'Dữ liệu cũ / chưa xác minh'
                    : en
                      ? 'Updating'
                      : 'Đang cập nhật'}
                </span>
              </div>
              <div className="stats-grid">
                <div className="panel stat-card prominent">
                  <span>
                    {en ? 'Current bandwidth' : 'Băng thông đang tải lên'}
                  </span>
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
                            en ? 'Today' : 'Hôm nay',
                            en ? 'Last 24 hours' : '24 giờ qua',
                            en ? 'This month' : 'Tháng này',
                            en ? 'This year' : 'Năm nay',
                            en ? 'Total' : 'Tổng cộng',
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
                  ? (en ? 'Source updated: ' : 'Nguồn cập nhật: ') +
                    timeLabel(d.updatedAt)
                  : en
                    ? 'The source has not provided a reliable update time.'
                    : 'Nguồn chưa cung cấp thời điểm cập nhật đáng tin cậy.'}
                {stale
                  ? en
                    ? ' · Do not treat these numbers as live status.'
                    : ' · Không dùng các số này như trạng thái trực tiếp.'
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
  const { language } = useLanguage();
  const en = language === 'en';
  const result = useRemote<SiteLog[]>('/api/logs');
  return (
    <>
      <Heading
        eyebrow={en ? 'UPDATE LOG' : 'NHẬT KÝ CẬP NHẬT'}
        title={en ? 'Website changelog' : 'Changelog của website'}
        description={
          en
            ? 'Website changes. ROM changelogs are included with each download.'
            : 'Các thay đổi của Kho ROM Việt. Changelog ROM nằm trong từng bản tải.'
        }
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
          title={en ? 'No updates published' : 'Chưa có cập nhật được đăng'}
          description={
            en
              ? 'Website updates will appear here after publication.'
              : 'Nhật ký của website sẽ xuất hiện ở đây sau khi quản trị viên xuất bản.'
          }
        />
      )}
    </>
  );
}
function DonateView({ config }: { config: Settings }) {
  const { language } = useLanguage();
  const en = language === 'en';
  const d = config.donate;
  return (
    <>
      <Heading
        eyebrow={en ? 'SUPPORT THE WEBSITE' : 'ĐỒNG HÀNH CÙNG WEBSITE'}
        title={en ? 'Support' : 'Ủng hộ'}
        description={
          en
            ? 'Information provided by the website administrator.'
            : 'Thông tin do quản trị viên website cung cấp.'
        }
      />
      <div className="panel donate-card">
        <Heart size={30} />
        <Markdown
          content={
            d?.text || en
              ? 'Your support helps maintain a fast download server and grow the OnePlus ROM archive for the community.'
              : 'Mọi sự ủng hộ của bạn là nguồn động lực lớn để duy trì máy chủ tải tốc độ cao và phát triển kho lưu trữ ROM OnePlus cho cộng đồng.'
          }
          className="preserve-text"
        />
        {d?.qr && (
          <img
            className="donate-qr"
            src={d.qr}
            alt={en ? 'Support QR code' : 'Mã QR ủng hộ'}
          />
        )}
        <dl className="bank-details">
          {[
            [d.bank, en ? 'Bank' : 'Ngân hàng'],
            [d.holder, en ? 'Account holder' : 'Chủ tài khoản'],
            [d.account, en ? 'Account number' : 'Số tài khoản'],
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
          <CopyButton
            value={d.account}
            label={en ? 'Copy account number' : 'Sao chép số tài khoản'}
          />
        )}
        {d.url && (
          <External href={d.url} primary>
            {en ? 'Open support link' : 'Mở liên kết ủng hộ'}
          </External>
        )}
      </div>
    </>
  );
}
