import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DecksPage } from './pages/DecksPage';
import { DeckDetailPage } from './pages/DeckDetailPage';
import { CardEditorPage } from './pages/CardEditorPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DecksPage />} />
          <Route path="deck/:deckId" element={<DeckDetailPage />} />
          <Route
            path="deck/:deckId/card/:cardId"
            element={<CardEditorPage />}
          />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
