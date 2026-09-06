import { platform } from '@/lib/platform';
import {
  catalog,
  ota,
  traffic,
  entryDetails,
  changelog,
  findEntry,
} from '@/lib/sources';
import {
  settings,
  overrides,
  customs,
  logs,
  writeDocument,
  db,
  applyOverrides,
} from '@/lib/store';
import { isAdmin, login, logout, checkOrigin } from '@/lib/auth';
import {
  validateSettings,
  validateOverride,
  validateCustom,
  validateLog,
  str,
} from '@/lib/validation';
import {
  defaultSettings,
  recoveryEntry,
  visibleEntry,
  type Source,
} from '@/lib/model';
export const dynamic = 'force-dynamic';
function json(
  value: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return Response.json(value, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}
async function readBody(req: Request, maximum: number) {
  const reader = req.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > maximum) {
      await reader.cancel();
      throw new Error('Nội dung quá lớn.');
    }
    chunks.push(value);
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const route = u.pathname.slice(5);
    if (route === 'health') {
      await db().prepare('SELECT 1 AS healthy').first();
      return json({ status: 'ok' });
    }
    if (route === 'settings') {
      const config = await settings();
      return json({
        ...config,
        donate: config.donate?.enabled
          ? config.donate
          : { ...defaultSettings.donate, ...(config.donate || {}), enabled: true },
      });
    }
    if (route === 'auth')
      return json({
        authenticated: await isAdmin(req),
        initialized: !!(await db()
          .prepare('SELECT id FROM admin WHERE id=1')
          .first()),
      });
    if (route.startsWith('assets/')) {
      const key = route.slice(7);
      if (!/^[a-f0-9-]+\.(png|jpg|webp)$/.test(key))
        return json({ error: 'Không tìm thấy ảnh.' }, 404);
      const file = await platform.files.get(key);
      if (!file) return json({ error: 'Không tìm thấy ảnh.' }, 404);
      return new Response(file.body, {
        headers: {
          'Content-Type':
            file.httpMetadata?.contentType || 'application/octet-stream',
          'Cache-Control': 'public,max-age=31536000,immutable',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }
    if (route.startsWith('admin/')) {
      if (!(await isAdmin(req)))
        return json({ error: 'Cần đăng nhập quản trị.' }, 401);
      if (route === 'admin/data') {
        const [config, edits, manual, journal, cache] = await Promise.all([
          settings(),
          overrides(),
          customs(),
          logs(),
          db()
            .prepare(
              'SELECT key,source_url,updated_at,attempted_at,error FROM source_cache ORDER BY attempted_at DESC',
            )
            .all(),
        ]);
        return json({
          settings: config,
          overrides: edits,
          customs: manual,
          logs: journal,
          cache: cache.results,
        });
      }
      if (route === 'admin/catalog' && u.searchParams.get('source') === 'ota') {
        const value = await ota(false, true);
        return json({
          ...value,
          data: {
            source: 'ota',
            path: '',
            entries: value.data,
            latest: [],
            notes: [],
            sourceUrl: value.sourceUrl,
          },
        });
      }
      if (route === 'admin/catalog')
        return json(
          await catalog(
            (u.searchParams.get('source') || 'archive') as Source,
            u.searchParams.get('path') || '',
            false,
            true,
          ),
        );
      return json({ error: 'Không tìm thấy.' }, 404);
    }
    const config = await settings();
    const section =
      route === 'catalog'
        ? u.searchParams.get('source') === 'sourceforge'
          ? 'mirrors'
          : 'archive'
        : route === 'ota'
          ? 'ota'
          : route === 'stats'
            ? 'stats'
            : route === 'recovery'
              ? 'recovery'
              : route === 'logs'
                ? 'changelog'
                : null;
    if (section && !config.sections.find((s) => s.id === section)?.enabled)
      return json({ error: 'Danh mục đang tắt.' }, 404);
    if (route === 'catalog')
      return json(
        await catalog(
          (u.searchParams.get('source') || 'archive') as Source,
          u.searchParams.get('path') || '',
        ),
      );
    if (route === 'ota') return json(await ota());
    if (route === 'stats') return json(await traffic());
    if (route === 'entry')
      return json(await entryDetails(u.searchParams.get('id') || ''));
    if (route === 'changelog')
      return json(await changelog(u.searchParams.get('id') || ''));
    if (route === 'recovery')
      return json(
        applyOverrides(
          [
            recoveryEntry,
            ...(await customs()).filter((e) => e.category === 'recovery'),
          ],
          await overrides(),
        ).filter((e) => visibleEntry(e, config)),
      );
    if (route === 'logs')
      return json(
        (await logs())
          .filter((l) => l.published)
          .sort((a, b) => b.date.localeCompare(a.date)),
      );
    return json({ error: 'Không tìm thấy.' }, 404);
  } catch (e) {
    console.error('API read:', (e as Error).message);
    return json(
      { error: (e as Error).message || 'Không đọc được dữ liệu.' },
      502,
    );
  }
}
export async function POST(req: Request) {
  try {
    const route = new URL(req.url).pathname.slice(5);
    // Drain a bounded request before early rejection. Workerd's streaming proxy
    // otherwise aborts pooled connections when a response precedes body consumption.
    const raw = await readBody(
      req,
      route === 'admin/upload' ? 2300000 : 300000,
    );
    checkOrigin(req);
    if (route === 'auth/login') {
      const data = JSON.parse(new TextDecoder().decode(raw));
      const cookie = await login(
        req,
        str(data.username, 100),
        str(data.password, 200),
      );
      return json({ ok: true }, 200, { 'Set-Cookie': cookie });
    }
    if (route === 'auth/logout')
      return json({ ok: true }, 200, { 'Set-Cookie': await logout(req) });
    if (!(await isAdmin(req)))
      return json({ error: 'Cần đăng nhập quản trị.' }, 401);
    if (route === 'admin/upload') {
      if (Number(req.headers.get('content-length')) > 2300000)
        throw new Error('Ảnh tối đa 2 MB.');
      const upload = new Request(req.url, {
        method: 'POST',
        headers: req.headers,
        body: raw,
      });
      const file = (await upload.formData()).get('file');
      if (!(file instanceof File) || file.size > 2097152)
        throw new Error('Ảnh tối đa 2 MB.');
      const buffer = new Uint8Array(await file.arrayBuffer());
      let ext = '';
      if (
        buffer[0] === 137 &&
        buffer[1] === 80 &&
        buffer[2] === 78 &&
        buffer[3] === 71
      )
        ext = 'png';
      if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255)
        ext = 'jpg';
      if (
        new TextDecoder().decode(buffer.slice(0, 4)) === 'RIFF' &&
        new TextDecoder().decode(buffer.slice(8, 12)) === 'WEBP'
      )
        ext = 'webp';
      if (!ext) throw new Error('Chỉ nhận ảnh PNG, JPG hoặc WebP.');
      const key = crypto.randomUUID() + '.' + ext;
      await platform.files.put(key, buffer, {
        httpMetadata: {
          contentType: ext === 'jpg' ? 'image/jpeg' : 'image/' + ext,
        },
      });
      return json({ url: '/api/assets/' + key });
    }
    const value = JSON.parse(new TextDecoder().decode(raw));
    if (route === 'admin/settings') {
      const data = validateSettings(value);
      await writeDocument('settings', data);
      return json(data);
    }
    if (route === 'admin/override') {
      const data = validateOverride(value);
      if (!(await findEntry(data.id)))
        throw new Error(
          'Bản phát hành không tồn tại trong dữ liệu đã đồng bộ.',
        );
      const all = await overrides();
      await writeDocument('overrides', [
        ...all.filter((e) => e.id !== data.id),
        data,
      ]);
      return json(data);
    }
    if (route === 'admin/reset-override') {
      const id = str(value.id, 1000);
      await writeDocument(
        'overrides',
        (await overrides()).filter((e) => e.id !== id),
      );
      return json({ ok: true });
    }
    if (route === 'admin/custom') {
      const entry = validateCustom(value);
      const all = await customs();
      const existing =
        typeof value.id === 'string'
          ? all.find((e) => e.id === value.id)
          : undefined;
      if (existing) entry.id = existing.id;
      await writeDocument('customs', [
        ...all.filter((e) => e.id !== entry.id),
        entry,
      ]);
      return json(entry);
    }
    if (route === 'admin/delete-custom') {
      const id = str(value.id, 1000);
      await writeDocument(
        'customs',
        (await customs()).filter((e) => e.id !== id),
      );
      return json({ ok: true });
    }
    if (route === 'admin/log') {
      const log = validateLog(value);
      await writeDocument('logs', [
        ...(await logs()).filter((e) => e.id !== log.id),
        log,
      ]);
      return json(log);
    }
    if (route === 'admin/delete-log') {
      await writeDocument(
        'logs',
        (await logs()).filter((e) => e.id !== str(value.id, 100)),
      );
      return json({ ok: true });
    }
    if (route === 'admin/sync') {
      if (value.source === 'ota') return json(await ota(true, true));
      if (value.source === 'stats') return json(await traffic(true));
      return json(
        await catalog(
          value.source as Source,
          str(value.path || '', 800),
          true,
          true,
        ),
      );
    }
    return json({ error: 'Không tìm thấy.' }, 404);
  } catch (e) {
    return json(
      { error: (e as Error).message || 'Không lưu được thay đổi.' },
      400,
    );
  }
}
