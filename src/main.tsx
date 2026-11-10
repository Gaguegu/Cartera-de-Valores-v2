import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';
import './index.css';

// Prevent pull-to-refresh reload circle only when at the very top (scrollY <= 0)
// Never mutate scroll manually so native GPU momentum scrolling stays 100% smooth
let touchStartY = 0;

window.addEventListener(
  'touchstart',
  e => {
    if (e.touches.length === 1) {
      touchStartY = e.touches[0].clientY;
    }
  },
  { passive: true }
);

window.addEventListener(
  'touchmove',
  e => {
    if (e.touches.length !== 1) return;
    const currentY = e.touches[0].clientY;
    const isAtTop = window.scrollY <= 0 && (document.querySelector('main')?.scrollTop ?? 0) <= 0;

    // Only block downward drag if ALREADY at the very top of the screen to suppress pull-to-refresh
    if (isAtTop && currentY - touchStartY > 10) {
      if (e.cancelable) {
        e.preventDefault();
      }
    }
  },
  { passive: false }
);

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
