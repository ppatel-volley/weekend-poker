/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_URL: string
  readonly VITE_PLATFORM_SDK_STAGE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
