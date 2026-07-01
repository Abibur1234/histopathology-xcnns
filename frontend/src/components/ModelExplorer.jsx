import React, { useState, useEffect } from 'react';

function ModelExplorer({ task }) {
  const [activeLayer, setActiveLayer] = useState('conv1');
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Run diagnostic classification on Sample 2 (Gleason 3 / Grade I) to populate layer activations initially
    setLoading(true);
    const formData = new FormData();
    formData.append("task", task);
    formData.append("sample_id", 1); // Sample 2 (ID = 1)
    
    fetch("http://localhost:8000/api/classify", {
      method: "POST",
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        setDiagnosis(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading explorer data:", err);
        setLoading(false);
      });
  }, [task]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--primary)' }}>Mapping Network Layer Activations...</div>;
  }

  if (!diagnosis) {
    return (
      <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
        <h3>Explorer Loading Failed</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Make sure the FastAPI server is running.</p>
      </div>
    );
  }

  const layersInfo = {
    conv1: {
      title: "Layer 1: Texture & Edge Boundaries (conv1)",
      description: "Extracts basic high-frequency spatial gradients and cell boundaries. Highlights the perimeter outlines of nuclei and glandular stromal membranes, acting as a tissue outline detector.",
      biological_feature: "Tissue structural borders and nuclear membrane outlines."
    },
    conv2: {
      title: "Layer 2: Cellular Nuclei Blobs (conv2)",
      description: "Isolates circular structures corresponding to hematoxylin-stained nuclear bodies. Higher activation intensities correspond to clusters of dark cell nuclei, filtering out flat stromal tissues.",
      biological_feature: "Individual cell nuclei counts and spatial distributions."
    },
    conv3: {
      title: "Layer 3: Glandular Contours & Lumens (conv3)",
      description: "Detects large circular white voids (gland lumens) and outer epithelial layers. Useful for identifying whether glands are intact (uniform large circles) or starting to fuse.",
      biological_feature: "Glandular morphology and lumen availability."
    },
    attention: {
      title: "Layer 3.5: Spatial Attention Gate (attention)",
      description: "Applies a self-attention matrix over Layer 3 activations. Filters out healthy, sparse tissue and focuses the network's attention on areas with high nuclear density and irregular shapes.",
      biological_feature: "Areas of cellular atypia and tumor cell crowding."
    },
    conv4: {
      title: "Layer 4: Malignancy Representation (conv4)",
      description: "Combines attention maps with gland coordinates to form the final feature representation before classification. Highlights regions of malignant sheets (extreme crowding) and glandular loss.",
      biological_feature: "Severe tissue architecture disruption and cell sheet formations."
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem' }}>
      {/* Layer selector list */}
      <div className="card" style={{ height: 'fit-content' }}>
        <h3 className="card-title">Network Layers</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {Object.keys(layersInfo).map((key) => (
            <button
              key={key}
              className={`preset-item ${activeLayer === key ? 'active' : ''}`}
              style={{ textAlign: 'left', padding: '0.75rem 1rem' }}
              onClick={() => setActiveLayer(key)}
            >
              <div className="preset-title" style={{ fontSize: '0.85rem' }}>{key === 'attention' ? 'Spatial Attention' : key.toUpperCase()}</div>
              <div className="preset-desc" style={{ fontSize: '0.7rem' }}>
                {key === 'conv1' && 'Boundary edges'}
                {key === 'conv2' && 'Nuclei center blobs'}
                {key === 'conv3' && 'Gland contours'}
                {key === 'attention' && 'Saliency gating'}
                {key === 'conv4' && 'Malignant features'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Layer activation display */}
      <div className="card">
        <h3 className="card-title">{layersInfo[activeLayer].title}</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'center' }}>
          
          {/* Visual representations */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', justifyItems: 'center' }}>
            <div className="viewport-panel" style={{ width: '100%' }}>
              <span className="viewport-title" style={{ fontSize: '0.75rem' }}>Original H&E Input</span>
              <div className="canvas-wrapper" style={{ width: '180px', height: '180px' }}>
                <img 
                  src={`data:image/png;base64,${diagnosis.images.original}`} 
                  className="canvas-image" 
                  alt="original" 
                />
              </div>
            </div>
            <div className="viewport-panel" style={{ width: '100%', borderColor: 'var(--primary)' }}>
              <span className="viewport-title" style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>Activation Feature Map</span>
              <div className="canvas-wrapper" style={{ width: '180px', height: '180px' }}>
                <img 
                  src={`data:image/png;base64,${diagnosis.activations[activeLayer]}`} 
                  className="canvas-image" 
                  alt="activation" 
                  style={{ filter: 'hue-rotate(140deg) saturate(1.8)' }} /* Make it glow blue-cyan! */
                />
              </div>
            </div>
          </div>

          {/* Theoretical description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Functional Explanation</h4>
              <p style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                {layersInfo[activeLayer].description}
              </p>
            </div>
            
            <div style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>Identified Biological Features</h4>
              <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                {layersInfo[activeLayer].biological_feature}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModelExplorer;
