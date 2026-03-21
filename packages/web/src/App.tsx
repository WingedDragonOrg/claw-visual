import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TeamProvider } from './components/TeamContext';
import { ThresholdsProvider } from './context/ThresholdsContext';
import { TeamOverview } from './pages/TeamOverview';
import { ChannelView } from './pages/ChannelView';
import { AgentDetail } from './pages/AgentDetail';
import { SettingsPage } from './pages/SettingsPage';
import { lazy, Suspense } from 'react';
const PixelOffice = lazy(() => import('./pages/PixelOffice').then(m => ({ default: m.PixelOffice })));

export function App() {
  return (
    <ErrorBoundary>
      <TeamProvider>
        <ThresholdsProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<TeamOverview />} />
              <Route path="channels" element={<ChannelView />} />
              <Route path="agents/:id" element={<AgentDetail />} />
              <Route path="pixel" element={<Suspense fallback={<div className="loading">加载像素引擎…</div>}><PixelOffice /></Suspense>} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        </ThresholdsProvider>
      </TeamProvider>
    </ErrorBoundary>
  );
}
