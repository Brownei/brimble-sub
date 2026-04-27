import {
  useQuery,
  useMutation,
  useQueryClient,
  skipToken,
} from '@tanstack/react-query'
import type { Deployment, CreateDeploymentRequest } from '../lib/api'
import { deploymentAPI } from '../lib/api'

// Query keys for cache management
export const deploymentKeys = {
  all: ['deployments'] as const,
  lists: () => [...deploymentKeys.all, 'list'] as const,
  list: (filters: string) => [...deploymentKeys.lists(), { filters }] as const,
  details: () => [...deploymentKeys.all, 'detail'] as const,
  detail: (id: string) => [...deploymentKeys.details(), id] as const,
}

// Hook to list all deployments
export function useDeployments() {
  return useQuery({
    queryKey: deploymentKeys.lists(),
    queryFn: () => deploymentAPI.listDeployments(),
  })
}

// Hook to get a single deployment
export function useDeployment(id: string | null) {
  return useQuery({
    queryKey: deploymentKeys.detail(id ?? ''),
    queryFn: id ? () => deploymentAPI.getDeployment(id) : skipToken,
    enabled: !!id,
  })
}

// Hook to create a new deployment
export function useCreateDeployment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: CreateDeploymentRequest) =>
      deploymentAPI.createDeployment(request),
    onSuccess: (newDeployment) => {
      // Update the deployments list with new data
      queryClient.setQueryData(
        deploymentKeys.lists(),
        (old: Deployment[] = []) => [newDeployment, ...old],
      )
      // Also cache the individual deployment
      queryClient.setQueryData(
        deploymentKeys.detail(newDeployment.id),
        newDeployment,
      )
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: deploymentKeys.lists() })
    },
  })
}

// Hook to delete a deployment
export function useDeleteDeployment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deploymentAPI.deleteDeployment(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: deploymentKeys.detail(deletedId) })
      // Invalidate list to refresh
      queryClient.invalidateQueries({ queryKey: deploymentKeys.lists() })
    },
  })
}

// Hook for deployment logs (uses SSE)
export function useDeploymentLogs(deploymentId: string | null) {
  return {
    subscribe: (
      onLog: (log: string) => void,
      onError?: (error: Event) => void,
    ) => {
      if (!deploymentId) return () => {}
      return deploymentAPI.subscribeToLogs(deploymentId, onLog, onError)
    },
  }
}

// Hook to refresh deployments list
export function useRefreshDeployments() {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({ queryKey: deploymentKeys.lists() })
}
