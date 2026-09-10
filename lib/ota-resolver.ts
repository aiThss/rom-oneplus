import { ARCHIVE, type OtaResolveResult } from './model.ts';

export interface OtaDeviceMap {
  [device: string]: {
    [region: string]: string[];
  };
}

interface CachedResolvedUrl {
  url: string;
  expires_at: number;
  manual?: boolean;
  timestamp: number;
  device: string;
  region: string;
  version: string;
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

const DEVICE_MAP_TTL = 30 * 60 * 1000; // 30 minutes cache for device-version tree

let deviceMapCache: {
  data: OtaDeviceMap;
  timestamp: number;
} | null = null;

const resolvedUrlCache = new Map<string, CachedResolvedUrl>();
const inFlightResolves = new Map<string, Promise<OtaResolveResult>>();

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function getHeaders(
  cookie?: string,
  referer = `${ARCHIVE}/index.php?view=ota`,
): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    Accept:
      'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
    Referer: referer,
  };
  if (cookie) headers['Cookie'] = cookie;
  return headers;
}

/**
 * Fetch or get cached device-version map from Daniel Springer OTA page.
 */
export async function getOtaDeviceMap(
  forceRefresh = false,
): Promise<OtaDeviceMap> {
  if (
    !forceRefresh &&
    deviceMapCache &&
    Date.now() - deviceMapCache.timestamp < DEVICE_MAP_TTL
  ) {
    return deviceMapCache.data;
  }

  const res = await fetch(`${ARCHIVE}/index.php?view=ota`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    if (deviceMapCache) return deviceMapCache.data;
    throw new Error(
      `Không thể tải danh mục OTA từ máy chủ nguồn (HTTP ${res.status}).`,
    );
  }

  const html = await res.text();
  const devAttrMatch = html.match(/data-devices='([^']+)'/);
  if (!devAttrMatch) {
    if (deviceMapCache) return deviceMapCache.data;
    throw new Error(
      'Không phân tích được danh sách thiết bị trên trang OTA nguồn.',
    );
  }

  try {
    const data = JSON.parse(decodeHtml(devAttrMatch[1])) as OtaDeviceMap;
    deviceMapCache = {
      data,
      timestamp: Date.now(),
    };
    return data;
  } catch (err) {
    if (deviceMapCache) return deviceMapCache.data;
    throw new Error(
      `Lỗi phân tích dữ liệu thiết bị OTA: ${(err as Error).message}`,
    );
  }
}

/**
 * Find the version_index for a given device, region, and version.
 */
export async function getOtaVersionIndex(
  device: string,
  region: string,
  version: string,
): Promise<number> {
  const map = await getOtaDeviceMap();
  const versions = map[device]?.[region] || [];

  // Exact match
  let idx = versions.indexOf(version);
  if (idx !== -1) return idx;

  // Fuzzy match: case-insensitive or substring
  const vLower = version.toLowerCase().trim();
  idx = versions.findIndex((v) => {
    const candidate = v.toLowerCase().trim();
    return (
      candidate === vLower ||
      candidate.includes(vLower) ||
      vLower.includes(candidate)
    );
  });
  if (idx !== -1) return idx;

  // Fallback: check across all regions of device if given region has slight mismatch
  for (const [otherRegion, regVersions] of Object.entries(map[device] || {})) {
    if (otherRegion === region) continue;
    const fIdx = regVersions.findIndex((v) => {
      const candidate = v.toLowerCase().trim();
      return (
        candidate === vLower ||
        candidate.includes(vLower) ||
        vLower.includes(candidate)
      );
    });
    if (fIdx !== -1) return fIdx;
  }

  throw new Error(
    `Không tìm thấy phiên bản "${version}" cho ${device} (${region || 'Tất cả'}) trên máy chủ OTA nguồn.`,
  );
}

/**
 * Return cached resolved URL if still valid.
 */
export function getCachedOtaUrl(
  device: string,
  region: string,
  version: string,
): CachedResolvedUrl | null {
  for (const item of resolvedUrlCache.values()) {
    if (
      item.device.toLowerCase() === device.toLowerCase() &&
      (!region || item.region.toLowerCase() === region.toLowerCase()) &&
      item.version.toLowerCase() === version.toLowerCase()
    ) {
      const isExpired =
        item.expires_at > 0 && item.expires_at * 1000 <= Date.now() + 60_000;
      if (!isExpired) return item;
    }
  }
  return null;
}

export function getCachedOtaUrlById(id: string): CachedResolvedUrl | null {
  const cached = resolvedUrlCache.get(id);
  if (cached) {
    const isExpired =
      cached.expires_at > 0 && cached.expires_at * 1000 <= Date.now() + 60_000;
    if (!isExpired) return cached;
  }
  return null;
}

export interface ResolveOtaParams {
  id?: string;
  device?: string;
  region?: string;
  version?: string;
  versionIndex?: number;
  forceRefresh?: boolean;
}

/**
 * Request and resolve an OTA download link directly in the background from the original source.
 */
export async function resolveOtaDownload(
  params: ResolveOtaParams,
): Promise<OtaResolveResult> {
  let { id, device, region, version, versionIndex, forceRefresh } = params;

  if (!device || !version) {
    throw new Error('Thiếu thông tin thiết bị hoặc phiên bản OTA.');
  }

  // Check cache first
  const cacheKey = `${device}:${region || ''}:${version}`;
  if (!forceRefresh) {
    const cached = getCachedOtaUrl(device, region || '', version);
    if (cached) {
      return {
        ok: true,
        url: cached.url,
        expires_at: cached.expires_at,
        manual: cached.manual,
        cached: true,
        device,
        region,
        version,
      };
    }
  }

  // Deduplicate in-flight requests
  const existingPromise = inFlightResolves.get(cacheKey);
  if (existingPromise && !forceRefresh) {
    return await existingPromise;
  }

  const resolvePromise = (async (): Promise<OtaResolveResult> => {
    // 1. Determine version_index if not supplied
    if (
      versionIndex === undefined ||
      versionIndex === null ||
      versionIndex < 0
    ) {
      versionIndex = await getOtaVersionIndex(device!, region || '', version!);
    }

    // 2. Initialize session on source OTA page
    const getRes = await fetch(`${ARCHIVE}/index.php?view=ota`, {
      headers: getHeaders(),
    });
    if (!getRes.ok) {
      if (getRes.status === 429) {
        throw new Error(
          'Máy chủ nguồn đang bận hoặc giới hạn lượt yêu cầu (HTTP 429). Vui lòng thử lại sau giây lát.',
        );
      }
      throw new Error(
        `Không thể kết nối máy chủ nguồn (HTTP ${getRes.status}).`,
      );
    }

    const setCookie = getRes.headers.get('set-cookie');
    const sessionCookie = (setCookie || '').split(';')[0];
    if (!sessionCookie) {
      throw new Error('Máy chủ nguồn không cấp phiên làm việc.');
    }

    // 3. POST form to resolve device + region + version_index
    const postBody = new URLSearchParams({
      device: device!,
      region: region || '',
      version_index: String(versionIndex || 0),
    });

    const postRes = await fetch(
      `${ARCHIVE}/index.php?view=ota#ota-downloader`,
      {
        method: 'POST',
        redirect: 'manual',
        headers: {
          ...getHeaders(sessionCookie),
          'Content-Type': 'application/x-www-form-urlencoded',
          Origin: ARCHIVE,
        },
        body: postBody,
      },
    );

    if (postRes.status === 429) {
      throw new Error(
        'Máy chủ nguồn đang bận (Error 429: Too Many Requests). Vui lòng thử lại sau vài giây.',
      );
    }

    const loc =
      postRes.headers.get('location') || '/index.php?view=ota#resultBox';
    const targetUrl = new URL(loc, ARCHIVE).href;

    // 4. GET result box page to extract download link or resolver tokens
    const resBoxRes = await fetch(targetUrl, {
      headers: getHeaders(sessionCookie),
    });
    if (resBoxRes.status === 429) {
      throw new Error(
        'Máy chủ nguồn đang bận (Error 429). Vui lòng thử lại sau giây lát.',
      );
    }
    const html = await resBoxRes.text();

    const dataUrlMatch = html.match(/data-url=["']([^"']+)["']/i);
    let resolvedUrl = dataUrlMatch?.[1] ? decodeHtml(dataUrlMatch[1]) : '';
    const isManual = html.includes('data-manual="1"');

    const kMatch =
      html.match(/data-ota-key=["']([^"']+)["']/i) ||
      html.match(
        /<form[^>]*id=["'](?:otaRootPatchForm|otaImageForm|otaPackageForm)["'][\s\S]*?name=["']k["']\s+value=["']([^"']+)["']/i,
      );
    const csrfMatch =
      html.match(/data-csrf=["']([^"']+)["']/i) ||
      html.match(
        /<form[^>]*id=["'](?:otaRootPatchForm|otaImageForm|otaPackageForm)["'][\s\S]*?name=["']csrf["']\s+value=["']([^"']+)["']/i,
      );

    const k = kMatch?.[1];
    const csrf = csrfMatch?.[1];

    let expiresAt = 0;

    // 5. If direct URL is not in data-url, call resolve_json with k & csrf
    if (!resolvedUrl && k && csrf) {
      const resolveBody = new URLSearchParams({ k, csrf });
      const resolveRes = await fetch(
        `${ARCHIVE}/index.php?view=ota&ota_action=resolve_json`,
        {
          method: 'POST',
          headers: {
            ...getHeaders(sessionCookie),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: resolveBody,
        },
      );

      if (resolveRes.status === 429) {
        throw new Error(
          'Máy chủ nguồn đang bận (Error 429: Rate Limit). Vui lòng thử lại sau giây lát.',
        );
      }

      const payload = (await resolveRes.json().catch(() => null)) as {
        ok?: boolean;
        url?: string;
        expires_at?: number;
        manual?: boolean;
        message?: string;
      } | null;

      if (!resolveRes.ok || !payload?.ok || !payload?.url) {
        throw new Error(
          payload?.message || 'Không thể lấy link tải OTA từ máy chủ nguồn.',
        );
      }

      resolvedUrl = payload.url;
      expiresAt = payload.expires_at || 0;
    } else if (!resolvedUrl) {
      throw new Error('Máy chủ nguồn không trả về link tải cho bản OTA này.');
    }

    // 6. Extract expires_at from URL if not already provided
    if (!expiresAt && resolvedUrl) {
      try {
        const parsed = new URL(resolvedUrl);
        const rawExpires =
          parsed.searchParams.get('x-oss-expires') ||
          parsed.searchParams.get('Expires');
        if (rawExpires) {
          expiresAt = parseInt(rawExpires, 10);
        }
      } catch {
        // ignore
      }
    }

    const cachedData: CachedResolvedUrl = {
      url: resolvedUrl,
      expires_at: expiresAt,
      manual: isManual,
      timestamp: Date.now(),
      device: device!,
      region: region || '',
      version: version!,
    };

    resolvedUrlCache.set(cacheKey, cachedData);
    if (id) {
      resolvedUrlCache.set(id, cachedData);
    }

    return {
      ok: true,
      url: resolvedUrl,
      expires_at: expiresAt,
      manual: isManual,
      cached: false,
      device,
      region,
      version,
    };
  })();

  inFlightResolves.set(cacheKey, resolvePromise);
  try {
    return await resolvePromise;
  } finally {
    inFlightResolves.delete(cacheKey);
  }
}
