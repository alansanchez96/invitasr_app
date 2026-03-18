/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_BO_ROUTE_PREFIX: string
  readonly VITE_AUTH_MODE?: 'token' | 'cookie'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
