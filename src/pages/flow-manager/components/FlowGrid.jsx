export default function FlowGrid({
  flows,
  onOpenFlow,
  onExportFlow,
  onDeleteFlow,
  formatDate,
}) {
  return (
    <div className="flow-grid">
      {flows.map((flow) => (
        <div key={flow.id} className="flow-card">
          <div className="flow-card-thumb">
            {flow.thumbnail ? (
              <img src={flow.thumbnail} alt={flow.name} />
            ) : (
              <div className="flow-card-thumb-empty">No Preview</div>
            )}
          </div>
          <div className="flow-card-body">
            <div className="flow-card-title">{flow.name}</div>
            <div className="flow-card-meta">Updated {formatDate(flow.updatedAt)}</div>
          </div>
          <div className="flow-card-actions">
            <button className="btn btn-primary" onClick={() => onOpenFlow(flow)}>
              Open in Studio
            </button>
            <button className="btn btn-secondary" onClick={() => onExportFlow(flow)}>
              Export JSON
            </button>
            <button className="btn btn-danger" onClick={() => onDeleteFlow(flow)}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
