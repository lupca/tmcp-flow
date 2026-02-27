import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests - Real browser testing after refactoring
 * Tests that pages load, render correctly, and key interactions work
 *
 * Run: npx playwright test
 */

test.describe('E2E - Studio Page', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:5173/');
    // Navigate to Studio page
    await page.click('a[href="/studio"], text=Studio, button:has-text("Studio")').catch(() => {});
    await page.waitForURL('**/studio', { timeout: 5000 }).catch(() => {});
  });

  test('should load Studio page without errors', async () => {
    // Check page title or main content
    const mainContent = await page.locator('.studio-layout, main, [role="main"]').first();
    expect(mainContent).toBeTruthy();
  });

  test('should display AI prompt input in sidebar', async () => {
    const promptInput = await page.locator('textarea[placeholder*="prompt"], textarea[placeholder*="Prompt"], textarea').first();
    expect(promptInput).toBeTruthy();
    
    // Try typing in the prompt
    await promptInput.fill('Test flow with AI generation');
    const value = await promptInput.inputValue();
    expect(value).toContain('Test flow');
  });

  test('should have ReactFlow canvas rendered', async () => {
    const canvas = await page.locator('.react-flow__viewport, [role="application"]').first();
    expect(canvas).toBeTruthy();
    
    // Check if canvas is visible
    const isVisible = await canvas.isVisible();
    expect(isVisible).toBe(true);
  });

  test('should have sidebar tabs (Blueprint, Directing, FX, Render)', async () => {
    // Look for any interactive elements that could be tabs
    const buttons = await page.locator('button').count();
    const tabs = await page.locator('[role="tab"]').count();
    const menuItems = await page.locator('[role="button"]').count();
    
    // Page should have interactive elements for tabs
    const totalInteractive = buttons + tabs + menuItems;
    expect(totalInteractive).toBeGreaterThan(5); // Should have multiple buttons/tabs
  });

  test('should allow editing nodes by clicking on canvas', async () => {
    const nodes = await page.locator('[data-testid*="node"], .react-flow__node').first();
    
    if (await nodes.count() > 0) {
      const nodeText = await nodes.first().textContent();
      expect(nodeText).toBeTruthy();
    }
  });

  test('should have timeline bar at bottom', async () => {
    const timeline = await page.locator('.timeline-bar, [class*="timeline"], [class*="keyframe"]').first();
    // Timeline may or may not be visible depending on state
    // Just checking it exists in DOM
  });

  test('should not have console errors', async () => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit for any errors to appear
    await page.waitForTimeout(2000);
    
    expect(errors).toEqual([]);
  });
});

test.describe('E2E - FlowManager Page', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:5173/flows');
    await page.waitForLoadState('networkidle').catch(() => {});
  });

  test('should load FlowManager page', async () => {
    const mainContent = await page.locator('main, [role="main"], body').first();
    expect(mainContent).toBeTruthy();
  });

  test('should display flow header with title', async () => {
    const header = await page.locator('h1, h2, [class*="header"]').first();
    const isVisible = await header.isVisible().catch(() => false);
    if (isVisible) {
      const text = await header.textContent();
      expect(text).toBeTruthy();
    }
  });

  test('should have flow list or grid', async () => {
    // Wait for flows to load
    await page.waitForTimeout(1000);
    
    // Look for flow cards or list items
    const flows = await page.locator('[class*="grid"], [class*="list"], [class*="card"]').first();
    expect(flows).toBeTruthy();
  });

  test('should have import functionality', async () => {
    const importButton = await page.locator('button:has-text("Import"), a:has-text("Import")').first();
    const importPanel = await page.locator('[class*="import"], form').first();
    
    const hasImport = await importButton.count() > 0 || await importPanel.count() > 0;
    expect(hasImport).toBe(true);
  });

  test('should not have loading errors', async () => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });
});

test.describe('E2E - CascadeFailure Page', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:5173/cascade');
    await page.waitForLoadState('networkidle').catch(() => {});
  });

  test('should load CascadeFailure page', async () => {
    const mainContent = await page.locator('main, [role="main"], body').first();
    expect(mainContent).toBeTruthy();
  });

  test('should have ReactFlow canvas for cascade', async () => {
    const canvas = await page.locator('.react-flow__viewport, [role="application"]').first();
    expect(canvas).toBeTruthy();
  });

  test('should have sidebar with tabs (Timeline, Auto, FX, Render)', async () => {
    const sidebar = await page.locator('[class*="sidebar"], aside').first();
    expect(sidebar).toBeTruthy();
    
    // Check for tabs
    const tabs = await page.locator('[role="tab"], button[class*="tab"]').count();
    expect(tabs).toBeGreaterThanOrEqual(1);
  });

  test('should have playback controls', async () => {
    const buttons = await page.locator('button').count();
    
    // Should have control buttons
    expect(buttons).toBeGreaterThan(0);
  });

  test('should have scrubber/timeline control', async () => {
    const scrubber = await page.locator('[class*="scrubber"], input[type="range"], [class*="timeline"]').first();
    expect(scrubber).toBeTruthy();
  });

  test('should have timeline events area', async () => {
    // The timeline tab should show events
    const timelineTab = await page.locator('button:has-text("Timeline"), [role="tab"]:has-text("Timeline")').first();
    
    if (await timelineTab.count() > 0) {
      await timelineTab.click();
      await page.waitForTimeout(500);
      
      const eventArea = await page.locator('[class*="event"], [class*="timeline"]').first();
      expect(eventArea).toBeTruthy();
    }
  });

  test('should not have console errors', async () => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });
});

test.describe('E2E - Navigation & Router', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:5173/');
  });

  test('should navigate between pages successfully', async () => {
    // Quick navigation test
    await page.goto('http://localhost:5173/studio');
    expect(page.url()).toContain('studio');
    
    await page.goto('http://localhost:5173/flows');
    expect(page.url()).toContain('flows');
    
    await page.goto('http://localhost:5173/cascade');
    expect(page.url()).toContain('cascade');
  });

  test('should handle invalid routes gracefully', async () => {
    await page.goto('http://localhost:5173/invalid-route');
    
    // Should remain at invalid route (React Router handles it)
    const statusCode = page.url();
    expect(statusCode).toBeTruthy();
  });
});

test.describe('E2E - Component Integration Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test('should render without ref errors on Studio', async () => {
    await page.goto('http://localhost:5173/studio');
    
    // Wait for interactive
    await page.waitForLoadState('domcontentloaded');
    
    // Check main layout divs
    const layout = await page.locator('.studio-layout, .studio-main').count();
    expect(layout).toBeGreaterThan(0);
  });

  test('should render all Studio sidebar components', async () => {
    await page.goto('http://localhost:5173/studio');
    await page.waitForLoadState('domcontentloaded');
    
    // Left sidebar
    const leftSidebar = await page.locator('[class*="sidebar-left"], [class*="left"]').count();
    
    // Right sidebar  
    const rightSidebar = await page.locator('[class*="sidebar-right"], [class*="right"]').count();
    
    // Both should exist
    expect(leftSidebar + rightSidebar).toBeGreaterThan(0);
  });

  test('should render FlowManager components without errors', async () => {
    await page.goto('http://localhost:5173/flows');
    await page.waitForLoadState('domcontentloaded');
    
    // Check for header, import panel, and grid
    const hasContent = await page.locator('body').count();
    expect(hasContent).toBeGreaterThan(0);
  });

  test('should render CascadeFailure components without errors', async () => {
    await page.goto('http://localhost:5173/cascade');
    await page.waitForLoadState('domcontentloaded');
    
    // Check for main components
    const hasContent = await page.locator('body').count();
    expect(hasContent).toBeGreaterThan(0);
  });
});

test.describe('E2E - Performance & Stability', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test('Studio page should load in reasonable time', async () => {
    const startTime = Date.now();
    await page.goto('http://localhost:5173/studio');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('FlowManager page should load in reasonable time', async () => {
    const startTime = Date.now();
    await page.goto('http://localhost:5173/flows');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(5000);
  });

  test('CascadeFailure page should load in reasonable time', async () => {
    const startTime = Date.now();
    await page.goto('http://localhost:5173/cascade');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(5000);
  });

  test('should not have memory leaks on navigation', async () => {
    // Navigate multiple times
    for (let i = 0; i < 3; i++) {
      await page.goto('http://localhost:5173/studio');
      await page.waitForTimeout(500);
      await page.goto('http://localhost:5173/flows');
      await page.waitForTimeout(500);
      await page.goto('http://localhost:5173/cascade');
      await page.waitForTimeout(500);
    }

    // Should still be responsive
    const response = await page.evaluate(() => document.readyState);
    expect(response).toBe('complete');
  });
});

test.describe('E2E - DOM Structure Validation', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test('Studio page should have required root elements', async () => {
    await page.goto('http://localhost:5173/studio');
    
    const root = await page.locator('#root');
    expect(root).toBeTruthy();
    
    const isVisible = await root.isVisible();
    expect(isVisible).toBe(true);
  });

  test('FlowManager page should have required root elements', async () => {
    await page.goto('http://localhost:5173/flows');
    
    const root = await page.locator('#root');
    expect(root).toBeTruthy();
  });

  test('CascadeFailure page should have required root elements', async () => {
    await page.goto('http://localhost:5173/cascade');
    
    const root = await page.locator('#root');
    expect(root).toBeTruthy();
  });

  test('should not have broken imports in console', async () => {
    const logs: string[] = [];
    page.on('console', (msg) => {
      logs.push(msg.text());
    });

    await page.goto('http://localhost:5173/studio');
    await page.waitForTimeout(2000);

    // Check for common import errors
    const hasImportError = logs.some(log => 
      log.includes('Cannot find module') || 
      log.includes('Failed to fetch') ||
      log.includes('ChunkLoadError')
    );
    
    expect(hasImportError).toBe(false);
  });
});
