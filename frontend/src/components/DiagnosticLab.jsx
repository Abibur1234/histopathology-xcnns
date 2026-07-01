import React, { useState, useEffect, useRef } from 'react';

function DiagnosticLab({ task }) {
  const [samples, setSamples] = useState([]);
  const [selectedSample, setSelectedSample] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [opacity, setOpacity] = useState(0.55);
  
  // Toggles for visual annotations
  const [showNuclei, setShowNuclei] = useState(false);
  const [showGlands, setShowGlands] = useState(false);
  const [hoveredCell, setHoveredCell] = useState(null);
  
  const fileInputRef = useRef(null);

  // Fetch preset samples on task change
  useEffect(() => {
    fetch(`http://localhost:8000/api/samples?task=${task}`)
      .then(res => res.json())
      .then(data => {
        setSamples(data);
        if (data.length > 0) {
          triggerDiagnostic(data[0].grade, null);
        }
      })
      .catch(err => console.error("Error fetching samples:", err));
  }, [task]);

  const triggerDiagnostic = (sampleId, fileObj) => {
    setLoading(true);
    const formData = new FormData();
    formData.append("task", task);
    
    if (fileObj) {
      formData.append("file", fileObj);
      setSelectedSample(null); // Clear active preset focus
    } else {
      formData.append("sample_id", sampleId);
      setSelectedSample(sampleId);
    }

    fetch("http://localhost:8000/api/classify", {
      method: "POST",
      body: formData
    })
      .then(res => {
        if (!res.ok) throw new Error("Diagnostic analysis failed.");
        return res.json();
      })
      .then(data => {
        setDiagnosis(data);
        setLoading(false);
      })
      .catch(err => {
        alert(err.message);
        setLoading(false);
      });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      triggerDiagnostic(null, file);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  if (!diagnosis && loading) {
    return <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--primary)' }}>Running Malignancy Scan...</div>;
  }

  // Determine styling for badge
  const getBadgeClass = (predClass) => {
    if (predClass === 0) return "grade-badge benign";
    if (predClass === 1) return "grade-badge warning";
    return "grade-badge danger";
  };

  const getCellColor = (type) => {
    if (type === 'malignant') return '#F43F5E';      // Dark Red
    if (type === 'fused_epithelial') return '#F59E0B'; // Orange
    if (type === 'epithelial') return '#00D8B6';       // Clinical Teal
    return '#9CA3AF';                                  // Stromal Gray
  };

  const getCellLabel = (type) => {
    if (type === 'malignant') return "Atypical Malignant Nucleus";
    if (type === 'fused_epithelial') return "Fused Gland Nucleus";
    if (type === 'epithelial') return "Normal Epithelial Nucleus";
    return "Stromal / Connective Cell";
  };

  // Diagnostic summary helper text
  const getClinicalSummary = () => {
    if (!diagnosis) return "";
    const { pred_class, metrics } = diagnosis;
    if (task === 'prostate') {
      if (pred_class === 0) {
        return `Diagnostic scans reveal well-formed, healthy prostatic acini. Gland lumen ratio is stable at ${(metrics.gland_ratio * 100).toFixed(1)}% with an orderly single-layered epithelium. No architectural cribriform fusion or sheets of infiltrating cells are detected. Conclusion: Benign Prostatic Tissue.`;
      }
      if (pred_class === 1) {
        return `Scanning detects a crowded cluster of small, well-formed prostatic glands corresponding to Gleason Pattern 3. Cell density is elevated, but individual glands retain distinct lumens. Pleomorphism index remains low. Conclusion: Low-Grade Malignancy (Gleason Grade 3).`;
      }
      if (pred_class === 2) {
        return `Architectural inspection demonstrates significant gland fusion, cribriform formations, and incomplete lumens, typical of Gleason Pattern 4. Nuclear variation is elevated to ${metrics.pleomorphism_index}. Recommended: Close monitoring and biopsy mapping.`;
      }
      return `Critical scans show complete loss of glandular lumen architecture. Malignant cells show solid sheet-like infiltration and severe nuclear pleomorphism (Score: ${metrics.pleomorphism_index}). Prompt oncological consultation is advised.`;
    } else { // Breast
      if (pred_class === 0) {
        return `Analysis reveals normal lobular and ductal configuration. Double layer epithelium is intact with zero atypia. Connective stromal structure shows normal cellularity. Conclusion: Benign Breast Tissue.`;
      }
      if (pred_class === 1) {
        return `Model detects early tubular formation with mild nuclear pleomorphism. This corresponds to Bloom-Richardson Grade I (Well Differentiated Breast Carcinoma). Nuclear sizes are fairly uniform.`;
      }
      if (pred_class === 2) {
        return `Moderate tumor growth detected with solid nests of cells and reduced duct formation. Nuclear pleomorphism index is elevated to ${metrics.pleomorphism_index}. Typical of Breast Carcinoma Grade II.`;
      }
      return `Scans indicate severe nuclear atypia, highly irregular cellular nests, and zero tubular differentiation. Nuclear pleomorphism index is critical at ${metrics.pleomorphism_index}. Indicative of Grade III Breast Adenocarcinoma.`;
    }
  };

  return (
    <div className="lab-grid">
      {/* Left Column: Preset Selector & Uploader */}
      <div className="control-panel">
        <div className="card">
          <h3 className="card-title">Preloaded Presets</h3>
          <div className="preset-list">
            {samples.map((s) => (
              <button
                key={s.id}
                className={`preset-item ${selectedSample === s.id ? 'active' : ''}`}
                onClick={() => triggerDiagnostic(s.id, null)}
              >
                <div className="preset-title">{s.name}</div>
                <div className="preset-desc">{s.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Diagnostic Upload</h3>
          <div 
            className="file-uploader"
            onClick={() => fileInputRef.current.click()}
          >
            <div className="file-uploader-icon">⏏</div>
            <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Drag H&E patch here</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>PNG, JPG up to 10MB</p>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileUpload} 
              accept="image/*"
            />
          </div>
        </div>

        {diagnosis && (
          <div className="card">
            <h3 className="card-title">Interactive Overlays</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={showNuclei} 
                  onChange={(e) => setShowNuclei(e.target.checked)}
                  style={{ accentColor: 'var(--primary)' }}
                />
                Trace Nuclei Coordinates
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={showGlands} 
                  onChange={(e) => setShowGlands(e.target.checked)}
                  style={{ accentColor: 'var(--primary)' }}
                />
                Outline Gland Boundaries
              </label>
              {showNuclei && (
                <div style={{ fontSize: '0.75rem', padding: '0.5rem', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Tip: Hover over cell outline rings on the viewport to identify cell classifications.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Viewport & Diagnostics Breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {loading && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(11, 15, 25, 0.75)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.2rem' }}>Re-Running X-CNN Inference...</div>
          </div>
        )}

        {diagnosis && (
          <>
            <div className="viewport-layout">
              {/* Original Slide Viewport */}
              <div className="viewport-panel">
                <span className="viewport-title">Original Histological Slide (H&E)</span>
                <div className="canvas-wrapper">
                  <img 
                    src={`data:image/png;base64,${diagnosis.images.original}`} 
                    className="canvas-image" 
                    alt="Original" 
                  />
                  {/* Annotation Overlays */}
                  <svg className="canvas-overlay" viewBox="0 0 128 128" style={{ width: '100%', height: '100%' }}>
                    {showGlands && diagnosis.annotations.glands.map((g, idx) => (
                      <circle 
                        key={idx} 
                        cx={g[0]} 
                        cy={g[1]} 
                        r={g[2]} 
                        fill="none" 
                        stroke="#3B82F6" 
                        strokeWidth="1.5" 
                        strokeDasharray="2 2"
                      />
                    ))}
                    {showNuclei && diagnosis.annotations.nuclei.map((n, idx) => (
                      <circle 
                        key={idx} 
                        cx={n[0]} 
                        cy={n[1]} 
                        r={n[2] === 'malignant' ? 4 : 2} 
                        fill="none" 
                        stroke={getCellColor(n[2])} 
                        strokeWidth="0.8"
                        style={{ pointerEvents: 'all', cursor: 'help' }}
                        onMouseEnter={() => setHoveredCell(n)}
                        onMouseLeave={() => setHoveredCell(null)}
                      />
                    ))}
                  </svg>
                  {hoveredCell && (
                    <div style={{ position: 'absolute', bottom: '10px', left: '10px', right: '10px', backgroundColor: 'rgba(19, 26, 46, 0.9)', border: `1px solid ${getCellColor(hoveredCell[2])}`, padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', color: '#FFFFFF', zIndex: 10, textAlign: 'center' }}>
                      {getCellLabel(hoveredCell[2])} (x: {hoveredCell[0].toFixed(0)}, y: {hoveredCell[1].toFixed(0)})
                    </div>
                  )}
                </div>
              </div>

              {/* Explainable Attributions Viewport */}
              <div className="viewport-panel">
                <span className="viewport-title">Grad-CAM Decisive Heatmap Overlay</span>
                <div className="canvas-wrapper">
                  <img 
                    src={`data:image/png;base64,${diagnosis.images.original}`} 
                    className="canvas-image" 
                    alt="Background" 
                  />
                  <img 
                    src={`data:image/png;base64,${diagnosis.images.gradcam}`} 
                    className="canvas-image" 
                    style={{ position: 'absolute', top: 0, left: 0, opacity: opacity }} 
                    alt="Gradcam" 
                  />
                </div>
                <div style={{ width: '100%', marginTop: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span>Overlay Opacity: {(opacity * 100).toFixed(0)}%</span>
                  </div>
                  <div className="slider-group">
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.05" 
                      value={opacity} 
                      onChange={(e) => setOpacity(parseFloat(e.target.value))}
                      className="slider-input"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Diagnostic Metrics and Confidence Breakdown */}
            <div className="card">
              <h3 className="card-title">X-CNN Diagnostic Breakdown</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2.5rem' }}>
                {/* Confidence Bar & Softmax distribution */}
                <div>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Predicted Classification</span>
                      <span className={getBadgeClass(diagnosis.pred_class)}>{diagnosis.class_name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <span>Model Confidence Score</span>
                      <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{(diagnosis.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="metric-bar-container" style={{ marginTop: '0.35rem' }}>
                      <div className="metric-bar-fill" style={{ width: `${diagnosis.confidence * 100}%` }} />
                    </div>
                  </div>

                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Probability Output Distribution</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {diagnosis.probabilities.map((prob, idx) => {
                      const names = task === 'prostate'
                        ? ["Benign", "Gleason 3", "Gleason 4", "Gleason 5"]
                        : ["Benign", "Grade I", "Grade II", "Grade III"];
                      return (
                        <div key={idx} className="metric-bar-group">
                          <div className="metric-bar-header" style={{ fontSize: '0.75rem' }}>
                            <span>{names[idx]}</span>
                            <span>{(prob * 100).toFixed(1)}%</span>
                          </div>
                          <div className="metric-bar-container" style={{ height: '6px' }}>
                            <div className="metric-bar-fill" style={{ width: `${prob * 100}%`, background: idx === diagnosis.pred_class ? 'var(--primary)' : 'var(--border-color)' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Histopathology Tissue Metrics */}
                <div>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Histological Tissue Metrics</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Total Cellular Count</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>{diagnosis.metrics.cell_count}</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Cell Density (100x100px)</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3B82F6' }}>{diagnosis.metrics.cell_density}</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Nuclear Pleomorphism Index</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F43F5E' }}>{diagnosis.metrics.pleomorphism_index}</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Gland Lumen Ratio</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F59E0B' }}>{(diagnosis.metrics.gland_ratio * 100).toFixed(1)}%</div>
                    </div>
                  </div>

                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Automated Clinical Assessment</h4>
                  <div className="summary-text-box">
                    {getClinicalSummary()}
                  </div>
                  
                  <div className="flex-btn-group">
                    <button className="btn-action" onClick={handlePrintReport}>
                      <span>⎙</span> Export PDF Diagnosis
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Printable Report Layout (CSS Hidden unless printing) */}
            <div className="printable-report">
              <div className="report-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="report-title-main">CLINICAL DIAGNOSTIC SCAN REPORT</div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>X-CNN ENGINE</div>
                </div>
                <div className="report-metadata-grid">
                  <div><strong>Focus organ:</strong> {task.toUpperCase()} Tissue</div>
                  <div><strong>Scan Date:</strong> {new Date().toLocaleString()}</div>
                  <div><strong>Report Status:</strong> Finalized (Automated Decision Support)</div>
                  <div><strong>Analysis reference ID:</strong> a177-c0b7-64b1-XCNN</div>
                </div>
              </div>

              <div style={{ fontSize: '1.1rem', margin: '1rem 0' }}>
                <strong>Assessment Result:</strong> <span style={{ textTransform: 'uppercase', color: '#DC2626', fontWeight: 800 }}>{diagnosis.class_name}</span> 
                &nbsp;(Model Confidence: {(diagnosis.confidence * 100).toFixed(1)}%)
              </div>

              <div className="report-divider" />

              <h3>Quantitative Histopathology Metrics</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #000', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem 0' }}>Diagnostic Marker</th>
                    <th style={{ padding: '0.5rem 0' }}>Score / Value</th>
                    <th style={{ padding: '0.5rem 0' }}>Clinical Context</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '0.75rem 0' }}>Total Cell Nuclei Count</td>
                    <td>{diagnosis.metrics.cell_count}</td>
                    <td>Represents cell population density in scanned field.</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '0.75rem 0' }}>Nuclear Pleomorphism Index</td>
                    <td>{diagnosis.metrics.pleomorphism_index}</td>
                    <td>Measures size/shape variation (higher means more atypical).</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '0.75rem 0' }}>Gland Lumen Area Ratio</td>
                    <td>{(diagnosis.metrics.gland_ratio * 100).toFixed(1)}%</td>
                    <td>Measures glandular structures. Significant decrease indicates malignancy.</td>
                  </tr>
                </tbody>
              </table>

              <h3>Scanned Tissue Visuals</h3>
              <div className="report-visuals-grid">
                <div className="report-img-container">
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>H&E Original Slide</div>
                  <img src={`data:image/png;base64,${diagnosis.images.original}`} className="report-img" alt="report original" />
                </div>
                <div className="report-img-container">
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Grad-CAM Attribution Highlight</div>
                  <img src={`data:image/png;base64,${diagnosis.images.gradcam}`} className="report-img" alt="report gradcam" />
                </div>
              </div>

              <h3>Oncological / Pathology Text Summary</h3>
              <div style={{ border: '1px solid #9CA3AF', padding: '1rem', borderRadius: '4px', fontSize: '0.95rem', lineHeight: 1.6, backgroundColor: '#F9FAFB' }}>
                {getClinicalSummary()}
                <br /><br />
                <em>Disclaimer: This analysis is generated by an Explainable X-CNN decision support model. Results should be verified by a certified histopathologist.</em>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DiagnosticLab;
