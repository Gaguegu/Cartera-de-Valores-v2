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
    const deltaY = currentY - touchStartY;

    // Solo intervenir cuando el arrastre es hacia abajo (dirección del pull-to-refresh)
    if (deltaY > 0) {
      const target = e.target as HTMLElement | null;
      const scrollable = target?.closest('.overflow-y-auto, aside, [data-scrollable]') as HTMLElement | null;

      // Si el toque es dentro de un contenedor desplazable (como la barra lateral o modal) y ya tiene scroll:
      // permitir subir libremente sin bloquear el gesto
      if (scrollable) {
        if (scrollable.scrollTop > 0) {
          return;
        }
        if (e.cancelable && deltaY > 10) {
          e.preventDefault();
        }
        return;
      }

      const mainEl = document.querySelector('main');
      const isAtTop = window.scrollY <= 0 && (!mainEl || mainEl.scrollTop <= 0);

      if (isAtTop && deltaY > 10) {
        if (e.cancelable) {
          e.preventDefault();
        }
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
