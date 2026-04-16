import { request } from '@/services/http'

export type FlowHealthMetric = {
  label: string
  score: number
  errors_24h: number
  trend_percent: number
  hint: string
}

export type TopFailingEndpoint = {
  method: string
  url: string
  incidents: number
  last_seen_at: string | null
}

export type RecentError = {
  id: number
  message: string
  method: string
  url: string
  status_code: number | null
  exception_class: string
  trace_id: string | null
  request_id: string | null
  occurred_at: string | null
}

export type FlowHealthPayload = {
  generated_at?: string
  overview?: {
    errors_24h?: number
    errors_7d?: number
    status_401_24h?: number
    status_403_24h?: number
    status_5xx_24h?: number
  }
  health?: FlowHealthMetric[]
  top_failing_endpoints?: TopFailingEndpoint[]
  recent_errors?: RecentError[]
}

type FlowHealthResponse = {
  data?: FlowHealthPayload
}

const OBSERVABILITY_ENDPOINT = '/master/observability/flow-health'

export const getFlowHealth = async (): Promise<FlowHealthPayload> => {
  const payload = await request<FlowHealthResponse>(OBSERVABILITY_ENDPOINT)
  return payload?.data ?? {}
}
