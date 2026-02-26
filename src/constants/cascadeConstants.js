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
// A small topology to showcase the cascade failure effect out-of-the-box.
export const DEMO_NODES = [
  {
    id: 'gateway',
    type: 'cascade',
    position: { x: 430, y: 0 },
    data: { title: 'API Gateway', subtitle: 'Load Balancer', icon: '🌐' },
    width: 200,
    height: 90,
  },
  {
    id: 'auth',
    type: 'cascade',
    position: { x: 160, y: 200 },
    data: { title: 'Auth Service', subtitle: 'OAuth 2.0', icon: '🔐' },
    width: 200,
    height: 90,
  },
  {
    id: 'user-svc',
    type: 'cascade',
    position: { x: 700, y: 200 },
    data: { title: 'User Service', subtitle: 'PostgreSQL', icon: '👤' },
    width: 200,
    height: 90,
  },
  {
    id: 'cache',
    type: 'cascade',
    position: { x: 160, y: 420 },
    data: { title: 'Redis Cache', subtitle: 'In-Memory Store', icon: '⚡' },
    width: 200,
    height: 90,
  },
  {
    id: 'db-primary',
    type: 'cascade',
    position: { x: 700, y: 420 },
    data: { title: 'DB Primary', subtitle: 'PostgreSQL Master', icon: '🗄️' },
    width: 200,
    height: 90,
  },
  {
    id: 'queue',
    type: 'cascade',
    position: { x: 430, y: 420 },
    data: { title: 'Message Queue', subtitle: 'RabbitMQ', icon: '📨' },
    width: 200,
    height: 90,
  },
  {
    id: 'worker',
    type: 'cascade',
    position: { x: 430, y: 640 },
    data: { title: 'Worker Pool', subtitle: 'Background Jobs', icon: '⚙️' },
    width: 200,
    height: 90,
  },
  {
    id: 'monitor',
    type: 'cascade',
    position: { x: 160, y: 640 },
    data: { title: 'Monitoring', subtitle: 'Prometheus + Grafana', icon: '📊' },
    width: 200,
    height: 90,
  },
];

export const DEMO_EDGES = [
  { id: 'e-gw-auth', source: 'gateway', target: 'auth', type: 'cascade' },
  { id: 'e-gw-user', source: 'gateway', target: 'user-svc', type: 'cascade' },
  { id: 'e-auth-cache', source: 'auth', target: 'cache', type: 'cascade' },
  { id: 'e-auth-queue', source: 'auth', target: 'queue', type: 'cascade' },
  { id: 'e-user-db', source: 'user-svc', target: 'db-primary', type: 'cascade' },
  { id: 'e-user-queue', source: 'user-svc', target: 'queue', type: 'cascade' },
  { id: 'e-queue-worker', source: 'queue', target: 'worker', type: 'cascade' },
  { id: 'e-cache-monitor', source: 'cache', target: 'monitor', type: 'cascade' },
];

/**
 * A pre-built cascade timeline where:
 *  - DB Primary crashes first (the "origin")
 *  - Error spreads back through user-svc and queue
 *  - Eventually gateway goes offline + screen shake
 */
export const DEMO_TIMELINE_EVENTS = [
  // Phase 1 — Origin failure: DB Primary
  { frame: 60,  type: EVENT_TYPE.NODE_STATE, targetId: 'db-primary', status: NODE_STATUS.WARNING },
  { frame: 90,  type: EVENT_TYPE.NODE_STATE, targetId: 'db-primary', status: NODE_STATUS.ERROR },
  { frame: 90,  type: EVENT_TYPE.EDGE_FLOW,  targetId: 'e-user-db',  variant: EDGE_VARIANT.DANGER },

  // Phase 2 — Propagation: User Service & Queue
  { frame: 120, type: EVENT_TYPE.NODE_STATE, targetId: 'user-svc',   status: NODE_STATUS.WARNING },
  { frame: 120, type: EVENT_TYPE.EDGE_FLOW,  targetId: 'e-user-queue', variant: EDGE_VARIANT.DANGER },
  { frame: 150, type: EVENT_TYPE.NODE_STATE, targetId: 'user-svc',   status: NODE_STATUS.ERROR },
  { frame: 150, type: EVENT_TYPE.NODE_STATE, targetId: 'queue',      status: NODE_STATUS.WARNING },
  { frame: 150, type: EVENT_TYPE.EDGE_FLOW,  targetId: 'e-gw-user',  variant: EDGE_VARIANT.DANGER },

  // Phase 3 — Cascade deepens
  { frame: 180, type: EVENT_TYPE.NODE_STATE, targetId: 'queue',      status: NODE_STATUS.ERROR },
  { frame: 180, type: EVENT_TYPE.EDGE_FLOW,  targetId: 'e-queue-worker', variant: EDGE_VARIANT.DANGER },
  { frame: 180, type: EVENT_TYPE.EDGE_FLOW,  targetId: 'e-auth-queue',   variant: EDGE_VARIANT.DANGER },
  { frame: 210, type: EVENT_TYPE.NODE_STATE, targetId: 'worker',     status: NODE_STATUS.ERROR },
  { frame: 210, type: EVENT_TYPE.NODE_STATE, targetId: 'auth',       status: NODE_STATUS.WARNING },

  // Phase 4 — Auth & Cache collapse
  { frame: 240, type: EVENT_TYPE.NODE_STATE, targetId: 'auth',       status: NODE_STATUS.ERROR },
  { frame: 240, type: EVENT_TYPE.EDGE_FLOW,  targetId: 'e-gw-auth',  variant: EDGE_VARIANT.DANGER },
  { frame: 240, type: EVENT_TYPE.EDGE_FLOW,  targetId: 'e-auth-cache', variant: EDGE_VARIANT.DANGER },
  { frame: 270, type: EVENT_TYPE.NODE_STATE, targetId: 'cache',      status: NODE_STATUS.ERROR },
  { frame: 270, type: EVENT_TYPE.EDGE_FLOW,  targetId: 'e-cache-monitor', variant: EDGE_VARIANT.DANGER },

  // Phase 5 — Total system failure
  { frame: 300, type: EVENT_TYPE.NODE_STATE, targetId: 'gateway',    status: NODE_STATUS.ERROR },
  { frame: 300, type: EVENT_TYPE.NODE_STATE, targetId: 'monitor',    status: NODE_STATUS.WARNING },
  { frame: 330, type: EVENT_TYPE.NODE_STATE, targetId: 'monitor',    status: NODE_STATUS.ERROR },

  // Phase 6 — Global FX: system meltdown
  { frame: 340, type: EVENT_TYPE.GLOBAL_FX,  effect: GLOBAL_FX.SCREEN_SHAKE },
  { frame: 380, type: EVENT_TYPE.GLOBAL_FX,  effect: GLOBAL_FX.GLITCH },

  // Phase 7 — Nodes go offline one by one
  { frame: 400, type: EVENT_TYPE.NODE_STATE, targetId: 'db-primary', status: NODE_STATUS.OFFLINE },
  { frame: 410, type: EVENT_TYPE.NODE_STATE, targetId: 'user-svc',   status: NODE_STATUS.OFFLINE },
  { frame: 420, type: EVENT_TYPE.NODE_STATE, targetId: 'queue',      status: NODE_STATUS.OFFLINE },
  { frame: 430, type: EVENT_TYPE.NODE_STATE, targetId: 'worker',     status: NODE_STATUS.OFFLINE },
  { frame: 440, type: EVENT_TYPE.NODE_STATE, targetId: 'auth',       status: NODE_STATUS.OFFLINE },
  { frame: 450, type: EVENT_TYPE.NODE_STATE, targetId: 'cache',      status: NODE_STATUS.OFFLINE },
  { frame: 460, type: EVENT_TYPE.NODE_STATE, targetId: 'gateway',    status: NODE_STATUS.OFFLINE },
  { frame: 470, type: EVENT_TYPE.NODE_STATE, targetId: 'monitor',    status: NODE_STATUS.OFFLINE },
  // Phase 8 — Blackout CTA punchline
  { frame: 490, type: EVENT_TYPE.GLOBAL_FX, effect: GLOBAL_FX.BLACKOUT_CTA },];

export const DEMO_CAMERA_SEQUENCE = [
  // Wide establishing shot — auto-centered via fitView
  { frame: 0, fitView: true, zoom: 0.4, easing: 'smooth' },
  // Zoom into DB Primary (origin of failure)
  { frame: 50,  targetNodeId: 'db-primary', zoom: 1.6, easing: 'smooth' },
  { frame: 110, targetNodeId: 'db-primary', zoom: 1.6, easing: 'smooth' },
  // Whip-pan to User Service
  { frame: 140, targetNodeId: 'user-svc', zoom: 1.5, easing: 'snap' },
  // Pan to Queue
  { frame: 175, targetNodeId: 'queue', zoom: 1.4, easing: 'snap' },
  // Pan to Worker
  { frame: 205, targetNodeId: 'worker', zoom: 1.5, easing: 'snap' },
  // Pan to Auth
  { frame: 235, targetNodeId: 'auth', zoom: 1.5, easing: 'snap' },
  // Pan to Cache
  { frame: 265, targetNodeId: 'cache', zoom: 1.5, easing: 'snap' },
  // Pull back to Gateway  
  { frame: 295, targetNodeId: 'gateway', zoom: 1.4, easing: 'snap' },
  // Wide shot for the meltdown — auto-centered via fitView
  { frame: 330, fitView: true, zoom: 0.5, easing: 'slow' },
  // Hold wide for screen shake — auto-centered via fitView
  { frame: 480, fitView: true, zoom: 0.45, easing: 'slow' },
];
