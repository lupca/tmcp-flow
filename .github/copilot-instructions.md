Project snapshot
- React + React Flow presentation (src/components/ArgoK3dFlow.jsx)
- Remotion for programmatic video rendering (src/remotion/RemotionRoot.jsx)
- Express server that bundles & renders Remotion compositions (server/server.js)

What an AI coding agent should know (concise)
- Big picture: the app is an interactive editor (frontend) that sends serializable `inputProps` to a Node server which bundles the Remotion composition and renders MP4s. The presentation component is pure/prop-driven so the same code runs in the browser and inside Remotion.
- Key files:
  - src/components/ArgoK3dFlow.jsx — presentation + viewport/keyframe interpolation (look here for camera behavior)
  - src/remotion/RemotionRoot.jsx — registered composition; calculateMetadata reads renderWidth/renderHeight/renderDuration from inputProps
  - src/App.jsx — UI/editor; where client-side camera keyframes are stored and POSTed to /api/render
  - server/server.js — bundles composition and calls Remotion renderer; uses inputProps.cameraSequence (client can override)
  - server/data/scenarios.json & scripts/render-cli.ts — examples and CLI bulk renders

Camera / framing specifics (important for this feature request)
- cameraSequence shape (accepted by ArgoK3dFlow and Remotion):
  [ { frame: 0, x: 0, y: 0, zoom: 0.8 }, { frame: 60, targetNodeId: 'source-code', zoom: 1.5 }, ... ]
- semantics:
  - If `targetNodeId` is provided, ArgoK3dFlow computes x/y from that node's center.
  - Otherwise use numeric x/y (React Flow coordinate system) and `zoom` (scale multiplier).
  - Frames are absolute (frame number inside the composition).
- Where to change behavior: modify `processedKeyframes` / interpolation in `src/components/ArgoK3dFlow.jsx`.

Developer workflows / commands
- Frontend dev: npm run dev
- Full dev (frontend + server + Remotion bundle): npm run dev:full
- Export from UI: click "Export MP4" — frontend POSTs to /api/render
- Health/bundle check: GET /api/health
- CLI bulk render (uses scenarios.json): node scripts/render-cli.ts

Project-specific conventions
- Presentation components are pure and must accept all render-time inputs via props (no DOM refs in inputProps).
- Keep any render-affecting state serializable (primitive arrays/objects only).
- Use `targetNodeId` rather than hard-coded x/y when possible so server-side renders remain robust across layout changes.

If you implement camera-editing features
- Update `src/App.jsx` (persist cameraSequence, UI to add/edit keyframes) and pass cameraSequence to ArgoK3dFlow and to /api/render payload.
- Ensure `server/server.js` pulls cameraSequence from request body (it already prefers req.body.cameraSequence).
- Add unit/visual regression checks by doing a quick export (npm run dev:full → Export MP4) and verify camera motion.

Common troubleshooting
- "Render failed: Server is still bundling" — wait for pre-bundle to finish or re-run npm run dev:full
- InputProps must be JSON-serializable — functions/DOM nodes will break rendering
- Coordinate mismatch — remember ArgoK3dFlow computes x,y relative to React Flow layout; prefer targetNodeId for node‑focused shots

Ask me to expand any part of this file or to add examples/tests for camera editing UI.