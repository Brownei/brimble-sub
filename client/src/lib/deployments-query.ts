import { useQuery } from '@tanstack/react-query'
import { apiRequest, type LogEntry } from './api'

export type DeploymentStatus =
  | 'pending'
  | 'building'
  | 'deploying'
  | 'running'
  | 'failed'

export interface Deployment {
  id: number
  uuid: string
  name: string
  git_url: string | null
  branch: string
  status: DeploymentStatus
  image_tag: string
  live_url: string
  port: number
  error: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

async function getListOfDeployments() {
  const { data } = await apiRequest<Deployment[]>({
    route: '/deployments',
    method: 'GET',
  })

  return data
}

async function getLogs(deploymentUUID: string) {
  const { data } = await apiRequest<LogEntry[]>({
    route: `/deployments/${deploymentUUID}/logs`,
    method: 'GET',
  })

  return data
}

export function useGetLogs(deploymentUUID: string) {
  return useQuery({
    queryKey: ['logs', deploymentUUID],
    queryFn: () => getLogs(deploymentUUID),
  })
}

export function useGetListOfDeployments() {
  return useQuery({
    queryKey: ['deployments'],
    queryFn: getListOfDeployments,
  })
}
