import BlueprintTab from './tabs/BlueprintTab';
import DirectingTab from './tabs/DirectingTab';
import FxTab from './tabs/FxTab';
import RenderTab from './tabs/RenderTab';

export default function StudioSidebarRight({
  selectedNodeId,
  activeTab,
  setActiveTab,
  onOpenFlowManager,
  flowName,
  setFlowName,
  handleSaveVersion,
  isSaving,
  handleExportJson,
  importInputRef,
  handleImportJson,
  flowId,
  versions,
  loadVersions,
  handleRollback,
  nodes,
  setNodes,
  previewMode,
  setPreviewMode,
  handleAutoDirect,
  introText,
  setIntroText,
  selectableNodes,
  kfTargetNodeId,
  setKfTargetNodeId,
  kfFrame,
  setKfFrame,
  kfZoom,
  setKfZoom,
  addKeyframe,
  edgeEffectType,
  setEdgeEffectType,
  nodeTheme,
  setNodeTheme,
  selectionEffect,
  setSelectionEffect,
  renderSelectionEffect,
  setRenderSelectionEffect,
  renderQuality,
  setRenderQuality,
  loading,
  handleExport,
  handleCancelRender,
  renderProgress,
  renderStatus,
  renderEta,
  renderElapsed,
  videoUrl,
}) {
  return (
    <div className="studio-sidebar glass-panel">
      <div className="studio-sidebar-header">
        <div>
          <h2 className="sidebar-title">Studio</h2>
          <p className="sidebar-hint">TikTok 9:16 · 1080×1920</p>
        </div>
        <button className="btn btn-ghost" onClick={onOpenFlowManager}>
          Flow Manager
        </button>
      </div>

      {selectedNodeId && (
        <div className="selected-indicator">
          Selected: <strong>{selectedNodeId}</strong>
        </div>
      )}

      <div className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'blueprint' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('blueprint')}
        >
          🏗️ Blueprint
        </button>
        <button
          className={`tab-btn ${activeTab === 'directing' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('directing')}
        >
          🎬 Directing
        </button>
        <button
          className={`tab-btn ${activeTab === 'fx' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('fx')}
        >
          ✨ FX
        </button>
        <button
          className={`tab-btn ${activeTab === 'render' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('render')}
        >
          🎞️ Render
        </button>
      </div>

      {activeTab === 'blueprint' && (
        <BlueprintTab
          flowName={flowName}
          setFlowName={setFlowName}
          handleSaveVersion={handleSaveVersion}
          isSaving={isSaving}
          handleExportJson={handleExportJson}
          importInputRef={importInputRef}
          handleImportJson={handleImportJson}
          flowId={flowId}
          versions={versions}
          loadVersions={loadVersions}
          handleRollback={handleRollback}
          selectedNodeId={selectedNodeId}
          nodes={nodes}
          setNodes={setNodes}
        />
      )}

      {activeTab === 'directing' && (
        <DirectingTab
          previewMode={previewMode}
          setPreviewMode={setPreviewMode}
          handleAutoDirect={handleAutoDirect}
          introText={introText}
          setIntroText={setIntroText}
          selectableNodes={selectableNodes}
          kfTargetNodeId={kfTargetNodeId}
          setKfTargetNodeId={setKfTargetNodeId}
          kfFrame={kfFrame}
          setKfFrame={setKfFrame}
          kfZoom={kfZoom}
          setKfZoom={setKfZoom}
          addKeyframe={addKeyframe}
        />
      )}

      {activeTab === 'fx' && (
        <FxTab
          edgeEffectType={edgeEffectType}
          setEdgeEffectType={setEdgeEffectType}
          nodeTheme={nodeTheme}
          setNodeTheme={setNodeTheme}
          selectionEffect={selectionEffect}
          setSelectionEffect={setSelectionEffect}
          renderSelectionEffect={renderSelectionEffect}
          setRenderSelectionEffect={setRenderSelectionEffect}
        />
      )}

      {activeTab === 'render' && (
        <RenderTab
          renderQuality={renderQuality}
          setRenderQuality={setRenderQuality}
          loading={loading}
          handleExport={handleExport}
          handleCancelRender={handleCancelRender}
          renderProgress={renderProgress}
          renderStatus={renderStatus}
          renderEta={renderEta}
          renderElapsed={renderElapsed}
          videoUrl={videoUrl}
        />
      )}
    </div>
  );
}
