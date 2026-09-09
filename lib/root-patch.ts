import {
  ARCHIVE,
  type RootPatchCapability,
  type RootPatchJobStatus,
  type RootPatchVariant,
} from './model.ts';

interface ManifestResponse {
  state?: string;
  token?: string;
  arb_1?: boolean;
  root_patch?: {
    available?: boolean;
    partition?: string;
    label?: string;
    variants?: RootPatchVariant[];
  };
}

interface JobResponse {
  state?: 'queued' | 'running' | 'ready' | 'failed';
  token?: string;
  message?: string;
  wait_seconds?: number;
  position?: number;
  needs_resolve?: boolean;
  reference?: string;
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

function getHeaders(
  cookie?: string,
  referer = `${ARCHIVE}/index.php?view=ota`,
) {
  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    Accept:
      'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
    Referer: referer,
  };
  if (cookie) headers['Cookie'] = cookie;
  return headers;
}

export async function checkRootPatchCapability(
  device: string,
  region: string,
  versionIndex = 0,
): Promise<RootPatchCapability> {
  if (!device) {
    throw new Error('Chưa chọn thiết bị.');
  }

  // Step 1: Initialize session on Daniel Springer OTA page
  const getRes = await fetch(`${ARCHIVE}/index.php?view=ota`, {
    headers: getHeaders(),
  });
  if (!getRes.ok) {
    throw new Error(
      `Không thể kết nối tới máy chủ nguồn (HTTP ${getRes.status}).`,
    );
  }
  const setCookie = getRes.headers.get('set-cookie');
  const sessionCookie = (setCookie || '').split(';')[0];
  if (!sessionCookie) {
    throw new Error('Máy chủ nguồn không cấp phiên làm việc.');
  }

  // Step 2: POST to resolve device + region + version
  const postBody = new URLSearchParams({
    device,
    region: region || '',
    version_index: String(versionIndex || 0),
  });

  const postRes = await fetch(`${ARCHIVE}/index.php?view=ota#ota-downloader`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      ...getHeaders(sessionCookie),
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: ARCHIVE,
    },
    body: postBody,
  });

  if (postRes.status === 429) {
    throw new Error(
      'Máy chủ nguồn đang bận (Error 429: Too Many Requests). Vui lòng thử lại sau vài giây.',
    );
  }

  const loc =
    postRes.headers.get('location') || '/index.php?view=ota#resultBox';
  const targetUrl = new URL(loc, ARCHIVE).href;

  // Step 3: GET result page to extract form keys
  const resBoxRes = await fetch(targetUrl, {
    headers: getHeaders(sessionCookie),
  });
  if (resBoxRes.status === 429) {
    throw new Error(
      'Máy chủ nguồn đang bận (Error 429). Vui lòng thử lại sau giây lát.',
    );
  }
  const html = await resBoxRes.text();

  // Extract k and csrf from otaRootPatchForm or otaImageForm
  const kMatch = html.match(
    /<form[^>]*id=["'](?:otaRootPatchForm|otaImageForm)["'][\s\S]*?name=["']k["']\s+value=["']([^"']+)["']/i,
  );
  const csrfMatch = html.match(
    /<form[^>]*id=["'](?:otaRootPatchForm|otaImageForm)["'][\s\S]*?name=["']csrf["']\s+value=["']([^"']+)["']/i,
  );

  const k = kMatch?.[1];
  const csrf = csrfMatch?.[1];

  if (!k || !csrf) {
    return {
      available: false,
      partition: 'init_boot',
      variants: [],
      message:
        'Phiên bản này không hỗ trợ trích xuất hoặc vá tự động trên máy chủ nguồn.',
    };
  }

  // Step 4: Resolve OTA link if needed
  try {
    const resolveBody = new URLSearchParams({ k, csrf });
    await fetch(`${ARCHIVE}/index.php?view=ota&ota_action=resolve_json`, {
      method: 'POST',
      headers: {
        ...getHeaders(sessionCookie),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: resolveBody,
    });
  } catch {
    // resolve_json is non-blocking if already ready
  }

  // Step 5: Start manifest check
  const mfBody = new URLSearchParams({ k, csrf });
  const mfRes = await fetch(`${ARCHIVE}/ota_extract.php?op=manifest_start`, {
    method: 'POST',
    headers: {
      ...getHeaders(sessionCookie),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: mfBody,
  });

  if (!mfRes.ok && mfRes.status !== 409) {
    throw new Error(`Lỗi kiểm tra phân vùng từ nguồn (HTTP ${mfRes.status}).`);
  }

  let mfJson: ManifestResponse | null = null;
  try {
    mfJson = (await mfRes.json()) as ManifestResponse;
  } catch {
    throw new Error('Phản hồi từ máy chủ nguồn không hợp lệ.');
  }

  // If queued, poll manifest status up to 5 times
  const token = mfJson?.token;
  let attempts = 0;
  while (mfJson?.state === 'queued' && token && attempts < 5) {
    attempts++;
    await new Promise((r) => setTimeout(r, 1500));
    const pollRes = await fetch(
      `${ARCHIVE}/ota_extract.php?op=manifest_status&token=${encodeURIComponent(token)}`,
      { headers: getHeaders(sessionCookie) },
    );
    if (pollRes.ok) {
      try {
        mfJson = (await pollRes.json()) as ManifestResponse;
      } catch {
        break;
      }
    }
  }

  const rootPatch = mfJson?.root_patch;
  const isAvailable = Boolean(
    rootPatch?.available && rootPatch?.variants?.length,
  );
  const partition = rootPatch?.partition === 'boot' ? 'boot' : 'init_boot';

  return {
    available: isAvailable,
    partition,
    label:
      rootPatch?.label || (partition === 'boot' ? 'boot.img' : 'init_boot.img'),
    variants: Array.isArray(rootPatch?.variants) ? rootPatch.variants : [],
    k,
    csrf,
    sessionCookie,
    arb1: Boolean(mfJson?.arb_1),
    message: isAvailable
      ? undefined
      : 'Bản OTA này không có sẵn phân vùng init_boot hoặc boot phù hợp để vá tự động.',
  };
}

export async function startRootPatchJob(
  k: string,
  csrf: string,
  flavor: string,
  sessionCookie: string,
): Promise<RootPatchJobStatus> {
  if (!k || !csrf || !flavor) {
    throw new Error('Thiếu thông số bắt đầu tiến trình vá.');
  }

  const body = new URLSearchParams({ k, csrf, flavor });
  const res = await fetch(`${ARCHIVE}/ota_extract.php?op=patch_start`, {
    method: 'POST',
    headers: {
      ...getHeaders(sessionCookie),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  let json: JobResponse | null = null;
  try {
    json = (await res.json()) as JobResponse;
  } catch {
    throw new Error('Máy chủ nguồn trả về dữ liệu không hợp lệ.');
  }

  if (res.status === 409 && json?.needs_resolve) {
    // Resolve fresh link then retry once
    const resolveBody = new URLSearchParams({ k, csrf });
    await fetch(`${ARCHIVE}/index.php?view=ota&ota_action=resolve_json`, {
      method: 'POST',
      headers: {
        ...getHeaders(sessionCookie),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: resolveBody,
    });

    const retryRes = await fetch(`${ARCHIVE}/ota_extract.php?op=patch_start`, {
      method: 'POST',
      headers: {
        ...getHeaders(sessionCookie),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    json = (await retryRes.json()) as JobResponse;
  }

  if (json?.state === 'failed') {
    throw new Error(json.message || 'Khởi tạo tiến trình vá thất bại.');
  }

  return {
    state: json?.state || 'queued',
    token: json?.token,
    message: json?.message,
    wait_seconds: json?.wait_seconds,
    position: json?.position,
  };
}

export async function getRootPatchJobStatus(
  token: string,
  sessionCookie: string,
): Promise<RootPatchJobStatus> {
  if (!token) {
    throw new Error('Thiếu token kiểm tra tiến trình.');
  }

  const res = await fetch(
    `${ARCHIVE}/ota_extract.php?op=status&token=${encodeURIComponent(token)}`,
    { headers: getHeaders(sessionCookie) },
  );

  let json: JobResponse | null = null;
  try {
    json = (await res.json()) as JobResponse;
  } catch {
    throw new Error('Không đọc được trạng thái từ máy chủ nguồn.');
  }

  return {
    state: json?.state || 'failed',
    token: json?.token || token,
    message: json?.message,
    wait_seconds: json?.wait_seconds,
    position: json?.position,
    reference: json?.reference,
  };
}

export async function fetchPatchedDownloadResponse(
  token: string,
  sessionCookie: string,
): Promise<Response> {
  if (!token) {
    throw new Error('Thiếu token tải file.');
  }

  return fetch(
    `${ARCHIVE}/ota_extract.php?op=download&token=${encodeURIComponent(token)}`,
    { headers: getHeaders(sessionCookie) },
  );
}
