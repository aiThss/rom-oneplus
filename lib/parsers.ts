import { parseHTML } from 'linkedom';
import {
  ARCHIVE,
  SF,
  type Catalog,
  type Entry,
  type ZipBrowser,
  type ZipEntry,
} from './model.ts';
export function plain(html: string) {
  const { document } = parseHTML(`<html><body>${html}</body></html>`);
  document
    .querySelectorAll('script,style,iframe,noscript')
    .forEach((e) => e.remove());
  return document.body.textContent?.replace(/\s+/g, ' ').trim() || '';
}
export function normalizedPath(value: string) {
  if (
    value.length > 800 ||
    // Control characters are deliberately rejected from upstream paths.
    // eslint-disable-next-line no-control-regex
    /[\\\u0000-\u001f]/.test(value) ||
    value.split('/').some((p) => p === '.' || p === '..') ||
    /%(?:2f|5c|2e|00)/i.test(value)
  )
    throw new Error('Đường dẫn không hợp lệ.');
  return value.replace(/^\/+|\/+$/g, '');
}
export function safeLink(value: string, base = ARCHIVE) {
  try {
    const u = new URL(value, base);
    return u.protocol === 'https:' && !u.username && !u.password
      ? u.href
      : undefined;
  } catch {
    return undefined;
  }
}
export function archiveUrl(path: string) {
  return `${ARCHIVE}/index.php${path ? '?dir=' + encodeURIComponent(normalizedPath(path)) : ''}`;
}
export function sfUrl(path: string) {
  return (
    SF +
    normalizedPath(path)
      .split('/')
      .filter(Boolean)
      .map(encodeURIComponent)
      .join('/') +
    (path ? '/' : '')
  );
}
const ZIP_BROWSER_HOST = 'roms.danielspringer.at';
const ZIP_BROWSER_PATH = '/index.php';
const MAX_ZIP_ENTRIES = 2000;

export function zipBrowserUrl(parent: string, name: string) {
  const dir = normalizedPath(parent);
  if (!name || name.includes('/') || name.includes('\\'))
    throw new Error('Tên ZIP không hợp lệ.');
  const url = new URL(ZIP_BROWSER_PATH, ARCHIVE);
  if (dir) url.searchParams.set('dir', dir);
  url.searchParams.set('zip', name);
  url.hash = 'zip-browser';
  return url.href;
}

export function safeZipDownload(value: string, base = ARCHIVE) {
  try {
    const u = new URL(value, base);
    if (
      u.protocol !== 'https:' ||
      u.hostname !== ZIP_BROWSER_HOST ||
      u.port ||
      u.username ||
      u.password ||
      u.pathname !== ZIP_BROWSER_PATH ||
      u.searchParams.get('action') !== 'download_from_zip'
    )
      return undefined;
    const zip = u.searchParams.get('zip') || '';
    const file = u.searchParams.get('file') || '';
    const keys = [...u.searchParams.keys()];
    if (
      !zip.toLowerCase().endsWith('.zip') ||
      !file ||
      keys.length !== 3 ||
      keys.some((key) => !['action', 'zip', 'file'].includes(key)) ||
      new Set(keys).size !== 3
    )
      return undefined;
    normalizedPath(zip);
    normalizedPath(file);
    return u.href;
  } catch {
    return undefined;
  }
}

function zipText(el: Element | null) {
  return el?.textContent?.replace(/\s+/g, ' ').trim() || '';
}

export function parseZipBrowser(
  html: string,
  id: string,
  sourceUrl: string,
): ZipBrowser {
  const { document } = parseHTML(html);
  const root = document.querySelector(
    '#zip-browser .zip-tree-root-list, .zip-browser .zip-tree-root-list',
  );
  if (!root) throw new Error('Nguồn chưa cung cấp cây ZIP hợp lệ.');
  let files = 0;
  let folders = 0;
  let entries = 0;

  function parseList(list: Element, parent = ''): ZipEntry[] {
    const result: ZipEntry[] = [];
    for (const child of Array.from(list.children)) {
      if (child.tagName?.toLowerCase() !== 'li') continue;
      const isFolder = child.classList.contains('zip-dir');
      const isFile = child.classList.contains('zip-file');
      if (!isFolder && !isFile) continue;
      entries++;
      if (entries > MAX_ZIP_ENTRIES)
        throw new Error('Cây ZIP có quá nhiều mục.');
      const name = zipText(child.querySelector('.zip-entry-copy > strong'));
      if (!name || name.length > 300) continue;
      const path = normalizedPath(parent ? `${parent}/${name}` : name);
      if (isFolder) {
        folders++;
        const nested = Array.from(child.children).find(
          (element) => element.tagName?.toLowerCase() === 'ul',
        );
        result.push({
          kind: 'folder',
          name,
          path,
          children: nested ? parseList(nested, path) : [],
        });
        continue;
      }
      files++;
      const download = child
        .querySelector('a.zip-download')
        ?.getAttribute('href');
      result.push({
        kind: 'file',
        name,
        path,
        sizeLabel: zipText(child.querySelector('.zip-size')) || undefined,
        important: !!child.querySelector('.zip-priority-badge'),
        downloadUrl: download ? safeZipDownload(download) : undefined,
      });
    }
    return result;
  }

  const tree = parseList(root);
  if (!tree.length) throw new Error('ZIP không có mục để hiển thị.');
  const title = zipText(document.querySelector('#zip-inline-title'));
  return {
    id,
    name:
      title ||
      id
        .replace(/^archive:/, '')
        .split('/')
        .at(-1) ||
      'ZIP',
    summary: { files, folders, entries },
    entries: tree,
    sourceUrl,
  };
}
const text = (e: Element | null) =>
  e?.textContent?.replace(/\s+/g, ' ').trim() || '';
function link(el: Element, selector: string) {
  const raw = el.querySelector(selector)?.getAttribute('href');
  return raw ? safeLink(raw) : undefined;
}
function baseEntry(path: string): Pick<Entry, 'path' | 'parent' | 'device'> {
  return {
    path,
    parent: path.split('/').slice(0, -1).join('/'),
    device: path.split('/')[0],
  };
}
export function parseArchive(html: string, path = ''): Catalog {
  const { document } = parseHTML(html);
  const entries: Entry[] = [];
  const latest: Entry[] = [];
  if (
    !document.querySelector('.folder-badge,.item-file-card,.item-wrapper') &&
    !document.querySelector('#browser')
  )
    throw new Error('Cấu trúc kho nguồn đã thay đổi.');
  document.querySelectorAll('a.folder-badge').forEach((el) => {
    const href = safeLink(el.getAttribute('href') || '');
    if (!href) return;
    const dir = new URL(href).searchParams.get('dir');
    if (!dir) return;
    const p = normalizedPath(dir);
    if (p.split('/').slice(0, -1).join('/') !== path) return;
    entries.push({
      id: 'archive:' + p,
      source: 'archive',
      kind: 'folder',
      name: text(el.querySelector('.item-name')) || p.split('/').at(-1)!,
      ...baseEntry(p),
      sourceUrl: href,
    });
  });
  document.querySelectorAll('.item-wrapper').forEach((wrapper) => {
    const a = wrapper.querySelector(
      'a.item-main-link,a[href*="action=view_txt"]',
    );
    if (!a) return;
    const href = safeLink(a.getAttribute('href') || '');
    if (!href) return;
    const raw = new URL(href).searchParams.get('file');
    if (!raw || !raw.startsWith('Files/')) return;
    const p = normalizedPath(raw.slice(6));
    if (p.split('/').slice(0, -1).join('/') !== path) return;
    const sizeMatch = text(wrapper.querySelector('.file-info')).match(
      /Size\s+([\d.,]+\s*[KMGT]?B)/i,
    );
    const isDownload = new URL(href).pathname === '/download.php';
    entries.push({
      id: 'archive:' + p,
      source: 'archive',
      kind: isDownload ? 'file' : 'link',
      name: text(wrapper.querySelector('.item-name')) || p.split('/').at(-1)!,
      ...baseEntry(p),
      sourceUrl: archiveUrl(path),
      ...(isDownload ? { downloadUrl: href } : { toolsUrl: href }),
      sizeLabel: sizeMatch?.[1],
      changelogUrl: link(wrapper, '.btn-changelog'),
      toolsUrl:
        link(wrapper, '.btn-zip-browse') || (!isDownload ? href : undefined),
      notes: Array.from(wrapper.querySelectorAll('a[href*="view=arb"]')).map(
        (e) => text(e),
      ),
    });
  });
  document.querySelectorAll('a.latest-upload-item').forEach((el) => {
    const href = safeLink(el.getAttribute('href') || '');
    const raw = href ? new URL(href).searchParams.get('file') : null;
    if (!raw?.startsWith('Files/')) return;
    const p = normalizedPath(raw.slice(6));
    latest.push({
      id: 'archive:' + p,
      source: 'archive',
      kind: 'file',
      name: p.split('/').at(-1)!,
      ...baseEntry(p),
      sourceUrl: archiveUrl(p.split('/').slice(0, -1).join('/')),
      downloadUrl: href,
    });
  });
  const notes: string[] = [];
  // Only scoped technical notices; never bring in popups, donation, navigation or legal copy.
  document.querySelectorAll('a[href*="xdaforums.com"]').forEach((a) => {
    if (/guide|OrangeFox/i.test(text(a))) {
      const box =
        a.closest('aside') ||
        a.closest('section') ||
        a.parentElement?.parentElement;
      if (box)
        box.querySelectorAll('li').forEach((li) => {
          const v = text(li);
          if (v && !notes.includes(v)) notes.push(v);
        });
    }
  });
  if (
    !entries.length &&
    !document.querySelector('.empty-folder,.folder-empty,.browser-empty') &&
    !/folder is empty|no files (?:found|available)/i.test(
      text(document.querySelector('#download-browser-grid')),
    )
  )
    throw new Error('Không xác minh được danh mục rỗng từ nguồn.');
  return {
    source: 'archive',
    path,
    entries,
    latest,
    notes,
    sourceUrl: archiveUrl(path),
  };
}
export function parseSourceForge(html: string, path = ''): Catalog {
  const match = html.match(/net\.sf\.files\s*=\s*(\{[^\n]*\});/);
  if (!match) throw new Error('Cấu trúc SourceForge đã thay đổi.');
  const data = JSON.parse(match[1]) as Record<string, Record<string, unknown>>;
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw new Error('Dữ liệu SourceForge không hợp lệ.');
  const entries: Entry[] = [];
  for (const v of Object.values(data)) {
    if (
      typeof v.name !== 'string' ||
      typeof v.full_path !== 'string' ||
      (v.type !== 'd' && v.type !== 'f')
    )
      continue;
    const p = normalizedPath(v.full_path);
    if (p.split('/').slice(0, -1).join('/') !== path) continue;
    const url =
      typeof v.url === 'string'
        ? safeLink(v.url, 'https://sourceforge.net')
        : undefined;
    if (!url?.startsWith(SF)) continue;
    const download =
      v.type === 'f' &&
      v.downloadable !== false &&
      typeof v.download_url === 'string'
        ? safeLink(v.download_url)
        : undefined;
    entries.push({
      id: 'sourceforge:' + p,
      source: 'sourceforge',
      kind: v.type === 'd' ? 'folder' : 'file',
      name: v.name,
      ...baseEntry(p),
      sourceUrl: url,
      downloadUrl: download?.startsWith(SF) ? download : undefined,
      size: typeof v.size === 'number' ? v.size : undefined,
      checksum:
        typeof v.md5 === 'string' && v.md5
          ? v.md5
          : typeof v.sha256 === 'string'
            ? v.sha256
            : undefined,
      checksumType: v.md5 ? 'MD5' : 'SHA-256',
    });
  }
  if (!entries.length)
    throw new Error('Chưa xác minh được danh mục SourceForge rỗng.');
  return {
    source: 'sourceforge',
    path,
    entries,
    latest: [],
    notes: [],
    sourceUrl: sfUrl(path),
  };
}
export function parseOta(value: unknown): Entry[] {
  if (
    !value ||
    typeof value !== 'object' ||
    !Array.isArray((value as { releases?: unknown }).releases)
  )
    throw new Error('Dữ liệu OTA không hợp lệ.');
  const rows = (value as { releases: Record<string, unknown>[] }).releases;
  if (!rows.length)
    throw new Error('Danh mục OTA nguồn trả về rỗng, cần xác minh.');
  return rows.map((v) => {
    if (
      typeof v.id !== 'string' ||
      typeof v.device !== 'string' ||
      typeof v.version !== 'string'
    )
      throw new Error('Cấu trúc OTA đã thay đổi.');
    return {
      id: 'ota:' + v.id,
      source: 'ota',
      kind: 'file',
      name: v.version,
      version: v.version,
      device: v.device,
      region: typeof v.region === 'string' ? v.region : '',
      path: v.id,
      parent: '',
      sourceUrl: ARCHIVE + '/index.php?view=ota',
      changelogUrl:
        typeof v.changelog_url === 'string'
          ? safeLink(v.changelog_url)
          : undefined,
      size: typeof v.size === 'number' ? v.size : undefined,
      checksum: typeof v.md5 === 'string' ? v.md5 : undefined,
      checksumType: 'MD5',
      published: typeof v.published === 'number' ? v.published : undefined,
      isLatest: v.is_latest === true,
    } satisfies Entry;
  });
}
export function parseChangelog(html: string) {
  const { document } = parseHTML(html);
  const target =
    document.querySelector(
      '#changelog-view .changelog-content,.changelog-body,.changelog-content,.changelog-text,.ota-changelog-content',
    ) || document.querySelector('#changelog-view');
  const external = !html.includes('Daniel Springer');
  const el =
    target ||
    (external ? document.querySelector('main') || document.body : null);
  if (!el) throw new Error('Chưa đọc được changelog. Bạn có thể mở bản gốc.');
  el.querySelectorAll(
    'script,style,nav,header,footer,button,iframe,noscript',
  ).forEach((e) => e.remove());
  el.querySelectorAll('br').forEach((e) => e.replaceWith('\n'));
  el.querySelectorAll('p,li,h1,h2,h3,h4,div,dt,dd').forEach((e) =>
    e.append('\n'),
  );
  return (el.textContent || '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim()
    .slice(0, 60000);
}
export function parseMd5(html: string) {
  const { document } = parseHTML(html);
  const result: Record<string, string> = {};
  document
    .querySelectorAll('tr,.md5-row,.md5-entry,.checksum-row,.checksum-card')
    .forEach((e) => {
      const s = text(e.querySelector('.checksum-code,code')) || text(e);
      const hash = s.match(/\b[a-f0-9]{32}\b/i)?.[0];
      const name =
        text(e.querySelector('.md5-name,.file-name,.checksum-name,h2')) ||
        text(e.querySelector('td'));
      if (hash && name) result[name] = hash;
    });
  return result;
}
export function matchMirror(a: Entry, b: Entry) {
  return (
    a.kind === 'file' &&
    b.kind === 'file' &&
    a.path === b.path &&
    !!a.checksum &&
    !!b.checksum &&
    a.checksumType === b.checksumType &&
    a.checksum.toLowerCase() === b.checksum.toLowerCase()
  );
}
export type Traffic = {
  name: string;
  sourceUrl: string;
  updatedAt: number | null;
  stale: boolean;
  speed?: number;
  today?: number;
  last24?: number;
  month?: number;
  year?: number;
  total?: number;
  error?: string;
};
export function parseTraffic(
  value: Record<string, unknown>,
  modified: string | null,
  name: string,
  sourceUrl: string,
  now = Date.now(),
): Traffic {
  const time = modified ? Date.parse(modified) : NaN;
  const get = (k: string) =>
    typeof value[k + '_bytes'] === 'number'
      ? (value[k + '_bytes'] as number)
      : typeof value[k + '_mbytes'] === 'number'
        ? (value[k + '_mbytes'] as number) * 1048576
        : undefined;
  return {
    name,
    sourceUrl,
    updatedAt: Number.isFinite(time) ? time : null,
    stale: !Number.isFinite(time) || now - time > 300000 || time > now + 60000,
    speed: typeof value.upload_mbs === 'number' ? value.upload_mbs : undefined,
    today: get('today'),
    last24: get('last24'),
    month: get('month'),
    year: get('year'),
    total: get('total'),
  };
}
