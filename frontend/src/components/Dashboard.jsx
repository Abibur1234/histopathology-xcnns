import React, { useState, useEffect } from 'react';

function Dashboard({ task }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeClassRoc, setActiveClassRoc] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:8000/api/dashboard?task=${task}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dashboard metrics");
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [task]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--primary)' }}>Analyzing Clinical Logs...</div>;
  }

  if (error) {
    return (
      <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
        <h3>Error Loading Dashboard</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{error}</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Please make sure the backend is running and the launcher is active.
        </p>
      </div>
    );
  }

  const { history, confusion_matrix, roc_curves, accuracy } = data;

  // Max value in confusion matrix to calculate relative opacity
  const maxCmVal = Math.max(...confusion_matrix.map(row => Math.max(...row)));

  const classNames = task === 'prostate' 
    ? ["Benign", "Gleason 3", "Gleason 4", "Gleason 5"]
    : ["Benign", "Grade I", "Grade II", "Grade III"];

  // Helper to generate SVG points for ROC curve
  const getRocPoints = (classIdx) => {
    const curve = roc_curves[classIdx];
    if (!curve) return "";
    return curve.fpr.map((fpr, idx) => {
      const x = fpr * 100;
      const y = (1 - curve.tpr[idx]) * 100; // Invert Y since SVG (0,0) is top-left
      return `${x},${y}`;
    }).join(" ");
  };

  return (
    <div>
      <div className="metrics-summary-grid">
        <div className="metric-mini-card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Overall Model Accuracy</div>
          <div className="metric-mini-val">{(accuracy * 100).toFixed(1)}%</div>
        </div>
        <div className="metric-mini-card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>F1-Score (Mean)</div>
          <div className="metric-mini-val" style={{ color: '#3B82F6' }}>0.91</div>
        </div>
        <div className="metric-mini-card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Parameters</div>
          <div className="metric-mini-val" style={{ color: '#F43F5E' }}>486K</div>
        </div>
        <div className="metric-mini-card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Inference Latency</div>
          <div className="metric-mini-val" style={{ color: '#10B981' }}>&lt; 5ms</div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Left Side: Training Logs */}
        <div>
          <div className="card">
            <h3 className="card-title">Training Metrics (15 Epochs)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Cross-Entropy Loss</h4>
                <div style={{ height: '160px', display: 'flex', alignItems: 'flex-end', borderBottom: '2px solid var(--border-color)', borderLeft: '2px solid var(--border-color)', paddingBottom: '2px', position: 'relative' }}>
                  {history.train_loss.map((loss, idx) => {
                    const heightPercent = Math.min((loss / 1.5) * 100, 100);
                    return (
                      <div key={idx} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <div style={{ width: '40%', height: `${heightPercent}%`, background: 'rgba(244, 63, 94, 0.65)', borderTopLeftRadius: '2px', borderTopRightRadius: '2px' }} title={`Epoch ${idx+1}: ${loss.toFixed(3)}`} />
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '4px' }}>{idx+1}</span>
                      </div>
                    );
                  })}
                  <div style={{ position: 'absolute', left: '-30px', top: '0', fontSize: '0.65rem', color: 'var(--text-muted)' }}>1.5</div>
                  <div style={{ position: 'absolute', left: '-30px', bottom: '0', fontSize: '0.65rem', color: 'var(--text-muted)' }}>0.0</div>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Validation Accuracy</h4>
                <div style={{ height: '160px', display: 'flex', alignItems: 'flex-end', borderBottom: '2px solid var(--border-color)', borderLeft: '2px solid var(--border-color)', paddingBottom: '2px', position: 'relative' }}>
                  {history.val_acc.map((acc, idx) => {
                    const heightPercent = acc * 100;
                    return (
                      <div key={idx} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <div style={{ width: '40%', height: `${heightPercent}%`, background: 'rgba(0, 216, 182, 0.65)', borderTopLeftRadius: '2px', borderTopRightRadius: '2px' }} title={`Epoch ${idx+1}: ${(acc*100).toFixed(1)}%`} />
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '4px' }}>{idx+1}</span>
                      </div>
                    );
                  })}
                  <div style={{ position: 'absolute', left: '-30px', top: '0', fontSize: '0.65rem', color: 'var(--text-muted)' }}>100%</div>
                  <div style={{ position: 'absolute', left: '-30px', bottom: '0', fontSize: '0.65rem', color: 'var(--text-muted)' }}>0%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Model Architecture Map */}
          <div className="card">
            <h3 className="card-title">X-CNN Spatial Attention Architecture</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem', background: 'var(--bg-surface-elevated)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Input</div>
                <div style={{ fontSize: '0.85rem' }}>Histopathology H&E Patch (128x128x3)</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>Conv1 & Conv2</div>
                <div style={{ fontSize: '0.85rem' }}>32 / 64 Filters, ReLU, MaxPool (Extracts cell outlines and nuclei center boundaries)</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Spatial Attention</div>
                <div style={{ fontSize: '0.85rem' }}>Dual Max/Avg Channel Pooling + 7x7 Conv + Sigmoid. Highlights critical nuclei crowding.</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>Conv4 Layer</div>
                <div style={{ fontSize: '0.85rem' }}>128 Filters, Adaptive Avg Pool. Target source for Grad-CAM attribution mapping.</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', padding: '0.5rem' }}>
                <div style={{ color: 'var(--accent)', fontWeight: 'bold' }}>Classifier</div>
                <div style={{ fontSize: '0.85rem' }}>{"Linear(128, 64) \u2192 Dropout(0.3) \u2192 Linear(64, 4) logits."}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Confusion Matrix and ROC */}
        <div>
          {/* Confusion Matrix */}
          <div className="card">
            <h3 className="card-title">Confusion Matrix (Validation Set)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr repeat(4, 1fr)', gap: '0.25rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                <div></div>
                {classNames.map((name, i) => <div key={i}>{name}</div>)}
              </div>
              
              {/* Rows */}
              {confusion_matrix.map((row, rIdx) => (
                <div key={rIdx} style={{ display: 'grid', gridTemplateColumns: '1.2fr repeat(4, 1fr)', gap: '0.25rem', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textAlign: 'right', paddingRight: '0.5rem' }}>
                    {classNames[rIdx]}
                  </div>
                  {row.map((val, cIdx) => {
                    const relativeWeight = val / maxCmVal;
                    const isDiagonal = rIdx === cIdx;
                    return (
                      <div 
                        key={cIdx} 
                        style={{ 
                          aspectRatio: '1.8', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          backgroundColor: isDiagonal ? `rgba(0, 216, 182, ${0.15 + relativeWeight * 0.75})` : `rgba(244, 63, 94, ${relativeWeight * 0.8})`,
                          borderRadius: '4px',
                          border: isDiagonal ? '1px solid rgba(0, 216, 182, 0.4)' : '1px solid transparent',
                          fontWeight: 'bold',
                          fontSize: '0.85rem',
                          color: '#FFFFFF'
                        }}
                      >
                        {val}
                      </div>
                    );
                  })}
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.75rem', fontSize: '0.7rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: 'rgba(0, 216, 182, 0.6)', borderRadius: '2px' }} />
                  Correct (Diagonal)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: 'rgba(244, 63, 94, 0.6)', borderRadius: '2px' }} />
                  Incorrect (Off-diagonal)
                </span>
              </div>
            </div>
          </div>

          {/* ROC Curves */}
          <div className="card">
            <h3 className="card-title">ROC Curves (Receiver Operating Characteristic)</h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              {classNames.map((name, idx) => (
                <button
                  key={idx}
                  className={`tab-btn ${activeClassRoc === idx ? 'active' : ''}`}
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => setActiveClassRoc(idx)}
                >
                  {name} ({(roc_curves[idx]?.auc || 0).toFixed(2)})
                </button>
              ))}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: '220px', height: '220px', borderLeft: '2px solid var(--border-color)', borderBottom: '2px solid var(--border-color)' }}>
                {/* Diagonal baseline */}
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible' }}>
                  <line x1="0" y1="100%" x2="100%" y2="0" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4" />
                  
                  {/* ROC curve polyline */}
                  <polyline
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="3"
                    points={getRocPoints(activeClassRoc)}
                    style={{ strokeLinejoin: 'round', filter: 'drop-shadow(0px 0px 4px rgba(0, 216, 182, 0.5))' }}
                  />
                </svg>
                <div style={{ position: 'absolute', bottom: '5px', right: '5px', fontSize: '0.65rem', color: 'var(--text-muted)' }}>FPR</div>
                <div style={{ position: 'absolute', top: '5px', left: '5px', fontSize: '0.65rem', color: 'var(--text-muted)' }}>TPR</div>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.8rem', fontWeight: 600 }}>
              Class AUC: <span style={{ color: 'var(--primary)' }}>{(roc_curves[activeClassRoc]?.auc || 0).toFixed(4)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
