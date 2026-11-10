import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';
import './index.css';

// Prevent native mobile browser / WebView pull-to-refresh and handle smooth upward scroll
let touchStartY = 0;
let lastTouchY = 0;

window.addEventListener(
  'touchstart',
  e => {
    if (e.touches.length === 1) {
      touchStartY = e.touches[0].clientY;
      lastTouchY = e.touches[0].clientY;
    }
  },
  { passive: true }
);

window.addEventListener(
  'touchmove',
  e => {
    if (e.touches.length !== 1) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - lastTouchY;
    lastTouchY = currentY;

    // Detect if finger moved DOWN (which on Android WebView triggers the pull-to-refresh spinner)
    if (deltaY > 0 || currentY - touchStartY > 5) {
      let target = e.target as HTMLElement | null;
      let scrollableContainer: HTMLElement | null = null;

      while (target && target !== document.body && target !== document.documentElement) {
        const style = window.getComputedStyle(target);
        if (
          (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
          target.scrollHeight > target.clientHeight
        ) {
          scrollableContainer = target;
          break;
        }
        target = target.parentElement;
      }

      if (!scrollableContainer) {
        const main = document.querySelector('main');
        if (main && main.scrollHeight > main.clientHeight) {
          scrollableContainer = main;
        }
      }

      if (scrollableContainer) {
        if (scrollableContainer.scrollTop > 0) {
          // The user is at the bottom or scrolled down and wants to scroll back UP.
          // Adjust scrollTop directly and prevent default so Android WebView's
          // SwipeRefreshLayout never intercepts the touch to show the refresh circle!
          scrollableContainer.scrollTop = Math.max(0, scrollableContainer.scrollTop - deltaY);
          if (e.cancelable) {
            e.preventDefault();
          }
        } else {
          // Already at top: cancel downward pull so the refresh circle never triggers
          if (e.cancelable) {
            e.preventDefault();
          }
        }
      } else {
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
