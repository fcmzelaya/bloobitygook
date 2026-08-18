import { useEffect, useRef } from "react";
import { initEngine, handleStagePointerDown } from "../engine.js";

// The SVG stage's contents (balls) are driven imperatively by engine.js's
// physics loop, not React — this component just mounts the shell and
// hands off refs. React never re-renders #world's children, since
// nothing in this JSX describes them.
export function Stage() {
  const stageRef = useRef(null);
  const worldRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    initEngine({ stageEl: stageRef.current, worldEl: worldRef.current, gravityMarkerEl: markerRef.current });
  }, []);

  return (
    <svg
      id="stage"
      ref={stageRef}
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid meet"
      onPointerDown={(e) => handleStagePointerDown(e.clientX, e.clientY)}
    >
      <rect x="0" y="0" width="800" height="600" fill="#1a1f2b" />
      <rect id="floor" x="0" y="560" width="800" height="40" fill="#232a39" />
      <g id="world" ref={worldRef}></g>
      <g id="gravity-marker" ref={markerRef} style={{ display: "none" }}>
        <circle r="6" fill="none" stroke="#e0d15e" strokeWidth="2" />
        <line x1="-10" y1="0" x2="10" y2="0" stroke="#e0d15e" strokeWidth="1" />
        <line x1="0" y1="-10" x2="0" y2="10" stroke="#e0d15e" strokeWidth="1" />
      </g>
    </svg>
  );
}
