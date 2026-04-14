import { notifyWarning } from '@/utils/toast'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions {
    method?: HttpMethod
    body?: unknown
    token?: string | null
    credentials?: RequestCredentials
    baseUrl?: string
}

type ValidationErrorPayload = {
    errors?: Record<string, string[]>
}

const getBaseUrl = () => {
    const raw = import.meta.env.VITE_API_BASE_URL as string
    return raw?.replace(/\/$/, '') ?? ''
}

const getAuthMode = () => {
    return (import.meta.env.VITE_AUTH_MODE as 'token' | 'cookie' | undefined) ?? 'token'
}

export const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
    const baseUrl = options.baseUrl === undefined ? getBaseUrl() : options.baseUrl.replace(/\/$/, '')
    const url = `${baseUrl}${path}`
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
    const headers: Record<string, string> = {
        Accept: 'application/json',
    }

    if (!isFormData) {
        headers['Content-Type'] = 'application/json'
    }

    if (options.token) {
        headers.Authorization = `Bearer ${options.token}`
    }

    const response = await fetch(url, {
        method: options.method ?? 'GET',
        headers,
        body: options.body
            ? isFormData
                ? (options.body as FormData)
                : JSON.stringify(options.body)
            : undefined,
        credentials: options.credentials ?? (getAuthMode() === 'cookie' ? 'include' : 'omit'),
    })

    const text = await response.text()
    let data: unknown = {}
    if (text) {
        try {
            data = JSON.parse(text)
        } catch {
            data = {}
        }
    }

    if (!response.ok) {
        if (response.status === 422) {
            const validation = data as ValidationErrorPayload
            if (validation?.errors && Object.keys(validation.errors).length > 0) {
                notifyWarning('Revisa los datos ingresados.')
            }
        }
        const errorPayload =
            data && typeof data === 'object'
                ? { ...(data as Record<string, unknown>), statusCode: response.status }
                : { statusCode: response.status }
        throw errorPayload
    }

    return data as T
}
