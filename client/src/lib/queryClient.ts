import { QueryClient } from '@tanstack/react-query'
import { ApiRequestError } from './apiError'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // 4xx errors are client errors — retrying won't change the outcome.
        // Only network failures and 5xx responses are worth retrying.
        const is4xx = (error instanceof ApiRequestError && error.status >= 400 && error.status < 500)
                   || (typeof error === 'object' && error !== null && 'isAxiosError' in error && (error as unknown as { response?: { status?: number } }).response?.status !== undefined && (error as unknown as { response?: { status?: number } }).response!.status! >= 400 && (error as unknown as { response?: { status?: number } }).response!.status! < 500)
        
        if (is4xx) {
          return false
        }
        return failureCount < 2
      },
      staleTime: 30_000,
    },
  },
})
