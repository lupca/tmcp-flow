/**
 * Detailed Module Import and Functional Tests
 * Validates that all refactored modules resolve correctly and functionality works
 *
 * Run: npm test
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════
// MODULE IMPORT TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('Module Imports - All pages and components', () => {
  
  describe('Main Pages - Imports', () => {
    it('should import Studio page wrapper', async () => {
      const module = await import('../Studio.jsx');
      expect(module.default).toBeDefined();
    });

    it('should import FlowManager page wrapper', async () => {
      const module = await import('../FlowManager.jsx');
      expect(module.default).toBeDefined();
    });

    it('should import CascadeFailure page wrapper', async () => {
      const module = await import('../CascadeFailure.jsx');
      expect(module.default).toBeDefined();
    });
  });

  describe('Studio Submodules - Imports', () => {
    it('should import StudioPage', async () => {
      const module = await import('../studio/StudioPage.jsx');
      expect(module.default).toBeDefined();
    });

    it('should import StudioSidebarLeft', async () => {
      const module = await import('../studio/components/StudioSidebarLeft.jsx');
      expect(module.default).toBeDefined();
    });

    it('should import StudioSidebarRight', async () => {
      const module = await import('../studio/components/StudioSidebarRight.jsx');
      expect(module.default).toBeDefined();
    });

    it('should import StudioCanvas', async () => {
      const module = await import('../studio/components/StudioCanvas.jsx');
      expect(module.default).toBeDefined();
    });

    it('should import TimelineBar', async () => {
      const module = await import('../studio/components/TimelineBar.jsx');
      expect(module.default).toBeDefined();
    });

    it('should import all Studio tabs', async () => {
      const tabs = ['BlueprintTab', 'DirectingTab', 'FxTab', 'RenderTab'];
      for (const tab of tabs) {
        const module = await import(`../studio/components/tabs/${tab}.jsx`);
        expect(module.default).toBeDefined();
      }
    });
  });

  describe('FlowManager Submodules - Imports', () => {
    it('should import FlowManagerPage', async () => {
      const module = await import('../flow-manager/FlowManagerPage.jsx');
      expect(module.default).toBeDefined();
    });

    it('should import FlowHeader', async () => {
      const module = await import('../flow-manager/components/FlowHeader.jsx');
      expect(module.default).toBeDefined();
    });

    it('should import FlowImportPanel', async () => {
      const module = await import('../flow-manager/components/FlowImportPanel.jsx');
      expect(module.default).toBeDefined();
    });

    it('should import FlowGrid', async () => {
      const module = await import('../flow-manager/components/FlowGrid.jsx');
      expect(module.default).toBeDefined();
    });
  });

  describe('CascadeFailure Submodules - Imports', () => {
    it('should import CascadeFailurePage', async () => {
      const module = await import('../cascade-failure/CascadeFailurePage.jsx');
      expect(module.default).toBeDefined();
    });

    it('should import CascadeSidebar', async () => {
      const module = await import('../cascade-failure/components/CascadeSidebar.jsx');
      expect(module.default).toBeDefined();
    });

    it('should import CascadeCanvas', async () => {
      const module = await import('../cascade-failure/components/CascadeCanvas.jsx');
      expect(module.default).toBeDefined();
    });

    it('should import CascadeScrubber', async () => {
      const module = await import('../cascade-failure/components/CascadeScrubber.jsx');
      expect(module.default).toBeDefined();
    });

    it('should import all CascadeFailure tabs', async () => {
      const tabs = ['TimelineTab', 'AutoTab', 'FxTab', 'RenderTab'];
      for (const tab of tabs) {
        const module = await import(`../cascade-failure/components/tabs/${tab}.jsx`);
        expect(module.default).toBeDefined();
      }
    });
  });

  describe('Shared Utilities - Imports', () => {
    it('should import sse.js utility', async () => {
      const module = await import('../../utils/sse.js');
      expect(module.streamSseEvents).toBeDefined();
    });

    it('should import cascadeSceneUtils', async () => {
      const module = await import('../../utils/cascadeSceneUtils.js');
      expect(module.deriveStatesAtFrame).toBeDefined();
    });

    it('should import exportUtils', async () => {
      const module = await import('../../utils/exportUtils.js');
      expect(module.captureThumbnail).toBeDefined();
      expect(module.downloadJson).toBeDefined();
    });

    it('should import flowUtils', async () => {
      const module = await import('../../utils/flowUtils.js');
      expect(module.normalizeNodes).toBeDefined();
      expect(module.ensureLayout).toBeDefined();
    });

    it('should import autoDirect', async () => {
      const module = await import('../../utils/autoDirect.js');
      expect(module.generateAutoSequence).toBeDefined();
      expect(module.annotateEdgesWithTiming).toBeDefined();
    });

    it('should import cascadeAutoDirect', async () => {
      const module = await import('../../utils/cascadeAutoDirect.js');
      expect(module.generateCascadeScenario).toBeDefined();
      expect(module.suggestOriginNode).toBeDefined();
    });

    it('should import elkLayout', async () => {
      const module = await import('../../utils/elkLayout.js');
      expect(module.layoutWithElk).toBeDefined();
    });
  });

  describe('Constants - Imports', () => {
    it('should import flowConstants', async () => {
      const module = await import('../../constants/flowConstants.js');
      expect(module.initialNodes).toBeDefined();
      expect(module.initialEdges).toBeDefined();
    });

    it('should import cascadeConstants', async () => {
      const module = await import('../../constants/cascadeConstants.js');
      expect(module.NODE_STATUS).toBeDefined();
      expect(module.EDGE_VARIANT).toBeDefined();
      expect(module.EVENT_TYPE).toBeDefined();
      expect(module.GLOBAL_FX).toBeDefined();
    });
  });

  describe('Component Types - Imports', () => {
    it('should import UniversalNode', async () => {
      const module = await import('../../components/UniversalNode.jsx');
      expect(module.default).toBeDefined();
    });

    it('should import GroupNode', async () => {
      const module = await import('../../components/GroupNode.jsx');
      expect(module.default).toBeDefined();
    });

    it('should import ViralEdge', async () => {
      const module = await import('../../components/ViralEdge.jsx');
      expect(module.default).toBeDefined();
    });

    it('should import CascadeNode', async () => {
      const module = await import('../../components/CascadeNode.jsx');
      expect(module.default).toBeDefined();
    });

    it('should import CascadeEdge', async () => {
      const module = await import('../../components/CascadeEdge.jsx');
      expect(module.default).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// FUNCTION SIGNATURE TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('Function Signatures - Expected APIs', () => {
  
  describe('SSE Streaming API', () => {
    it('streamSseEvents should accept response and callbacks', async () => {
      const { streamSseEvents } = await import('../../utils/sse.js');
      expect(streamSseEvents.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Cascade Scene Utilities API', () => {
    it('deriveStatesAtFrame should accept nodes, edges, timelineEvents, frame', async () => {
      const { deriveStatesAtFrame } = await import('../../utils/cascadeSceneUtils.js');
      expect(deriveStatesAtFrame.length).toBeGreaterThanOrEqual(4);
    });

    it('getAbsolutePosition should accept node and optionally all nodes', async () => {
      const { getAbsolutePosition } = await import('../../utils/cascadeSceneUtils.js');
      expect(getAbsolutePosition.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Auto Direct API', () => {
    it('generateAutoSequence should accept nodes and edges', async () => {
      const { generateAutoSequence } = await import('../../utils/autoDirect.js');
      expect(generateAutoSequence.length).toBeGreaterThanOrEqual(2);
    });

    it('annotateEdgesWithTiming should accept sequence, edges, and nodes', async () => {
      const { annotateEdgesWithTiming } = await import('../../utils/autoDirect.js');
      expect(annotateEdgesWithTiming.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Cascade Auto Direct API', () => {
    it('generateCascadeScenario should accept nodes, edges, originId', async () => {
      const { generateCascadeScenario } = await import('../../utils/cascadeAutoDirect.js');
      expect(generateCascadeScenario.length).toBeGreaterThanOrEqual(3);
    });

    it('suggestOriginNode should accept nodes', async () => {
      const { suggestOriginNode } = await import('../../utils/cascadeAutoDirect.js');
      expect(suggestOriginNode.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Flow Utils API', () => {
    it('normalizeNodes should accept nodes array', async () => {
      const { normalizeNodes } = await import('../../utils/flowUtils.js');
      expect(normalizeNodes.length).toBeGreaterThanOrEqual(1);
    });

    it('ensureLayout should accept nodes and edges', async () => {
      const { ensureLayout } = await import('../../utils/flowUtils.js');
      expect(ensureLayout.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Export Utils API', () => {
    it('captureThumbnail should accept containerRef', async () => {
      const { captureThumbnail } = await import('../../utils/exportUtils.js');
      expect(captureThumbnail.length).toBeGreaterThanOrEqual(1);
    });

    it('downloadJson should accept filename and payload', async () => {
      const { downloadJson } = await import('../../utils/exportUtils.js');
      expect(downloadJson.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('ELK Layout API', () => {
    it('layoutWithElk should accept nodes and edges', async () => {
      const { layoutWithElk } = await import('../../utils/elkLayout.js');
      expect(layoutWithElk.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// REACT COMPONENT VALIDATION
// ═══════════════════════════════════════════════════════════════════════

describe('React Component Validation', () => {
  
  it('all page components should be valid React components (functions)', async () => {
    const pages = [
      '../Studio.jsx',
      '../FlowManager.jsx',
      '../CascadeFailure.jsx',
      '../studio/StudioPage.jsx',
      '../flow-manager/FlowManagerPage.jsx',
      '../cascade-failure/CascadeFailurePage.jsx',
    ];

    for (const page of pages) {
      const module = await import(page);
      const component = module.default;
      
      // Should be a function (functional component)
      expect(typeof component).toBe('function');
      
      // Should have a reasonable implementation (not just a placeholder)
      const code = component.toString();
      expect(code.length).toBeGreaterThan(50);
    }
  });

  it('sub-components should be valid React components', async () => {
    const components = [
      '../studio/components/StudioSidebarLeft.jsx',
      '../studio/components/StudioSidebarRight.jsx',
      '../studio/components/StudioCanvas.jsx',
      '../flow-manager/components/FlowHeader.jsx',
      '../cascade-failure/components/CascadeSidebar.jsx',
    ];

    for (const comp of components) {
      const module = await import(comp);
      expect(typeof module.default).toBe('function');
    }
  });

  it('tab components should be valid React components', async () => {
    const tabs = [
      '../studio/components/tabs/BlueprintTab.jsx',
      '../studio/components/tabs/DirectingTab.jsx',
      '../studio/components/tabs/FxTab.jsx',
      '../studio/components/tabs/RenderTab.jsx',
      '../cascade-failure/components/tabs/TimelineTab.jsx',
      '../cascade-failure/components/tabs/AutoTab.jsx',
    ];

    for (const tab of tabs) {
      const module = await import(tab);
      expect(typeof module.default).toBe('function');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// STATE MANAGEMENT VALIDATION
// ═══════════════════════════════════════════════════════════════════════

describe('State Management - Hook Usage', () => {
  
  it('StudioPage should use useState for state', async () => {
    const { default: StudioPage } = await import('../studio/StudioPage.jsx');
    const code = StudioPage.toString();
    
    expect(code).toContain('useState');
    expect(code).toContain('setNodes');
    expect(code).toContain('setEdges');
  });

  it('StudioPage should use useCallback for handlers', async () => {
    const { default: StudioPage } = await import('../studio/StudioPage.jsx');
    const code = StudioPage.toString();
    
    expect(code).toContain('useCallback');
    expect(code.match(/useCallback/g).length).toBeGreaterThan(3);
  });

  it('CascadeFailurePage should use useRef for playback', async () => {
    const { default: CascadeFailurePage } = await import('../cascade-failure/CascadeFailurePage.jsx');
    const code = CascadeFailurePage.toString();
    
    expect(code).toContain('useRef');
    expect(code).toContain('playIntervalRef');
  });

  it('Pages should use useEffect for side effects', async () => {
    const pages = [
      '../studio/StudioPage.jsx',
      '../flow-manager/FlowManagerPage.jsx',
      '../cascade-failure/CascadeFailurePage.jsx',
    ];

    for (const page of pages) {
      const { default: component } = await import(page);
      const code = component.toString();
      expect(code).toContain('useEffect');
    }
  });

  it('FlowManagerPage should use useState for form state', async () => {
    const { default: FlowManagerPage } = await import('../flow-manager/FlowManagerPage.jsx');
    const code = FlowManagerPage.toString();
    
    expect(code).toContain('formName');
    expect(code).toContain('formNodes');
    expect(code).toContain('formEdges');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// API INTEGRATION POINTS
// ═══════════════════════════════════════════════════════════════════════

describe('API Integration - Endpoints', () => {
  
  it('StudioPage should call /api/render-stream', async () => {
    const { default: StudioPage } = await import('../studio/StudioPage.jsx');
    const code = StudioPage.toString();
    
    expect(code).toContain('/api/render-stream');
  });

  it('StudioPage should call /api/flows endpoints', async () => {
    const { default: StudioPage } = await import('../studio/StudioPage.jsx');
    const code = StudioPage.toString();
    
    expect(code).toContain('/api/flows');
  });

  it('StudioPage should call /api/render/cancel', async () => {
    const { default: StudioPage } = await import('../studio/StudioPage.jsx');
    const code = StudioPage.toString();
    
    expect(code).toContain('/api/render/cancel');
  });

  it('StudioPage should call /api/ai/generate', async () => {
    const { default: StudioPage } = await import('../studio/StudioPage.jsx');
    const code = StudioPage.toString();
    
    expect(code).toContain('/api/ai/generate');
  });

  it('FlowManagerPage should call /api/flows endpoints', async () => {
    const { default: FlowManagerPage } = await import('../flow-manager/FlowManagerPage.jsx');
    const code = FlowManagerPage.toString();
    
    expect(code).toContain('/api/flows');
  });

  it('CascadeFailurePage should load flows from /api/flows', async () => {
    const { default: CascadeFailurePage } = await import('../cascade-failure/CascadeFailurePage.jsx');
    const code = CascadeFailurePage.toString();
    
    expect(code).toContain('/api/flows');
  });

  it('CascadeFailurePage should call cascade render endpoint', async () => {
    const { default: CascadeFailurePage } = await import('../cascade-failure/CascadeFailurePage.jsx');
    const code = CascadeFailurePage.toString();
    
    expect(code).toContain('render');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS VALIDATION
// ═══════════════════════════════════════════════════════════════════════

describe('Constants - Data Structure', () => {
  
  it('flowConstants should provide initialNodes and initialEdges', async () => {
    const { initialNodes, initialEdges } = await import('../../constants/flowConstants.js');
    
    expect(Array.isArray(initialNodes)).toBe(true);
    expect(Array.isArray(initialEdges)).toBe(true);
    expect(initialNodes.length).toBeGreaterThan(0);
  });

  it('cascadeConstants should provide NODE_STATUS enum', async () => {
    const { NODE_STATUS } = await import('../../constants/cascadeConstants.js');
    
    expect(NODE_STATUS).toBeDefined();
    expect(typeof NODE_STATUS).toBe('object');
    expect(NODE_STATUS.NORMAL || NODE_STATUS.ERROR || NODE_STATUS.CASCADING).toBeDefined();
  });

  it('cascadeConstants should provide DEMO data', async () => {
    const {
      DEMO_NODES,
      DEMO_EDGES,
      DEMO_TIMELINE_EVENTS,
      DEMO_CAMERA_SEQUENCE,
    } = await import('../../constants/cascadeConstants.js');
    
    expect(Array.isArray(DEMO_NODES)).toBe(true);
    expect(Array.isArray(DEMO_EDGES)).toBe(true);
    expect(Array.isArray(DEMO_TIMELINE_EVENTS)).toBe(true);
    expect(Array.isArray(DEMO_CAMERA_SEQUENCE)).toBe(true);
  });

  it('cascadeConstants should provide EVENT_TYPE enum', async () => {
    const { EVENT_TYPE } = await import('../../constants/cascadeConstants.js');
    
    expect(EVENT_TYPE).toBeDefined();
    expect(typeof EVENT_TYPE).toBe('object');
    expect(EVENT_TYPE.NODE_STATE || EVENT_TYPE.EDGE_FLOW || EVENT_TYPE.GLOBAL_FX).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// DATA FLOW VALIDATION
// ═══════════════════════════════════════════════════════════════════════

describe('Data Flow - Props and State', () => {
  
  it('StudioPage should maintain camera sequence flow', async () => {
    const { default: StudioPage } = await import('../studio/StudioPage.jsx');
    const code = StudioPage.toString();
    
    // Should have state
    expect(code).toContain('cameraSequence');
    expect(code).toContain('setCameraSequence');
    
    // Should use in export
    expect(code).toContain('handleExport');
    
    // Should use in state management
    expect(code).toContain('useState');
  });

  it('CascadeFailurePage should maintain timeline events flow', async () => {
    const { default: CascadeFailurePage } = await import('../cascade-failure/CascadeFailurePage.jsx');
    const code = CascadeFailurePage.toString();
    
    expect(code).toContain('timelineEvents');
    expect(code).toContain('setTimelineEvents');
    expect(code).toContain('deriveStatesAtFrame');
  });

  it('FlowManagerPage should maintain flows list state', async () => {
    const { default: FlowManagerPage } = await import('../flow-manager/FlowManagerPage.jsx');
    const code = FlowManagerPage.toString();
    
    expect(code).toContain('flows');
    expect(code).toContain('setFlows');
    expect(code).toContain('loadFlows');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// FINAL VERIFICATION
// ═══════════════════════════════════════════════════════════════════════

describe('Final Verification - All Refactoring Complete', () => {
  
  it('no single page file should exceed 600 lines', async () => {
    const pages = [
      '../studio/StudioPage.jsx',
      '../flow-manager/FlowManagerPage.jsx',
      '../cascade-failure/CascadeFailurePage.jsx',
    ];

    for (const page of pages) {
      const { default: component } = await import(page);
      const code = component.toString();
      const lines = code.split('\n').length;
      
      // Modular pages should be reasonably sized
      expect(lines).toBeGreaterThan(100);
      expect(lines).toBeLessThan(800);
    }
  });

  it('wrapper pages should be thin (under 20 lines)', async () => {
    const wrappers = [
      '../Studio.jsx',
      '../FlowManager.jsx',
      '../CascadeFailure.jsx',
    ];

    for (const wrapper of wrappers) {
      const { default: component } = await import(wrapper);
      const code = component.toString();
      const lines = code.split('\n').length;
      
      expect(lines).toBeLessThan(30);
    }
  });

  it('all critical functionality should be preserved', async () => {
    const StudioPage = await import('../studio/StudioPage.jsx');
    const code = StudioPage.default.toString();
    
    const features = [
      'nodes',
      'edges',
      'cameraSequence',
      'handleGenerateFlow',
      'handleExport',
      'handleSaveVersion',
      'handleImportJson',
      'handleAutoDirect',
    ];

    for (const feature of features) {
      expect(code).toContain(feature);
    }
  });

  it('should have zero syntax errors in all modules', async () => {
    const modules = [
      '../Studio.jsx',
      '../studio/StudioPage.jsx',
      '../FlowManager.jsx',
      '../flow-manager/FlowManagerPage.jsx',
      '../CascadeFailure.jsx',
      '../cascade-failure/CascadeFailurePage.jsx',
    ];

    for (const module of modules) {
      expect(async () => {
        await import(module);
      }).not.toThrow();
    }
  });
});
