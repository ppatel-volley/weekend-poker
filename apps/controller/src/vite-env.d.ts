/// <reference types="vite/client" />

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_SERVER_URL: string
  readonly VITE_GAME_ID: string
  readonly VITE_PLATFORM_SDK_STAGE: 'local' | 'test' | 'dev' | 'staging' | 'production'
  readonly VITE_SEGMENT_WRITE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
