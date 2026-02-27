export default function StudioSidebarLeft({
  promptText,
  setPromptText,
  handleGenerateFlow,
  isGenerating,
  aiStatus,
  aiError,
}) {
  const templates = [
    {
      label: 'GitOps CI/CD',
      prompt:
        'GitOps CI/CD pipeline with GitHub Actions, Docker Registry, ArgoCD, and Kubernetes cluster with deployments and services',
    },
    {
      label: 'Microservices',
      prompt:
        'Microservices architecture with API Gateway, Auth Service, User Service, Product Service, Order Service, Message Queue, and PostgreSQL databases',
    },
    {
      label: 'ML Pipeline',
      prompt:
        'Machine Learning pipeline with data ingestion, feature engineering, model training, model registry, A/B testing, and serving infrastructure',
    },
  ];

  return (
    <div className="studio-sidebar-left glass-panel">
      <h2 className="sidebar-title">🤖 AI Flow</h2>
      <p className="sidebar-hint">Mô tả hệ thống, AI sẽ sinh sơ đồ</p>

      <div className="section">
        <label className="section-label">Prompt</label>
        <textarea
          className="field-input prompt-textarea"
          placeholder="Ví dụ: Hệ thống CI/CD với GitOps, ArgoCD, Docker Registry, K3d cluster..."
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          rows={5}
          disabled={isGenerating}
        />

        <button
          className="btn btn-generate"
          onClick={handleGenerateFlow}
          disabled={isGenerating || !promptText.trim()}
        >
          {isGenerating ? '⏳ Đang sinh...' : '🚀 Generate Flow'}
        </button>
      </div>

      {aiStatus && (
        <div className="ai-status-panel">
          <div
            className={`ai-status-dot ${aiStatus.step === 'done' ? 'done' : 'active'}`}
          />
          <span className="ai-status-text">{aiStatus.message}</span>
        </div>
      )}

      {aiError && <div className="ai-error-panel">⚠️ {aiError}</div>}

      <div className="section" style={{ marginTop: 'auto' }}>
        <label className="section-label">Quick Templates</label>
        {templates.map((t) => (
          <button
            key={t.label}
            className="btn btn-template"
            onClick={() => setPromptText(t.prompt)}
            disabled={isGenerating}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
