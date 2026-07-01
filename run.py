import os
import sys
import subprocess
import time
import webbrowser

def install_dependencies():
    required_packages = ["fastapi", "uvicorn", "numpy", "pillow", "scipy"]
    missing = []
    
    # Verify typing_extensions (which can trigger FastAPI Pydantic import errors if corrupt/outdated)
    try:
        import typing_extensions
        from typing_extensions import TypeIs
    except (ImportError, AttributeError):
        missing.append("typing-extensions")
        
    for pkg in required_packages:
        module_name = "PIL" if pkg == "pillow" else pkg
        try:
            __import__(module_name)
        except ImportError:
            missing.append(pkg)
            
    if missing:
        print(f"Detected missing or corrupted dependencies: {missing}")
        print("Installing required packages via pip...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "--upgrade"] + missing)
            print("Dependencies successfully installed/repaired!")
        except Exception as e:
            print(f"Error installing dependencies: {e}")
            sys.exit(1)
    else:
        print("All python dependencies are verified and ready.")

def main():
    print("======================================================================")
    print("      AUTOMATED MALIGNANCY GRADING & X-CNN DECISION SYSTEM LAUNCHER     ")
    print("======================================================================")
    
    # 1. Install / repair packages if necessary
    install_dependencies()
    
    # 2. Start the FastAPI server
    print("\nStarting uvicorn backend server on http://localhost:8000...")
    
    # Start uvicorn in a subprocess
    cmd = [sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000"]
    proc = subprocess.Popen(cmd)
    
    # Wait a moment for uvicorn to bind to port 8000
    time.sleep(2.5)
    
    # 3. Open browser
    url = "http://localhost:8000/"
    print(f"Opening browser to: {url}")
    webbrowser.open(url)
    
    try:
        # Keep process alive
        proc.wait()
    except KeyboardInterrupt:
        print("\nStopping clinical decision backend server...")
        proc.terminate()
        proc.wait()
        print("Server stopped. Thank you for using X-CNN diagnostics!")

if __name__ == "__main__":
    main()
