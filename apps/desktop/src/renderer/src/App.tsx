import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DecksPage } from './pages/DecksPage';
import { DeckDetailPage } from './pages/DeckDetailPage';
import { CardEditorPage } from './pages/CardEditorPage';
import { SettingsPage } from './pages/SettingsPage';
import { SprintReviewPage } from './pages/SprintReviewPage';
import { SprintCompletePage } from './pages/SprintCompletePage';

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
        {/* Sprint routes outside Layout (full-screen experience) */}
        <Route path="sprint/:sprintId" element={<SprintReviewPage />} />
        <Route
          path="sprint/:sprintId/complete"
          element={<SprintCompletePage />}
        />
      </Routes>
    </HashRouter>
  );
}

export default App;
