
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Add aliases for ProseMirror modules that TipTap depends on
      "@tiptap/pm/model": "prosemirror-model",
      "@tiptap/pm/state": "prosemirror-state",
      "@tiptap/pm/view": "prosemirror-view",
      "@tiptap/pm/transform": "prosemirror-transform",
      "@tiptap/pm/keymap": "prosemirror-keymap",
      "@tiptap/pm/commands": "prosemirror-commands",
      "@tiptap/pm/schema-list": "prosemirror-schema-list",
      "@tiptap/pm/gapcursor": "prosemirror-gapcursor", // Add this new alias
    },
  },
  optimizeDeps: {
    include: [
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@tiptap/extension-link',
      '@tiptap/extension-image',
      '@tiptap/extension-placeholder',
      '@tiptap/extension-text-align',
      '@tiptap/extension-underline',
      'prosemirror-model',
      'prosemirror-state',
      'prosemirror-view',
      'prosemirror-transform',
      'prosemirror-keymap',
      'prosemirror-commands',
      'prosemirror-schema-list',
      'prosemirror-gapcursor', // Add this dependency to be included
    ],
  },
}));
