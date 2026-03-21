import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TeamOverview } from './pages/TeamOverview';
import { ChannelView } from './pages/ChannelView';
import { AgentDetail } from './pages/AgentDetail';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<TeamOverview />} />
            <Route path="channels" element={<ChannelView />} />
            <Route path="agents/:id" element={<AgentDetail />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
