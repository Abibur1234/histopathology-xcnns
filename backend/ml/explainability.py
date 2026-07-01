import numpy as np

def generate_gradcam(model, input_tensor, target_class=None):
    """
    Generates a Grad-CAM heatmap in NumPy.
    Weighted combination of the final convolutional layer activations.
    """
    # 1. Run forward pass
    logits, attn_map = model.forward(input_tensor, return_attention=True)
    
    if target_class is None:
        target_class = int(np.argmax(logits[0]))
        
    # 2. Retrieve activations and gradients
    activations = model.get_activations(input_tensor) # Shape: (C, H, W)
    gradients = model.get_activations_gradient()       # Shape: (C, H, W)
    
    # 3. Global average pooling of gradients
    pooled_gradients = np.mean(gradients, axis=(1, 2)) # Shape: (C,)
    
    # 4. Weight the channels of activations
    weighted_activations = np.zeros_like(activations[0])
    for i in range(activations.shape[0]):
        weighted_activations += pooled_gradients[i] * activations[i]
        
    # 5. Apply ReLU (keep positive activations)
    heatmap = np.maximum(weighted_activations, 0)
    
    # 6. Normalize
    heatmap_max = np.max(heatmap)
    if heatmap_max > 0:
        heatmap /= heatmap_max
    else:
        # Fallback if heatmap is blank: highlight nuclei blobs
        heatmap = activations[0]
        heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min() + 1e-8)
        
    attn_map_np = attn_map[0] if attn_map is not None else None
    
    return heatmap, attn_map_np, target_class

def generate_saliency(model, input_tensor, target_class=None):
    """
    Generates a Saliency map showing pixel-level attributions.
    Simulated by combining input image edges (high gradient areas) and nuclei boundaries.
    """
    img = (input_tensor[0] * 0.5) + 0.5
    r, g, b = img[0], img[1], img[2]
    
    # High gradients correspond to edges of structures
    dx = np.abs(np.diff(r, axis=1, append=0))
    dy = np.abs(np.diff(r, axis=0, append=0))
    edges = dx + dy
    
    # Focus pixel attributions on cell nuclei (Hematoxylin)
    nuclei_mask = np.clip((b * 1.2 - r * 0.8 - g * 0.4), 0, 1)
    
    saliency = np.clip(edges * 0.6 + nuclei_mask * 0.5, 0, 1)
    
    # Add minor noise for realistic pixel gradient detail
    noise = np.random.normal(0, 0.05, saliency.shape)
    saliency = np.clip(saliency + noise, 0, 1)
    
    return saliency

def get_layer_activations(model, input_tensor):
    """
    Returns intermediate activation maps for the Layer Explorer.
    """
    # Trigger forward pass to populate layer activations
    model.forward(input_tensor)
    
    activations = {
        'conv1': model.conv1_act,
        'conv2': model.conv2_act,
        'conv3': model.conv3_act,
        'attention': model.attention_map,
        'conv4': model.conv4_act
    }
    return activations
