import { ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import CascadeFailurePage from './cascade-failure/CascadeFailurePage';

export default function CascadeFailure() {
  return (
    <ReactFlowProvider>
      <CascadeFailurePage />
    </ReactFlowProvider>
  );
}
