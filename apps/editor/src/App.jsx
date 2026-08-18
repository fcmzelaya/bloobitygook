import { useState } from "react";
import { Stage } from "./components/Stage.jsx";
import { Toolbar } from "./components/Toolbar.jsx";
import { Inspector } from "./components/Inspector.jsx";
import { GamesPanel } from "./components/GamesPanel.jsx";
import { WizardPanel } from "./components/WizardPanel.jsx";
import { CloudAuthProvider } from "./CloudAuthContext.jsx";

export function App() {
  const [gamesVisible, setGamesVisible] = useState(false);
  const [wizardVisible, setWizardVisible] = useState(false);

  return (
    <CloudAuthProvider>
      <Stage />
      <Toolbar onToggleGames={() => setGamesVisible((v) => !v)} onToggleWizard={() => setWizardVisible((v) => !v)} />
      <GamesPanel visible={gamesVisible} />
      <WizardPanel visible={wizardVisible} />
      <Inspector />
    </CloudAuthProvider>
  );
}
