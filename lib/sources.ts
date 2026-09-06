import {
  ARCHIVE,
  type Cached,
  type Catalog,
  type Entry,
  type Source,
  visibleEntry,
  recoveryEntry,
} from './model';
import {
  parseArchive,
  parseSourceForge,
  parseOta,
  parseTraffic,
  parseChangelog,
  parseMd5,
  matchMirror,
  archiveUrl,
  sfUrl,
  normalizedPath,
  type Traffic,
} from './parsers';
import { db, settings, overrides, customs, applyOverrides } from './store';

type CacheRow = {
  key: string;
  body: string;
  source_url: string;
  updated_at: number;
  attempted_at: number;
  error: string | null;
};
const running = new Map<string, Promise<Cached<unknown>>>();
export function permittedMetadataUrl(raw: string) {
  const u = new URL(raw);
  if (u.protocol !== 'https:' || u.username || u.password || u.port)
    throw new Error('Nguồn dữ liệu không được hỗ trợ.');
  if (u.hostname === 'roms.danielspringer.at') {
    if (
      u.pathname === '/api/ota.php' ||
      u.pathname === '/api/outbound.json' ||
      u.pathname === '/api/outbound-server2.json'
    )
      return u;
    if (
      u.pathname === '/index.php' &&
      !u.searchParams.has('action') &&
      !u.searchParams.has('zip') &&
      (!u.searchParams.has('view') ||
        ['md5', 'changelog'].includes(u.searchParams.get('view')!))
    )
      return u;
  }
  if (
    u.hostname === 'sourceforge.net' &&
    u.pathname.startsWith('/projects/oneplus13flashers/files/') &&
    !u.pathname.endsWith('/download')
  )
    return u;
  const vendor = ['allawnofs.com', 'allawntech.com', 'miui.com'];
  if (
    vendor.some((d) => u.hostname === d || u.hostname.endsWith('.' + d)) &&
    /\.html?$/i.test(u.pathname)
  )
    return u;
  throw new Error('Nguồn dữ liệu không được hỗ trợ.');
}
export async function fetchMetadata(raw: string) {
  let url = permittedMetadataUrl(raw).href;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    for (let i = 0; i < 4; i++) {
      const res = await fetch(url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          Accept: 'application/json,text/html;q=0.9',
          'User-Agent': 'KhoROMViet/1.0 (metadata catalog; no file mirroring)',
        },
      });
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        url = permittedMetadataUrl(
          new URL(res.headers.get('location') || '', url).href,
        ).href;
        continue;
      }
      if (!res.ok) throw new Error(`Nguồn trả về HTTP ${res.status}.`);
      if (Number(res.headers.get('content-length')) > 8e6)
        throw new Error('Phản hồi nguồn quá lớn.');
      const reader = res.body?.getReader();
      if (!reader) throw new Error('Nguồn trả về nội dung rỗng.');
      let size = 0;
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 8e6) {
          await reader.cancel();
          throw new Error('Phản hồi nguồn quá lớn.');
        }
        chunks.push(value);
      }
      const all = new Uint8Array(size);
      let offset = 0;
      for (const c of chunks) {
        all.set(c, offset);
        offset += c.length;
      }
      return {
        text: new TextDecoder().decode(all),
        modified: res.headers.get('last-modified'),
      };
    }
    throw new Error('Nguồn chuyển hướng quá nhiều.');
  } finally {
    clearTimeout(timer);
  }
}
export async function cached<T>(
  key: string,
  url: string,
  ttl: number,
  load: () => Promise<T>,
  force = false,
): Promise<Cached<T>> {
  const old = await db()
    .prepare('SELECT * FROM source_cache WHERE key=?')
    .bind(key)
    .first<CacheRow>();
  const now = Date.now();
  if (old && !force && now - old.updated_at < ttl && !old.error)
    return {
      data: JSON.parse(old.body),
      updatedAt: old.updated_at,
      stale: false,
      sourceUrl: url,
    };
  if (old?.error && !force && now - old.attempted_at < 60000) {
    if (!old.updated_at) throw new Error(old.error);
    return {
      data: JSON.parse(old.body),
      updatedAt: old.updated_at,
      stale: true,
      error: old.error,
      sourceUrl: url,
    };
  }
  if (running.has(key)) return running.get(key)! as Promise<Cached<T>>;
  const job = (async () => {
    try {
      const data = await load();
      const time = Date.now();
      await db()
        .prepare(
          'INSERT INTO source_cache(key,body,source_url,updated_at,attempted_at,error) VALUES(?,?,?,?,?,NULL) ON CONFLICT(key) DO UPDATE SET body=excluded.body,source_url=excluded.source_url,updated_at=excluded.updated_at,attempted_at=excluded.attempted_at,error=NULL',
        )
        .bind(key, JSON.stringify(data), url, time, time)
        .run();
      return { data, updatedAt: time, stale: false, sourceUrl: url };
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Không kết nối được nguồn.';
      if (old?.updated_at) {
        await db()
          .prepare('UPDATE source_cache SET attempted_at=?,error=? WHERE key=?')
          .bind(Date.now(), message, key)
          .run();
        return {
          data: JSON.parse(old.body) as T,
          updatedAt: old.updated_at,
          stale: true,
          error: message,
          sourceUrl: url,
        };
      }
      // Record a failed first attempt without inventing an empty catalog.
      await db()
        .prepare(
          'INSERT INTO source_cache(key,body,source_url,updated_at,attempted_at,error) VALUES(?,?,?,0,?,?) ON CONFLICT(key) DO UPDATE SET attempted_at=excluded.attempted_at,error=excluded.error',
        )
        .bind(key, 'null', url, Date.now(), message)
        .run();
      throw new Error(message);
    } finally {
      running.delete(key);
    }
  })();
  running.set(key, job as Promise<Cached<unknown>>);
  return job;
}
export async function catalog(
  source: Source,
  path: string,
  force = false,
  adminView = false,
) {
  path = normalizedPath(path);
  if (!['archive', 'sourceforge'].includes(source))
    throw new Error('Nguồn không hợp lệ.');
  const url = source === 'archive' ? archiveUrl(path) : sfUrl(path);
  const value = await cached<Catalog>(
    `${source}:${path}`,
    url,
    900000,
    async () => {
      const res = await fetchMetadata(url);
      return source === 'archive'
        ? parseArchive(res.text, path)
        : parseSourceForge(res.text, path);
    },
    force,
  );
  const [config, edits, manual] = await Promise.all([
    settings(),
    overrides(),
    customs(),
  ]);
  const own = manual.filter(
    (e) => e.parent === path && e.category !== 'recovery',
  );
  const data = {
    ...value.data,
    entries: applyOverrides([...value.data.entries, ...own], edits),
    latest: applyOverrides(value.data.latest, edits),
  };
  data.entries.sort(
    (a, b) =>
      (a.order ?? config.devices.find((d) => d.name === a.name)?.order ?? 999) -
      (b.order ?? config.devices.find((d) => d.name === b.name)?.order ?? 999),
  );
  if (!adminView) {
    data.entries = data.entries.filter((e) => visibleEntry(e, config));
    data.latest = data.latest.filter((e) => visibleEntry(e, config));
  }
  return { ...value, data };
}
export async function ota(force = false, adminView = false) {
  const value = await cached<Entry[]>(
    'ota',
    ARCHIVE + '/api/ota.php',
    900000,
    async () =>
      parseOta(
        JSON.parse((await fetchMetadata(ARCHIVE + '/api/ota.php')).text),
      ),
    force,
  );
  const [config, edits] = await Promise.all([settings(), overrides()]);
  let data = applyOverrides(value.data, edits);
  if (!adminView) data = data.filter((e) => visibleEntry(e, config));
  return { ...value, data };
}
export async function traffic(force = false) {
  return Promise.all(
    ['outbound', 'outbound-server2'].map(async (file, i) => {
      const url = `${ARCHIVE}/api/${file}.json`;
      try {
        return await cached<Traffic>(
          `stats:${file}`,
          url,
          30000,
          async () => {
            const res = await fetchMetadata(url);
            return parseTraffic(
              JSON.parse(res.text),
              res.modified,
              i ? 'Mirror' : 'Máy chủ chính',
              url,
            );
          },
          force,
        );
      } catch (e) {
        return {
          data: {
            name: i ? 'Mirror' : 'Máy chủ chính',
            sourceUrl: url,
            updatedAt: null,
            stale: true,
            error: (e as Error).message,
          },
          sourceUrl: url,
          updatedAt: 0,
          stale: true,
        } as Cached<Traffic>;
      }
    }),
  );
}
export async function findEntry(id: string) {
  const [rows, manual, changes] = await Promise.all([
    db()
      .prepare(
        'SELECT body FROM source_cache WHERE updated_at>0 AND (key LIKE ? OR key LIKE ? OR key=?) ORDER BY updated_at DESC',
      )
      .bind('archive:%', 'sourceforge:%', 'ota')
      .all<{ body: string }>(),
    customs(),
    overrides(),
  ]);
  let entry = [...manual, recoveryEntry].find((e) => e.id === id);
  let recent: Entry | undefined;
  for (const row of rows.results) {
    if (entry) break;
    const data = JSON.parse(row.body);
    entry = (Array.isArray(data) ? data : data.entries || []).find(
      (e: Entry) => e.id === id,
    );
    if (!Array.isArray(data))
      recent ||= data.latest?.find((e: Entry) => e.id === id);
  }
  if (!entry && recent) {
    try {
      entry = (
        await catalog('archive', recent.parent, false, true)
      ).data.entries.find((e) => e.id === id);
    } catch {
      entry = recent;
    }
  }
  return entry ? applyOverrides([entry], changes)[0] : undefined;
}
export async function entryDetails(id: string) {
  let entry = await findEntry(id);
  if (!entry)
    throw new Error('Không tìm thấy bản phát hành. Hãy mở danh mục trước.');
  if (!visibleEntry(entry, await settings()))
    throw new Error('Bản phát hành không được hiển thị.');
  if (entry.source === 'archive' && !entry.checksum && entry.kind === 'file') {
    try {
      const url = `${ARCHIVE}/index.php?view=md5&mode=current&dir=${encodeURIComponent(entry.parent)}`;
      const hashes = await cached<Record<string, string>>(
        'md5:' + entry.parent,
        url,
        900000,
        async () => parseMd5((await fetchMetadata(url)).text),
      );
      entry = {
        ...entry,
        checksum: hashes.data[entry.path.split('/').at(-1)!],
        checksumType: 'MD5',
      };
    } catch {
      /* Optional checksum stays absent. */
    }
  }
  if (entry.source === 'archive' && entry.kind === 'file' && entry.checksum) {
    try {
      const mirrorCatalog = await catalog('sourceforge', entry.parent);
      const candidate = mirrorCatalog.data.entries.find((other) =>
        matchMirror(entry!, other),
      );
      if (
        candidate?.downloadUrl &&
        !entry.mirrors?.some((m) => m.url === candidate.downloadUrl)
      ) {
        entry = {
          ...entry,
          mirrors: [
            ...(entry.mirrors || []),
            {
              name: 'SourceForge · checksum trùng khớp',
              url: candidate.downloadUrl,
            },
          ],
        };
      }
    } catch {
      /* Missing mirrors never block the original download. */
    }
  }
  return entry;
}
export async function changelog(id: string) {
  const entry = await findEntry(id);
  if (!entry || !visibleEntry(entry, await settings()))
    throw new Error('Không tìm thấy bản phát hành.');
  let original = '';
  let error: string | undefined;
  let updatedAt = 0;
  if (entry.changelogUrl) {
    try {
      const value = await cached<string>(
        'changelog:' + id,
        entry.changelogUrl,
        86400000,
        async () =>
          parseChangelog((await fetchMetadata(entry.changelogUrl!)).text),
      );
      original = value.data;
      updatedAt = value.updatedAt;
      error = value.error;
    } catch (e) {
      error = (e as Error).message;
    }
  }
  return {
    id,
    original,
    vi: entry.changelogVi || '',
    sourceUrl: entry.changelogUrl,
    updatedAt,
    error,
  };
}
