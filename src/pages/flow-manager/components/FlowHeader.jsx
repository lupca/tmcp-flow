export default function FlowHeader({ onOpenStudio, onImportClick, isImporting }) {
  return (
    <div className="flow-header">
      <div>
        <h1>Flow Manager</h1>
        <p>Manage, version, and publish flows for Remotion render.</p>
      </div>
      <div className="flow-header-actions">
        <button className="btn btn-secondary" onClick={onOpenStudio}>
          Open Studio
        </button>
        <button
          className="btn btn-primary"
          onClick={onImportClick}
          disabled={isImporting}
        >
          {isImporting ? 'Importing...' : 'Import from File'}
        </button>
      </div>
    </div>
  );
}
