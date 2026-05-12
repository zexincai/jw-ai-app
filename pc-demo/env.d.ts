/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENCLAW_WS_URL: string
  readonly VITE_OPENCLAW_TOKEN: string
  readonly VITE_BUSINESS_SYSTEM_ORIGIN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
