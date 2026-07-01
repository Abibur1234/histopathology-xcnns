import numpy as np

class XCNN:
    """
    A pure NumPy-based Explainable CNN (X-CNN) emulation engine.
    It extracts biological features from histopathology images (nuclei, stroma, glands)
    and computes malignancy grading logits and attention heatmaps.
    """
    def __init__(self, num_classes=4):
        self.num_classes = num_classes
        self.gradients = None
        self.activations = None
        self.attention_map = None

    def eval(self):
        pass

    def load_state_dict(self, state_dict):
        pass

    def __call__(self, x, return_attention=False):
        return self.forward(x, return_attention)

    def forward(self, x, return_attention=False):
        """
        x is a numpy array of shape (1, 3, 128, 128) representing RGB channels normalized to [-1, 1].
        We map it back to [0, 1] for visual analysis.
        """
        # Convert from [-1, 1] back to [0, 1] range
        img = (x[0] * 0.5) + 0.5
        r, g, b = img[0], img[1], img[2]
        
        # 1. Feature extraction masks
        # Hematoxylin (nuclei) mask: Blue-Purple bias
        # Nuclei absorb green/red, so Blue is higher than Red
        nuclei_mask = np.clip((b * 1.2 - r * 0.8 - g * 0.4), 0, 1)
        
        # Gland lumens (white/light areas)
        gland_mask = np.clip((r + g + b) / 3.0, 0, 1)
        gland_mask = (gland_mask > 0.85).astype(np.float32)
        
        # Stroma/Cytoplasm (Eosin - Pink/Reddish bias)
        stroma_mask = np.clip((r * 1.1 - b * 0.9), 0, 1) * (1 - gland_mask) * (1 - nuclei_mask)

        # 2. Simulate convolutional feature maps
        # Layer 1: Edge & boundary extraction
        dx = np.abs(np.diff(r, axis=1, append=0))
        dy = np.abs(np.diff(r, axis=0, append=0))
        edges = np.clip(dx + dy, 0, 1)
        self.conv1_act = np.stack([edges, edges * 0.5, edges * 0.2])
        
        # Layer 2: Cellular nuclei centers detection
        # Smooth the nuclei mask to get blob centers
        from scipy.ndimage import gaussian_filter
        nuclei_blobs = gaussian_filter(nuclei_mask, sigma=1.5)
        self.conv2_act = np.stack([nuclei_blobs, nuclei_blobs * 0.7, nuclei_blobs * 0.3])
        
        # Layer 3: Glandular contours and lumens
        gland_contours = gaussian_filter(gland_mask, sigma=1.0)
        self.conv3_act = np.stack([gland_contours, gland_contours * 0.8, stroma_mask * 0.5])
        
        # Spatial Attention map: Focuses on dense cellular groupings and atypical clusters
        # Attention is strong where cell density is high (nuclei_mask is dense)
        attention = gaussian_filter(nuclei_mask, sigma=3.0)
        attention = (attention - attention.min()) / (attention.max() - attention.min() + 1e-8)
        self.attention_map = attention
        
        # Layer 4: Final convolutional representation
        # Combines attention-filtered cell features with gland boundaries
        final_rep = np.clip(nuclei_blobs * attention + gland_contours * 0.3, 0, 1)
        self.conv4_act = np.stack([final_rep, final_rep * 0.6, stroma_mask * 0.2])
        
        self.activations = self.conv4_act
        
        # 3. Decision classification metrics
        cell_density = np.mean(nuclei_mask)
        gland_ratio = np.mean(gland_mask)
        
        # Estimate pleomorphism (nuclear size variation)
        pleomorphism = np.std(nuclei_blobs) * 2.0
        
        # 4. Compute class logits based on clinical grading rules
        # Classes: 0: Benign, 1: Low-grade, 2: Mid-grade, 3: High-grade
        logits = np.zeros((1, 4))
        
        # Logic matches histological characteristics:
        # Benign: High gland ratio, low nuclear density, low pleomorphism
        logits[0, 0] = gland_ratio * 15.0 - cell_density * 4.0 - pleomorphism * 5.0 + 2.0
        # Grade 1 (Gleason 3): Medium glands, medium cell density
        logits[0, 1] = (0.25 - np.abs(gland_ratio - 0.15)) * 12.0 + cell_density * 5.0 - pleomorphism * 2.0
        # Grade 2 (Gleason 4): Fused glands (very small gland_ratio), high cell density
        logits[0, 2] = cell_density * 10.0 + pleomorphism * 4.0 - gland_ratio * 10.0 - 2.0
        # Grade 3 (Gleason 5): Complete loss of glands, dense pleomorphic cells
        logits[0, 3] = cell_density * 15.0 + pleomorphism * 12.0 - gland_ratio * 25.0 - 4.0

        # Simulate backprop gradient for Grad-CAM
        # Gradients are proportional to the activation strength scaled by logits
        pred_class = np.argmax(logits[0])
        self.gradients = np.zeros_like(self.activations)
        self.gradients[pred_class % 3] = self.activations[pred_class % 3] * 0.8
        
        if return_attention:
            return logits, np.expand_dims(self.attention_map, axis=0)
        return logits

    def get_activations_gradient(self):
        return self.gradients

    def get_activations(self, x):
        return self.activations
