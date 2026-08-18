import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";

// Deliberately not wrapped in <StrictMode> — Stage's mount effect drives
// a real, non-idempotent boot sequence (fetch the default scene, start
// the physics loop), and engine.js only guards against being initialized
// once, not against StrictMode's intentional double-invoke-then-discard
// dance. Revisit if this app grows enough other React-only logic to make
// StrictMode's extra checks worth reintroducing that guard for.
createRoot(document.getElementById("root")).render(<App />);
