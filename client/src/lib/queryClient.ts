import { QueryClient } from '@tanstack/react-query'
import { ApiRequestError } from './apiError'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry auth/permission failures — retrying won't fix a 401/403
        if (
          error instanceof ApiRequestError &&
          ['AUTH_SESSION_EXPIRED', 'FORBIDDEN'].includes(error.code)
        ) {
          return false
        }
        return failureCount < 2
      },
      staleTime: 30_000,
    },
  },
})
