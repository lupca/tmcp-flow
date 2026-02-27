import { ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import StudioPage from './studio/StudioPage';

export default function Studio() {
  return (
    <ReactFlowProvider>
      <StudioPage />
    </ReactFlowProvider>
  );
}
