import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { TeamOverview } from './pages/TeamOverview';
import { ChannelView } from './pages/ChannelView';
import { AgentDetail } from './pages/AgentDetail';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<TeamOverview />} />
          <Route path="channels" element={<ChannelView />} />
          <Route path="agents/:id" element={<AgentDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
