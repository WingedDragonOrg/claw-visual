import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/main.css';

const savedTheme = localStorage.getItem('claw-theme');
if (savedTheme === 'light') {
  // Theme managed by PixiApp.setTheme()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
