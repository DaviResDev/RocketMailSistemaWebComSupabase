
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Garantir que o documento tenha direção LTR
document.documentElement.setAttribute('dir', 'ltr');
document.documentElement.setAttribute('lang', 'pt-BR');

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(
    <App />
  );
} else {
  console.error("Root element not found");
}
