/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_I18N?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
