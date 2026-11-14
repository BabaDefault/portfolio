import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './ui/ui.css';
import './hud/hud.css';

// The 3D elytra world is the default. The original 2D site is still at ?classic.
const FlyMode = lazy(() => import('./world/FlyMode'));
const params = new URLSearchParams(window.location.search);
// Phones get the classic site until the 3D world has touch controls (?fly forces 3D anyway).
const phone = window.matchMedia('(pointer: coarse)').matches && Math.min(window.innerWidth, window.innerHeight) < 700;
const fly = params.has('fly') || (!params.has('classic') && !phone);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {fly ? (
      <Suspense fallback={null}>
        <FlyMode />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
