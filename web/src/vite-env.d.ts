/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_MAP_STYLE_URL?: string;
  readonly VITE_MAP_STYLE_DARK_URL?: string;
  readonly VITE_SHARE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
