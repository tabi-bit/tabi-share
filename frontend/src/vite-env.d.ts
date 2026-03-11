/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV: 'production' | 'staging' | 'local';
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module '*.scss' {
  const content: Record<string, string>;
  export default content;
}
