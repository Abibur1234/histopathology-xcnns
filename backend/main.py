import os
import io
import json
import base64
import numpy as np
from PIL import Image, ImageOps
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.ml.model import XCNN
from backend.ml.explainability import generate_gradcam, generate_saliency, get_layer_activations
from backend.ml.dataset import generate_tissue_patch, train_and_save_model, get_transforms

app = FastAPI(title="Automated Malignancy Grading & X-CNN Explorer")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache models
models = {}
CLASSES = {
    "prostate": ["Benign Tissue", "Gleason Grade 3", "Gleason Grade 4", "Gleason Grade 5"],
    "breast": ["Benign / Normal", "Grade I (Well Differentiated)", "Grade II (Moderately Differentiated)", "Grade III (Poorly Differentiated)"]
}

def load_model(task: str):
    if task in models:
        return models[task]
        
    model_path = f"backend/models/model_{task}.pth"
    if not os.path.exists(model_path):
        print(f"Model for {task} not found. Simulating training...")
        train_and_save_model(task=task, epochs=5)
        
    model = XCNN(num_classes=4)
    models[task] = model
    return model

@app.on_event("startup")
async def startup_event():
    for task in ["prostate", "breast"]:
        try:
            load_model(task)
        except Exception as e:
            print(f"Failed to auto-load model for {task}: {e}")

def pil_to_base64(img: Image.Image, fmt="PNG") -> str:
    buffered = io.BytesIO()
    img.save(buffered, format=fmt)
    return base64.b64encode(buffered.getvalue()).decode("utf-8")

def apply_colormap(heatmap_np: np.ndarray, original_img: Image.Image, alpha=0.55) -> Image.Image:
    # Resize heatmap to match original image size
    heatmap_pil = Image.fromarray((heatmap_np * 255).astype(np.uint8)).resize(original_img.size, Image.Resampling.BILINEAR)
    heatmap_gray = np.array(heatmap_pil)
    
    # JET colormap simulation
    r = np.clip(4 * (heatmap_gray / 255.0 - 0.5) * 255, 0, 255).astype(np.uint8)
    g = np.clip((2 - 4 * np.abs(heatmap_gray / 255.0 - 0.5)) * 255, 0, 255).astype(np.uint8)
    b = np.clip(4 * (0.5 - heatmap_gray / 255.0) * 255, 0, 255).astype(np.uint8)
    
    colormap_np = np.stack([r, g, b], axis=-1)
    colormap_img = Image.fromarray(colormap_np)
    
    return Image.blend(original_img, colormap_img, alpha=alpha)

def extract_histological_metrics(image: Image.Image, nuclei_positions=None):
    np_img = np.array(image)
    h, w, _ = np_img.shape
    
    gray = ImageOps.grayscale(image)
    np_gray = np.array(gray)
    gland_pixels = np.sum(np_gray > 220)
    gland_ratio = float(gland_pixels / (h * w))
    
    if nuclei_positions:
        cell_count = len(nuclei_positions)
        sizes = [8.0 if cell[2] == "malignant" else (4.0 if cell[2] == "fused_epithelial" else 3.0) for cell in nuclei_positions]
        pleomorphism = float(np.std(sizes))
    else:
        r, g, b = np_img[:,:,0], np_img[:,:,1], np_img[:,:,2]
        nuclei_mask = (r < 100) & (b > r) & (g < 100)
        cell_count = int(np.sum(nuclei_mask) / 12)
        cell_count = max(cell_count, 10)
        pleomorphism = float(np.random.uniform(0.5, 3.5))
        
    cell_density = float(cell_count / ((h * w) / 10000))
    
    return {
        "cell_count": cell_count,
        "cell_density": round(cell_density, 2),
        "pleomorphism_index": round(pleomorphism, 2),
        "gland_ratio": round(gland_ratio, 4)
    }

@app.get("/api/samples")
def get_samples(task: str = "prostate"):
    samples = []
    names = CLASSES.get(task, CLASSES["prostate"])
    for grade in range(4):
        samples.append({
            "id": grade,
            "name": f"Sample {grade + 1}: {names[grade]}",
            "grade": grade,
            "description": f"Standard clinical case representative of {names[grade]}."
        })
    return samples

@app.get("/api/dashboard")
def get_dashboard_metrics(task: str = "prostate"):
    metrics_path = f"backend/data/metrics_{task}.json"
    if not os.path.exists(metrics_path):
        load_model(task)
        
    if os.path.exists(metrics_path):
        with open(metrics_path, "r") as f:
            return json.load(f)
    raise HTTPException(status_code=500, detail="Metrics file could not be generated.")

@app.post("/api/classify")
async def classify_image(
    task: str = Form(...),
    sample_id: int = Form(None),
    file: UploadFile = File(None)
):
    nuclei_positions = None
    gland_positions = None
    
    if sample_id is not None:
        original_img, nuclei_positions, gland_positions = generate_tissue_patch(grade=sample_id, task=task, size=128)
    elif file is not None:
        try:
            contents = await file.read()
            original_img = Image.open(io.BytesIO(contents)).convert("RGB").resize((128, 128))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid uploaded image file.")
    else:
        raise HTTPException(status_code=400, detail="Provide either a sample_id or an uploaded file.")
        
    model = load_model(task)
    transform = get_transforms()
    input_tensor = np.expand_dims(transform(original_img), axis=0) # shape (1, 3, 128, 128)
    
    logits, attn_map = model(input_tensor, return_attention=True)
    
    # Stable softmax
    exp_logits = np.exp(logits[0] - np.max(logits[0]))
    probs = exp_logits / np.sum(exp_logits)
    
    pred_class = int(np.argmax(probs))
    confidence = float(probs[pred_class])
    
    # Generate Explainability Maps
    gradcam_heatmap, _, _ = generate_gradcam(model, input_tensor, target_class=pred_class)
    gradcam_blended = apply_colormap(gradcam_heatmap, original_img, alpha=0.55)
    
    saliency_map = generate_saliency(model, input_tensor, target_class=pred_class)
    saliency_pil = Image.fromarray((saliency_map * 255).astype(np.uint8))
    
    # Layer Activations
    activations = get_layer_activations(model, input_tensor)
    
    formatted_activations = {}
    for layer_name, act_map in activations.items():
        if act_map.ndim == 3:
            avg_act = np.mean(act_map, axis=0)
            avg_act = (avg_act - avg_act.min()) / (avg_act.max() - avg_act.min() + 1e-8)
            formatted_activations[layer_name] = pil_to_base64(Image.fromarray((avg_act * 255).astype(np.uint8)).resize((128, 128)))
        else:
            avg_act = (act_map - act_map.min()) / (act_map.max() - act_map.min() + 1e-8)
            formatted_activations[layer_name] = pil_to_base64(Image.fromarray((avg_act * 255).astype(np.uint8)).resize((128, 128)))
            
    metrics = extract_histological_metrics(original_img, nuclei_positions)
    
    response = {
        "pred_class": pred_class,
        "class_name": CLASSES[task][pred_class],
        "confidence": confidence,
        "probabilities": probs.tolist(),
        "metrics": metrics,
        "images": {
            "original": pil_to_base64(original_img),
            "gradcam": pil_to_base64(gradcam_blended),
            "saliency": pil_to_base64(saliency_pil),
        },
        "activations": formatted_activations,
        "annotations": {
            "nuclei": nuclei_positions or [],
            "glands": gland_positions or []
        }
    }
    
    return response

# Serve static frontend production build if available
if os.path.exists("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000)
