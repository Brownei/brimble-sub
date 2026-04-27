// services/api.ts
import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  AxiosError,
  type Method,
} from 'axios'

// Types
export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'OPTIONS'
  | 'HEAD'

export interface ApiRequestConfig {
  route: string
  method: HttpMethod
  body?: any
  params?: Record<string, any>
  headers?: Record<string, string>
  timeout?: number
  responseType?:
    | 'json'
    | 'text'
    | 'blob'
    | 'arraybuffer'
    | 'document'
    | 'stream'
}

export interface ApiResponse<T = any> {
  data: T
  status: number
  message: string
  success: boolean
}

export interface ApiError {
  message: string
  status: number
  data?: any
}

// Base configuration
export const BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3333/v1'
const DEFAULT_TIMEOUT = 30000

// Create axios instance with default config
const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Response interceptor
axiosInstance.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Response] ${response.config.url}`, response.data)
    }
    return response
  },
  (error: AxiosError) => {
    const apiError: ApiError = {
      message: error.message,
      status: error.response?.status || 500,
      data: error.response?.data,
    }

    // Handle specific error codes
    if (error.response?.status === 401) {
      // window.location.href = '/login';
    } else if (error.response?.status === 403) {
      console.error('Forbidden access')
    } else if (error.response?.status === 404) {
      console.error('Resource not found')
    } else if (error.response?.status === 500) {
      console.error('Server error')
    }

    console.error('[API Response Error]', apiError)
    return Promise.reject(apiError)
  },
)

// Main API function - Fixed headers handling
export async function apiRequest<T = any>(
  config: ApiRequestConfig,
): Promise<ApiResponse<T>> {
  try {
    const axiosConfig: AxiosRequestConfig = {
      method: config.method.toLowerCase() as Method,
      url: config.route,
      data: config.body,
      params: config.params,
      timeout: config.timeout || DEFAULT_TIMEOUT,
      responseType: config.responseType || 'json',
    }

    // Handle headers properly for newer Axios
    if (config.headers) {
      axiosConfig.headers = config.headers as any
    }

    const response: AxiosResponse<T> = await axiosInstance(axiosConfig)

    return {
      data: response.data,
      status: response.status,
      message: 'Request successful',
      success: true,
    }
  } catch (error) {
    const apiError = error as ApiError
    return {
      data: null as any,
      status: apiError.status || 500,
      message: apiError.message || 'Request failed',
      success: false,
    }
  }
}

export interface LogEntry {
  id?: number;
  deployment_id?: number;
  message: string;
  stream: 'stdout' | 'stderr';
  timestamp: string;
}

// SSE Event Types
export type EventType = 'log' | 'status'

export interface LogEventData {
  message: string;
  stream: 'stdout' | 'stderr';
}

export interface StatusData {
  status: 'pending' | 'building' | 'deploying' | 'running' | 'failed';
  live_url?: string;
  error?: string;
}

export interface StreamEvent {
  type: EventType;
  timestamp: string;
  log?: LogEventData;
  status?: StatusData;
}

export interface GitDeployRequest {
  name: string
  git_url: string
  branch: string
  port: number
}

// export const deploymentApi = {
//   list: () => api.get<Deployment[]>('/deployments'),
//
//   get: (uuid: string) => api.get<Deployment>(`/deployments/${uuid}`),
//
//   createFromGit: (data: GitDeployRequest) =>
//     api.post<Deployment>('/deployments/git', data),
//
//   createFromUpload: (formData: FormData) => {
//     return apiRequest<Deployment>({
//       route: '/deployments/upload',
//       method: 'POST',
//       body: formData,
//       headers: {
//         'Content-Type': 'multipart/form-data',
//       },
//     })
//   },
//
//   delete: (uuid: string) => api.delete(`/deployments/${uuid}`),
//
//   getLogs: (uuid: string) => api.get<LogEntry[]>(`/deployments/${uuid}/logs`),
//
//   getLogStreamUrl: (uuid: string) =>
//     `${BASE_URL}/deployments/${uuid}/logs/stream`,
// }

// Subscribe to deployment logs via Server-Sent Events
export function subscribeToLogs(
  deploymentId: string,
  onLog: (log: string) => void,
  onError?: (error: Event) => void,
): () => void {
  const eventSource = new EventSource(
    `${BASE_URL}/deployments/${deploymentId}/logs`,
  )

  eventSource.onmessage = (event) => {
    onLog(event.data)
  }

  eventSource.onerror = (error) => {
    console.error('SSE error:', error)
    onError?.(error)
  }

  // Return unsubscribe function
  return () => {
    eventSource.close()
  }
}
