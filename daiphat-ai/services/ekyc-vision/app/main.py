import os
import sys

# Env + Windows DLL paths BEFORE Paddle / InsightFace / torch imports.
os.environ.setdefault("PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION", "python")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "True")

if sys.platform == "win32":
    for raw in [
        os.path.join(sys.prefix, "Lib", "site-packages", "torch", "lib"),
        os.path.join(os.path.dirname(sys.executable), "..", "Lib", "site-packages", "torch", "lib"),
    ]:
        path = os.path.abspath(raw)
        if os.path.isdir(path):
            try:
                os.add_dll_directory(path)
            except Exception:
                pass
    # Preload torch so InsightFace does not hit WinError 127 on shm.dll.
    try:
        import torch  # noqa: F401
    except Exception:
        pass

from app.api.app_factory import create_app

app = create_app()
