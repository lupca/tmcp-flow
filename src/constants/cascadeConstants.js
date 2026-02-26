/**
 * Cascade Failure — Constants, enums, color palette & demo scenario.
 *
 * This module is the single source of truth for the Cascade Failure VFX
 * system.  Every new node/edge/scene component imports from here so the
 * visual language stays consistent.
 */

// ── Status / variant / FX enums ──────────────────────────────────────
export const NODE_STATUS = {
  NORMAL: 'normal',
  WARNING: 'warning',
  ERROR: 'error',
  OFFLINE: 'offline',
};

export const EDGE_VARIANT = {
  NORMAL: 'normal',
  DANGER: 'danger',
};

export const GLOBAL_FX = {
  SCREEN_SHAKE: 'screen_shake',
  GLITCH: 'glitch',
  BLACKOUT_CTA: 'blackout_cta',
};

export const EVENT_TYPE = {
  NODE_STATE: 'NODE_STATE',
  EDGE_FLOW: 'EDGE_FLOW',
  GLOBAL_FX: 'GLOBAL_FX',
};

// ── Cyberpunk color palette ──────────────────────────────────────────
export const COLORS = {
  // Normal state
  CYAN_NEON: '#00FFFF',
  CYAN_DIM: 'rgba(0, 255, 255, 0.15)',
  CYAN_GLOW: 'rgba(0, 255, 255, 0.35)',

  // Warning state
  YELLOW_WARNING: '#FFD600',
  YELLOW_DIM: 'rgba(255, 214, 0, 0.15)',
  YELLOW_GLOW: 'rgba(255, 214, 0, 0.5)',

  // Error state
  RED_NEON: '#FF003C',
  RED_DIM: 'rgba(255, 0, 60, 0.2)',
  RED_GLOW: 'rgba(255, 0, 60, 0.8)',

  // Offline state
  GREY_OFFLINE: '#3A3A3A',
  GREY_DIM: 'rgba(58, 58, 58, 0.3)',

  // Surfaces
  SURFACE_DARK: '#0D1117',
  SURFACE_CANVAS: '#0B0F19',
  BORDER_DIM: 'rgba(255, 255, 255, 0.08)',
};

// ── Cascade Auto-Director defaults ───────────────────────────────────
export const CASCADE_DEFAULTS = {
  INITIAL_DELAY: 90,        // frames for setup phase: healthy system pause (3 seconds)
  FIRST_NODE_PAUSE: 45,     // frames to hold on origin node after first failure (1.5 seconds)
  SPREAD_DELAY: 30,         // frames between node infection hops (particle animation carries the drama)
  WARNING_DURATION: 45,     // frames a node stays in WARNING before ERROR
  HOLD_PER_NODE: 50,        // frames camera holds on each infected node (1.67 seconds)
  CAMERA_ZOOM: 1.5,         // zoom level when tracking infected node
  CAMERA_ZOOM_WIDE: 0.4,    // wide establishing/closing shot zoom
  PAN_FRAMES: 35,           // base frames for camera pan transition (slow, deliberate)
  SCREEN_SHAKE_DELAY: 45,   // frames after last infection before shake
};

// ── Demo scenario ────────────────────────────────────────────────────
// A pristine Microservices + DevSecOps architecture with a zero-day cascade.
export const DEMO_NODES = [
  {
    id: 'api-gateway',
    type: 'cascade',
    position: { x: 440, y: 40 },
    data: { title: 'API Gateway', subtitle: 'Edge Routing', icon: '🌐' },
    width: 210,
    height: 90,
  },
  {
    id: 'legacy-auth',
    type: 'cascade',
    position: { x: 140, y: 220 },
    data: { title: 'Legacy Auth', subtitle: 'Outdated SSO', icon: '🔓' },
    width: 210,
    height: 90,
  },
  {
    id: 'user-db',
    type: 'cascade',
    position: { x: 740, y: 220 },
    data: { title: 'User Database', subtitle: 'PII Vault', icon: '🗃️' },
    width: 210,
    height: 90,
  },
  {
    id: 'payment-gateway',
    type: 'cascade',
    position: { x: 740, y: 420 },
    data: { title: 'Payment Gateway', subtitle: 'Card Processing', icon: '💳' },
    width: 210,
    height: 90,
  },
  {
    id: 'ledger-db',
    type: 'cascade',
    position: { x: 740, y: 620 },
    data: { title: 'Ledger Database', subtitle: 'Transactions', icon: '📒' },
    width: 210,
    height: 90,
  },
  {
    id: 'fraud-svc',
    type: 'cascade',
    position: { x: 440, y: 520 },
    data: { title: 'Fraud Service', subtitle: 'Risk Scoring', icon: '🧪' },
    width: 210,
    height: 90,
  },
  {
    id: 'secrets-vault',
    type: 'cascade',
    position: { x: 140, y: 420 },
    data: { title: 'Secrets Vault', subtitle: 'KMS + Tokens', icon: '🔑' },
    width: 210,
    height: 90,
  },
  {
    id: 'devsecops',
    type: 'cascade',
    position: { x: 140, y: 620 },
    data: { title: 'DevSecOps', subtitle: 'CI/CD Guardrails', icon: '🛡️' },
    width: 210,
    height: 90,
  },
  {
    id: 'security-scanner',
    type: 'cascade',
    position: { x: 440, y: 740 },
    data: { title: 'Security Scanner', subtitle: 'SAST/DAST', icon: '🧯' },
    width: 210,
    height: 90,
  },
  {
    id: 'observability',
    type: 'cascade',
    position: { x: 740, y: 740 },
    data: { title: 'Observability', subtitle: 'SIEM + Traces', icon: '📊' },
    width: 210,
    height: 90,
  },
];

export const DEMO_EDGES = [
  { id: 'e-gw-auth', source: 'api-gateway', target: 'legacy-auth', type: 'cascade' },
  { id: 'e-gw-user', source: 'api-gateway', target: 'user-db', type: 'cascade' },
  { id: 'e-auth-user', source: 'legacy-auth', target: 'user-db', type: 'cascade' },
  { id: 'e-auth-vault', source: 'legacy-auth', target: 'secrets-vault', type: 'cascade' },
  { id: 'e-user-pay', source: 'user-db', target: 'payment-gateway', type: 'cascade' },
  { id: 'e-pay-ledger', source: 'payment-gateway', target: 'ledger-db', type: 'cascade' },
  { id: 'e-pay-fraud', source: 'payment-gateway', target: 'fraud-svc', type: 'cascade' },
  { id: 'e-fraud-observe', source: 'fraud-svc', target: 'observability', type: 'cascade' },
  { id: 'e-ledger-observe', source: 'ledger-db', target: 'observability', type: 'cascade' },
  { id: 'e-devsec-scan', source: 'devsecops', target: 'security-scanner', type: 'cascade' },
  { id: 'e-scan-gw', source: 'security-scanner', target: 'api-gateway', type: 'cascade' },
];

/**
 * A pre-built cascade timeline where:
 *  - Legacy Auth is breached first (the zero-day origin)
 *  - Infection bypasses the gateway, hits User DB, then Payment Gateway
 *  - The system collapses into a full data breach + blackout
 */
export const DEMO_TIMELINE_EVENTS = [
  // Phase 1 — Origin failure: Legacy Auth
  { frame: 120, type: EVENT_TYPE.NODE_STATE, targetId: 'legacy-auth', status: NODE_STATUS.WARNING },
  { frame: 180, type: EVENT_TYPE.NODE_STATE, targetId: 'legacy-auth', status: NODE_STATUS.ERROR },
  { frame: 180, type: EVENT_TYPE.EDGE_FLOW, targetId: 'e-auth-user', variant: EDGE_VARIANT.DANGER },
  { frame: 180, type: EVENT_TYPE.EDGE_FLOW, targetId: 'e-auth-vault', variant: EDGE_VARIANT.DANGER },

  // Phase 2 — User DB compromise
  { frame: 240, type: EVENT_TYPE.NODE_STATE, targetId: 'user-db', status: NODE_STATUS.WARNING },
  { frame: 300, type: EVENT_TYPE.NODE_STATE, targetId: 'user-db', status: NODE_STATUS.ERROR },
  { frame: 300, type: EVENT_TYPE.EDGE_FLOW, targetId: 'e-user-pay', variant: EDGE_VARIANT.DANGER },

  // Phase 3 — Secrets Vault & Payment escalation
  { frame: 240, type: EVENT_TYPE.NODE_STATE, targetId: 'secrets-vault', status: NODE_STATUS.WARNING },
  { frame: 300, type: EVENT_TYPE.NODE_STATE, targetId: 'secrets-vault', status: NODE_STATUS.ERROR },
  { frame: 330, type: EVENT_TYPE.NODE_STATE, targetId: 'payment-gateway', status: NODE_STATUS.WARNING },
  { frame: 390, type: EVENT_TYPE.NODE_STATE, targetId: 'payment-gateway', status: NODE_STATUS.ERROR },
  { frame: 390, type: EVENT_TYPE.EDGE_FLOW, targetId: 'e-pay-ledger', variant: EDGE_VARIANT.DANGER },
  { frame: 390, type: EVENT_TYPE.EDGE_FLOW, targetId: 'e-pay-fraud', variant: EDGE_VARIANT.DANGER },

  // Phase 4 — Ledger + Fraud collapse
  { frame: 450, type: EVENT_TYPE.NODE_STATE, targetId: 'ledger-db', status: NODE_STATUS.WARNING },
  { frame: 510, type: EVENT_TYPE.NODE_STATE, targetId: 'ledger-db', status: NODE_STATUS.ERROR },
  { frame: 465, type: EVENT_TYPE.NODE_STATE, targetId: 'fraud-svc', status: NODE_STATUS.WARNING },
  { frame: 525, type: EVENT_TYPE.NODE_STATE, targetId: 'fraud-svc', status: NODE_STATUS.ERROR },
  { frame: 525, type: EVENT_TYPE.EDGE_FLOW, targetId: 'e-fraud-observe', variant: EDGE_VARIANT.DANGER },
  { frame: 525, type: EVENT_TYPE.EDGE_FLOW, targetId: 'e-ledger-observe', variant: EDGE_VARIANT.DANGER },

  // Phase 5 — Gateway & Observability fail late
  { frame: 540, type: EVENT_TYPE.NODE_STATE, targetId: 'api-gateway', status: NODE_STATUS.WARNING },
  { frame: 600, type: EVENT_TYPE.NODE_STATE, targetId: 'api-gateway', status: NODE_STATUS.ERROR },
  { frame: 600, type: EVENT_TYPE.NODE_STATE, targetId: 'observability', status: NODE_STATUS.WARNING },
  { frame: 660, type: EVENT_TYPE.NODE_STATE, targetId: 'observability', status: NODE_STATUS.ERROR },

  // Phase 6 — Global FX: system meltdown
  { frame: 690, type: EVENT_TYPE.GLOBAL_FX, effect: GLOBAL_FX.SCREEN_SHAKE },
  { frame: 750, type: EVENT_TYPE.GLOBAL_FX, effect: GLOBAL_FX.GLITCH },

  // Phase 7 — Nodes go offline one by one
  { frame: 810, type: EVENT_TYPE.NODE_STATE, targetId: 'legacy-auth', status: NODE_STATUS.OFFLINE },
  { frame: 822, type: EVENT_TYPE.NODE_STATE, targetId: 'user-db', status: NODE_STATUS.OFFLINE },
  { frame: 834, type: EVENT_TYPE.NODE_STATE, targetId: 'payment-gateway', status: NODE_STATUS.OFFLINE },
  { frame: 846, type: EVENT_TYPE.NODE_STATE, targetId: 'ledger-db', status: NODE_STATUS.OFFLINE },
  { frame: 858, type: EVENT_TYPE.NODE_STATE, targetId: 'fraud-svc', status: NODE_STATUS.OFFLINE },
  { frame: 870, type: EVENT_TYPE.NODE_STATE, targetId: 'secrets-vault', status: NODE_STATUS.OFFLINE },
  { frame: 882, type: EVENT_TYPE.NODE_STATE, targetId: 'api-gateway', status: NODE_STATUS.OFFLINE },
  { frame: 894, type: EVENT_TYPE.NODE_STATE, targetId: 'observability', status: NODE_STATUS.OFFLINE },
  { frame: 906, type: EVENT_TYPE.NODE_STATE, targetId: 'devsecops', status: NODE_STATUS.OFFLINE },
  { frame: 918, type: EVENT_TYPE.NODE_STATE, targetId: 'security-scanner', status: NODE_STATUS.OFFLINE },

  // Phase 8 — Blackout CTA punchline
  { frame: 960, type: EVENT_TYPE.GLOBAL_FX, effect: GLOBAL_FX.BLACKOUT_CTA },
];

export const DEMO_CAMERA_SEQUENCE = [
  // Wide establishing shot — auto-centered via fitView
  { frame: 0, fitView: true, zoom: 0.38, easing: 'smooth' },
  // Zoom into Legacy Auth (origin of failure)
  { frame: 110, targetNodeId: 'legacy-auth', zoom: 1.55, easing: 'slow' },
  { frame: 210, targetNodeId: 'legacy-auth', zoom: 1.55, easing: 'slow' },
  // Track the breach into User DB
  { frame: 260, targetNodeId: 'user-db', zoom: 1.55, easing: 'slow' },
  { frame: 340, targetNodeId: 'user-db', zoom: 1.55, easing: 'slow' },
  // Payment gateway escalation
  { frame: 370, targetNodeId: 'payment-gateway', zoom: 1.5, easing: 'slow' },
  { frame: 460, targetNodeId: 'payment-gateway', zoom: 1.5, easing: 'slow' },
  // Ledger + Fraud collapse
  { frame: 490, targetNodeId: 'ledger-db', zoom: 1.45, easing: 'slow' },
  { frame: 550, targetNodeId: 'fraud-svc', zoom: 1.45, easing: 'slow' },
  // Gateway finally fails
  { frame: 610, targetNodeId: 'api-gateway', zoom: 1.4, easing: 'slow' },
  // Observability goes dark
  { frame: 670, targetNodeId: 'observability', zoom: 1.4, easing: 'slow' },
  // Wide shot for the meltdown — auto-centered via fitView
  { frame: 720, fitView: true, zoom: 0.42, easing: 'slow' },
  // Hold wide for blackout
  { frame: 960, fitView: true, zoom: 0.4, easing: 'slow' },
];
