export const initialNodes = [
    { id: 'source-code', type: 'universal', data: { title: 'Source Code', subtitle: 'Commit & Push', icon: '📝' }, position: { x: 50, y: 50 } },
    { id: 'ci-pipeline', type: 'universal', data: { title: 'CI Pipeline', subtitle: 'Build & Test', icon: '⚙️' }, position: { x: 50, y: 200 } },
    { id: 'docker-registry', type: 'universal', data: { title: 'Docker Registry', subtitle: 'Store Image', icon: '📦' }, position: { x: 300, y: 200 } },
    { id: 'gitops-repo', type: 'universal', data: { title: 'GitOps Repo', subtitle: 'Manifests', icon: '📜' }, position: { x: 550, y: 200 } },
    { id: 'argocd', type: 'universal', data: { title: 'Argo CD', subtitle: 'Sync Controller', icon: '🐙' }, position: { x: 550, y: 350 } },
    {
        id: 'k3d-cluster', type: 'group', data: { label: 'K3d Cluster' },
        position: { x: 250, y: 450 },
        style: {
            width: 520, height: 260,
            backgroundColor: 'rgba(30, 41, 59, 0.35)',
            border: '1px dashed rgba(148, 163, 184, 0.25)',
            borderRadius: '20px', color: 'rgba(248, 250, 252, 0.6)', fontWeight: 'bold', padding: '16px',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
        },
    },
    { id: 'deployment', type: 'universal', data: { title: 'Deployment', subtitle: 'Pods', icon: '🚀' }, position: { x: 40, y: 70 }, parentId: 'k3d-cluster', extent: 'parent' },
    { id: 'service', type: 'universal', data: { title: 'Service', subtitle: 'LoadBalancer', icon: '🌐' }, position: { x: 280, y: 70 }, parentId: 'k3d-cluster', extent: 'parent' },
    { id: 'user', type: 'universal', data: { title: 'End User', subtitle: '', icon: '👤' }, position: { x: 390, y: 750 } },
];

export const initialEdges = [
    { id: 'e1', source: 'source-code', target: 'ci-pipeline', type: 'viral', label: 'Push Code', style: { stroke: '#f97316' } },
    { id: 'e2', source: 'ci-pipeline', target: 'docker-registry', type: 'viral', label: 'Push Image', style: { stroke: '#8b5cf6' } },
    { id: 'e3', source: 'ci-pipeline', target: 'gitops-repo', type: 'viral', label: 'Update Tag', style: { stroke: '#8b5cf6' } },
    { id: 'e4', source: 'gitops-repo', target: 'argocd', type: 'viral', label: 'Watch', style: { stroke: '#f97316' } },
    { id: 'e5', source: 'argocd', target: 'deployment', type: 'viral', label: 'Sync', style: { stroke: '#06b6d4' } },
    { id: 'e6', source: 'docker-registry', target: 'deployment', type: 'viral', label: 'Pull Image', style: { stroke: '#a855f7' } },
    { id: 'e7', source: 'deployment', target: 'service', type: 'viral', style: { stroke: '#10b981' } },
    { id: 'e8', source: 'service', target: 'user', type: 'viral', label: 'Access', style: { stroke: '#ec4899' } },
];

export const groupDefaultStyle = {
    backgroundColor: 'rgba(30, 41, 59, 0.35)',
    border: '1px dashed rgba(148, 163, 184, 0.25)',
    borderRadius: '20px',
    color: 'rgba(248, 250, 252, 0.6)',
    fontWeight: 'bold',
    padding: '16px',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
};
