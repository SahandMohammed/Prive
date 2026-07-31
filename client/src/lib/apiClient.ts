import axios, { isAxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import type { ApiEnvelope } from './apiResponse'
import { ApiRequestError } from './apiError'
import { env } from './env'

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

const rawClient = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  withCredentials: true, // refresh token travels as an httpOnly cookie
  headers: { 'Content-Type': 'application/json' },
})

// ---------------------------------------------------------------------------
// Access token
// ---------------------------------------------------------------------------
// In-memory only — not persisted across page refreshes. On a hard refresh the
// first protected request 401s, the interceptor fires, the httpOnly cookie
// silently restores the session. See tryRestoreSession() in auth/bootstrap.ts
// for the explicit app-startup path.

let inMemoryAccessToken: string | null = null

export function setAccessToken(token: string | null) {
  inMemoryAccessToken = token
}

// ---------------------------------------------------------------------------
// Session handler registration (item 1 — invert the lib ↔ feature dependency)
// ---------------------------------------------------------------------------
// lib/ must not import from features/. Instead, apiClient exposes two hooks
// and the auth feature registers concrete implementations at app startup via
// initAuthSession() in features/auth/bootstrap.ts.
//
// The handlers are called with `?.` — safe to use before registration, and in
// tests where no feature code is wired up.

interface SessionHandlers {
  onTokenRefreshed: (
    token: string,
    expiresAtUtc: string,
    mustChangePassword: boolean,
  ) => void
  onSessionExpired: () => void
}

let sessionHandlers: SessionHandlers | null = null

/** Called once at app startup by features/auth/bootstrap.ts. */
export function registerSessionHandlers(handlers: SessionHandlers): void {
  sessionHandlers = handlers
}

// ---------------------------------------------------------------------------
// Request interceptor — inject Bearer token
// ---------------------------------------------------------------------------

rawClient.interceptors.request.use((config) => {
  if (inMemoryAccessToken) {
    config.headers.Authorization = `Bearer ${inMemoryAccessToken}`
  }
  return config
})

// ---------------------------------------------------------------------------
// Typed request config (item 9 — _retry was previously untyped)
// ---------------------------------------------------------------------------

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

// ---------------------------------------------------------------------------
// Response interceptor — transparent token refresh on 401
// ---------------------------------------------------------------------------
//
// Only intercepts 401s on PROTECTED endpoints. Auth endpoints (/auth/login,
// /auth/refresh) return 401 as a domain error (bad credentials / no cookie),
// not as a session-expiry signal. Intercepting them would cause a deadlock:
//
//   login 401 → interceptor starts refresh → refresh 401 → interceptor queues
//   itself → outer refresh never resolves → button stuck in isPending forever.

const SKIP_REFRESH_URLS = ['/auth/login', '/auth/refresh']

let isRefreshing = false
type QueueEntry = { resolve: (token: string) => void; reject: (err: unknown) => void }
let waitingQueue: QueueEntry[] = []

function drainQueue(error: unknown, token: string | null) {
  waitingQueue.forEach((entry) =>
    error ? entry.reject(error) : entry.resolve(token!),
  )
  waitingQueue = []
}

rawClient.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig
    const is401 = error.response?.status === 401
    const alreadyRetried = originalRequest._retry === true
    const isAuthEndpoint = SKIP_REFRESH_URLS.some((u) =>
      (originalRequest.url ?? '').startsWith(u),
    )

    if (!is401 || alreadyRetried || isAuthEndpoint) {
      return Promise.reject(error)
    }

    // A refresh is already in flight — queue this request.
    // Mark _retry=true so the retry itself won't trigger a second refresh
    // if it also 401s for a different reason. (item 3 — missing _retry on queued)
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        waitingQueue.push({ resolve, reject })
      }).then((newToken) => {
        originalRequest._retry = true
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return rawClient(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const { data: envelope } = await rawClient.post<
        ApiEnvelope<{
          accessToken: string
          accessTokenExpiresAtUtc: string
          mustChangePassword: boolean
        }>
      >('/auth/refresh')

      if (!envelope.success) {
        throw new ApiRequestError(envelope.error, 401)
      }

      const { accessToken, accessTokenExpiresAtUtc, mustChangePassword } = envelope.data
      setAccessToken(accessToken)
      sessionHandlers?.onTokenRefreshed(accessToken, accessTokenExpiresAtUtc, mustChangePassword)

      drainQueue(null, accessToken)
      originalRequest.headers.Authorization = `Bearer ${accessToken}`
      return rawClient(originalRequest)
    } catch (refreshError) {
      setAccessToken(null)
      sessionHandlers?.onSessionExpired()
      drainQueue(refreshError, null)
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

// ---------------------------------------------------------------------------
// Unwrap helper
// ---------------------------------------------------------------------------
// Axios throws for any non-2xx. The backend's ApiEnvelope error body sits in
// error.response.data. We extract it here so every caller always receives
// ApiRequestError — never a raw AxiosError — for any structured domain error.

async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  try {
    const { data: envelope } = await promise
    if (envelope.success) return envelope.data
    // Shouldn't reach here (Axios throws on non-2xx) but guard it anyway.
    throw new ApiRequestError(envelope.error, 200)
  } catch (err) {
    if (isAxiosError(err) && err.response?.data) {
      const body = err.response.data as ApiEnvelope<T>
      if (body.success === false && body.error) {
        throw new ApiRequestError(body.error, err.response.status)
      }
    }
    throw err
  }
}

// ---------------------------------------------------------------------------
// Public API client
// ---------------------------------------------------------------------------

export const apiClient = {
  get: <T>(url: string) => unwrap<T>(rawClient.get<ApiEnvelope<T>>(url)),
  post: <T>(url: string, body?: unknown) =>
    unwrap<T>(rawClient.post<ApiEnvelope<T>>(url, body)),
  put: <T>(url: string, body?: unknown) =>
    unwrap<T>(rawClient.put<ApiEnvelope<T>>(url, body)),
  delete: <T>(url: string) => unwrap<T>(rawClient.delete<ApiEnvelope<T>>(url)),
}
