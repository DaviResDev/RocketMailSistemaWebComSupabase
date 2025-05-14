
/// <reference types="vite/client" />

// Add extended File interface to support URL property
interface CustomFile extends File {
  url?: string;
}
