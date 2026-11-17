/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_I18N?: string;
  readonly VITE_ENABLE_VENUE_MAP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
