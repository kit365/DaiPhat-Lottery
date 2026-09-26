# Silent-Face-Anti-Spoofing Models

Place the following ONNX models in this directory for robust liveness detection:

1. `2.7_80x80.onnx`
2. `4_0_0_80x80.onnx`

These models are part of the Silent-Face-Anti-Spoofing project. If these files are missing, the service will fall back to a simpler Laplacian-based blur/spoof detection heuristic.

**How to get them:**
You can find the ONNX versions of these models on GitHub (e.g., from repositories that port Silent-Face-Anti-Spoofing to ONNX/OpenCV).
- Copy them to: `eduspace-ai-service/app/ai_models/models/`
