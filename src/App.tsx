import React from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
// TODO(mefly-nav): using local stub until the upstream package ships dist.
import { useHostSync, MeflyNavReceiver } from './stubs/mefly-nav';
import TracksBuilderPage from './pages/TracksBuilderPage';
import useParentWindowSync from './hooks/useParentWindowSync';
import './App.css';

const TRUSTED_ORIGINS = ['https://mefly.dev', 'https://www.mefly.dev'];

function AppShell() {
  useHostSync(TRUSTED_ORIGINS);
  useParentWindowSync(TRUSTED_ORIGINS);

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<TracksBuilderPage />} />
        <Route path="/tracks/*" element={<TracksBuilderPage />} />
      </Routes>

      <MeflyNavReceiver
        trustedOrigins={TRUSTED_ORIGINS}
        activationMode="hover"
        style={{
          left: '1rem',
          bottom: '1rem',
          '--mefly-nav-trigger-size': '2.15rem',
          '--mefly-nav-trigger-bg': 'rgba(255, 252, 245, 0.92)',
          '--mefly-nav-trigger-bg-hover': 'rgba(240, 236, 226, 0.97)',
          '--mefly-nav-trigger-color': '#403929',
          '--mefly-nav-trigger-border': '1px solid #d8cfbf',
          '--mefly-nav-trigger-shadow': '0 8px 20px rgba(31, 41, 51, 0.12)',
          '--mefly-nav-trigger-hover-transform': 'translateY(-1px)',
        } as React.CSSProperties}
      />
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  );
}

export default App;
