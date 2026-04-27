import { QueryClient } from '@tanstack/react-query'

export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Real API settings
        staleTime: 1000 * 30, // 30 seconds - data stays fresh for 30s
        gcTime: 1000 * 60 * 5, // 5 minutes - cache kept for 5 mins
        retry: (failureCount, error) => {
          // Retry on network errors, not on 4xx client errors
          if (error instanceof Error && error.message.includes('404')) {
            return false
          }
          return failureCount < 3
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false,
        refetchOnMount: 'always',
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
      },
    },
  })

  return {
    queryClient,
  }
}

export default function TanstackQueryProvider() { }
