import axios from 'axios'
import type { ApiEnvelope } from './apiResponse'
import { ApiRequestError } from './apiError'
import { env } from './env'

const rawClient = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  withCredentials: true, // refresh token travels as an httpOnly cookie
  headers: { 'Content-Type': 'application/json' },
})

let inMemoryAccessToken: string | null = null

export function setAccessToken(token: string | null) {
  inMemoryAccessToken = token
}

rawClient.interceptors.request.use((config) => {
  if (inMemoryAccessToken) {
    config.headers.Authorization = `Bearer ${inMemoryAccessToken}`
  }
  return config
})

async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const { data: envelope } = await promise
  if (envelope.success) return envelope.data
  throw new ApiRequestError(envelope.error)
}

export const apiClient = {
  get: <T>(url: string) => unwrap<T>(rawClient.get<ApiEnvelope<T>>(url)),
  post: <T>(url: string, body?: unknown) => unwrap<T>(rawClient.post<ApiEnvelope<T>>(url, body)),
  put: <T>(url: string, body?: unknown) => unwrap<T>(rawClient.put<ApiEnvelope<T>>(url, body)),
  delete: <T>(url: string) => unwrap<T>(rawClient.delete<ApiEnvelope<T>>(url)),
}
