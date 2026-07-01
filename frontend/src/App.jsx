import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import DiagnosticLab from './components/DiagnosticLab';
import ModelExplorer from './components/ModelExplorer';

function App() {
  const [activeTab, setActiveTab] = useState('lab');
  const [task, setTask] = useState('prostate');

  return (
    <div className="app-container">
      <header className="header">
        <div className="brand">
          <div className="brand-logo">X</div>
          <div>
            <h1 className="brand-title">X-CNN Malignancy Diagnostics</h1>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              Explainable AI Decisions for Histopathology
            </p>
          </div>
        </div>
        
        <div className="nav-tabs">
          <button 
            className={`tab-btn ${activeTab === 'lab' ? 'active' : ''}`}
            onClick={() => setActiveTab('lab')}
          >
            Diagnostic Lab
          </button>
          <button 
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Clinical Analytics
          </button>
          <button 
            className={`tab-btn ${activeTab === 'explorer' ? 'active' : ''}`}
            onClick={() => setActiveTab('explorer')}
          >
            X-CNN Layer Explorer
          </button>
        </div>

        <div className="task-selector-container">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Diagnostic Focus:</span>
          <select 
            className="task-select"
            value={task} 
            onChange={(e) => setTask(e.target.value)}
          >
            <option value="prostate">Prostate Glands (Gleason)</option>
            <option value="breast">Breast Cells (Histological Grade)</option>
          </select>
        </div>
      </header>

      <main className="main-content">
        {activeTab === 'lab' && <DiagnosticLab task={task} />}
        {activeTab === 'dashboard' && <Dashboard task={task} />}
        {activeTab === 'explorer' && <ModelExplorer task={task} />}
      </main>
    </div>
  );
}

export default App;
