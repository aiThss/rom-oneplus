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
  HardDrive,
  ShieldCheck,
  Clock,
  Activity,
  X,
  FileText,
  Heart,
  Send,
  Check,
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
  type SiteLog,
} from '@/lib/model';
import type { Traffic } from '@/lib/parsers';

function locationState() {
  if (typeof window === 'undefined') return { view: 'archive', path: '' };
  const p = new URLSearchParams(location.search);
  return { view: p.get('view') || 'archive', path: p.get('path') || '' };
}
function browse(view: string, path = '') {
  return `/?view=${view}${path ? '&path=' + encodeURIComponent(path) : ''}`;
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
      donate={config.donate.enabled}
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
function ArchiveView({ view, path }: { view: string; path: string }) {
  const source = view === 'mirrors' ? 'sourceforge' : 'archive';
  const result = useRemote<Cached<Catalog>>(
    `/api/catalog?source=${source}&path=${encodeURIComponent(path)}`,
  );
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Entry | null>(null);
  const [kind, setKind] = useState('all');
  const [sort, setSort] = useState('source');
  useEffect(() => {
    setQuery('');
    setKind('all');
  }, [path, view]);
  const data = result.data?.data;
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
          view === 'mirrors' ? 'SOURCEFORGE MIRRORS' : 'THƯ VIỆN PHẦN MỀM'
        }
        title={title}
        description={
          path
            ? displayName(path.split('/')[0]) +
              ' · Chọn thư mục hoặc bản phần mềm cần tải.'
            : view === 'mirrors'
              ? 'Các bản lưu trữ và gói tải bổ sung từ SourceForge.'
              : 'ROM, firmware và recovery. Tất cả ở một nơi.'
        }
        extra={
          <span className="subtle-pill">
            <HardDrive size={15} />
            {view === 'mirrors' ? 'SourceForge' : 'ROM Archive'}
          </span>
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
                        <Icon size={28} />
                      </div>
                      <div>
                        <span className="meta">
                          {path
                            ? 'THƯ MỤC'
                            : /pad/i.test(entry.name)
                              ? 'MÁY TÍNH BẢNG'
                              : /oneplus|oppo|realme/i.test(entry.name)
                                ? 'ĐIỆN THOẠI'
                                : 'CÔNG CỤ'}
                        </span>
                        <h3>{displayName(entry.name)}</h3>
                        <p>{entry.description || 'Xem thư mục'}</p>
                      </div>
                      <ArrowUpRight size={19} />
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
                  <FileRow key={e.id} entry={e} onSelect={setSelected} />
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
          {data?.notes.length ? (
            <details className="technical-note">
              <summary>
                <ShieldCheck size={17} />
                Lưu ý kỹ thuật quan trọng
              </summary>
              <ul>
                {data.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </details>
          ) : null}
          {!path && !query && data?.latest.length ? (
            <>
              <div className="section-title">
                <h2>Những cập nhật mới...</h2>
                <span>Bản cập nhật gần đây</span>
              </div>
              <div className="file-list">
                {data.latest.map((e) => (
                  <FileRow
                    key={e.id}
                    entry={e}
                    onSelect={setSelected}
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
    </>
  );
}
export function FileRow({
  entry,
  onSelect,
  compact = false,
}: {
  entry: Entry;
  onSelect: (entry: Entry) => void;
  compact?: boolean;
}) {
  return (
    <article className="panel file-row">
      <div className="file-icon">
        {entry.kind === 'link' ? (
          <FileText size={21} />
        ) : (
          <Download size={21} />
        )}
      </div>
      <button className="file-title grow" onClick={() => onSelect(entry)}>
        <span className="meta">
          {displayName(entry.device || entry.parent || 'PHẦN MỀM')}
          {entry.region ? ' · ' + entry.region : ''}
        </span>
        <h3>{entry.name}</h3>
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
        <Button
          variant="outline"
          className="action"
          onClick={() => onSelect(entry)}
        >
          Chi tiết
          <ChevronRight size={15} />
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
      } else {
        const input = document.createElement('textarea');
        input.value = text;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
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
  useEffect(() => setOriginal(false), [entry?.id]);
  return (
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
                    <p className="preserve-text">{value.description}</p>
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
                    <div className="notice">
                      <ShieldCheck size={18} />
                      <div>
                        {value.notes.map((n, i) => (
                          <p key={i}>{n}</p>
                        ))}
                      </div>
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
                  {value.toolsUrl && (
                    <External href={value.toolsUrl}>
                      Duyệt ZIP / công cụ nguồn
                    </External>
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
                        {(!original && changes.data.vi) ||
                          changes.data.original ||
                          'Bản phát hành này chưa có nội dung changelog. Khi nguồn có liên kết, bạn có thể mở bản gốc ở trên.'}
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
              <p className="preserve-text">{l.body}</p>
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
  if (!d.enabled) return <EmptyState title="Mục ủng hộ chưa được bật" />;
  return (
    <>
      <Heading
        eyebrow="ĐỒNG HÀNH CÙNG WEBSITE"
        title="Ủng hộ"
        description="Thông tin do quản trị viên website cung cấp."
      />
      <div className="panel donate-card">
        <Heart size={30} />
        <p className="preserve-text">{d.text}</p>
        {d.qr && <img className="donate-qr" src={d.qr} alt="Mã QR ủng hộ" />}
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
