const BASE_URL = "/api";

export class ApiError extends Error {
  status: number;
  code: string;
  retryAfter?: number;

  constructor(status: number, code: string, message: string, retryAfter?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

async function buildApiError(
  status: number,
  rawBody: string,
  retryAfterHeader: string | null,
): Promise<ApiError> {
  let detail = rawBody || `Request failed with status ${status}`;
  let code = `http_${status}`;
  if (rawBody) {
    try {
      const parsed = JSON.parse(rawBody) as { detail?: unknown; code?: unknown };
      if (typeof parsed.detail === "string") detail = parsed.detail;
      if (typeof parsed.code === "string") code = parsed.code;
    } catch {
      // body wasn't JSON — keep the raw text as the detail
    }
  }
  return new ApiError(status, code, detail, parseRetryAfter(retryAfterHeader));
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw await buildApiError(res.status, body, res.headers.get("Retry-After"));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function apiUpload<T>(
  path: string,
  body: FormData,
  onUploadProgress?: (progress: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_URL}${path}`);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onUploadProgress?.(Math.min(0.98, event.loaded / event.total));
    };
    xhr.upload.onload = () => onUploadProgress?.(1);
    xhr.onerror = () => reject(new ApiError(0, 'network_error', 'Network error while uploading'));
    xhr.onabort = () => reject(new ApiError(0, 'aborted', 'Upload canceled'));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as T);
        } catch {
          reject(new ApiError(xhr.status, 'invalid_response', 'Upload succeeded but the response could not be read'));
        }
      } else {
        void buildApiError(
          xhr.status,
          xhr.responseText,
          xhr.getResponseHeader('Retry-After'),
        ).then(reject);
      }
    };

    xhr.send(body);
  });
}
