import React from 'react';
import { HashRouter } from 'react-router-dom';
import { useHostSync, MeflyNavReceiver } from 'mefly-nav';
import 'mefly-nav/style.css';
import underConstruction from './assets/under-construction.svg';
import './App.css';

const TRUSTED_ORIGINS = ['https://mefly.dev', 'https://www.mefly.dev'];

function AppShell() {
  useHostSync(TRUSTED_ORIGINS);

  return (
    <div className="app-shell">
      <img
        src={underConstruction}
        alt="Under construction"
        className="under-construction"
      />

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
