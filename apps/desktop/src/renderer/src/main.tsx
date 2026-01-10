import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import App from './App';
import { initializeApiClient } from './lib/api';
import './styles.css';

// Initialize API client before rendering
initializeApiClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Theme
        accentColor="blue"
        grayColor="slate"
        radius="medium"
        scaling="100%"
        panelBackground="solid"
      >
        <App />
      </Theme>
    </ThemeProvider>
  </React.StrictMode>,
);
