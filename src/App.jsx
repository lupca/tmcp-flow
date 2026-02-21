import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Studio from './pages/Studio.jsx';
import FlowManager from './pages/FlowManager.jsx';
import './styles/App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Studio />} />
        <Route path="/flows" element={<FlowManager />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

