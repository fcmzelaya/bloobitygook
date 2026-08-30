import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import { AppHeader } from "./components/AppHeader.jsx";
import { WizardPanel } from "./components/WizardPanel.jsx";
import { Dashboard } from "./routes/Dashboard.jsx";
import { GameEditorRoute } from "./routes/GameEditor.jsx";
import { Archetypes } from "./routes/Archetypes.jsx";
import { CloudAuthProvider } from "./CloudAuthContext.jsx";

export function App() {
  const [wizardVisible, setWizardVisible] = useState(false);

  return (
    <BrowserRouter>
      <CloudAuthProvider>
        <AppHeader onOpenWizard={() => setWizardVisible((v) => !v)} />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/archetypes" element={<Archetypes />} />
          <Route path="/:gameId" element={<GameEditorRoute />} />
        </Routes>
        <WizardPanel visible={wizardVisible} />
      </CloudAuthProvider>
    </BrowserRouter>
  );
}
