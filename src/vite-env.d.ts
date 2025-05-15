
/// <reference types="vite/client" />

// Add extended File interface to support URL property and additional information
interface CustomFile extends File {
  url?: string;
  content?: string;
  path?: string;
  filename?: string;
  contentType?: string;
}
