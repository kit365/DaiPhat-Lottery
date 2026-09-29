"""Limit CPU math threads before EasyOCR/torch initializes.

On many-core AMD CPUs, unrestricted OpenMP/MKL/Torch threads can spend more
time context-switching than computing. Call ``apply_torch_thread_limits()``
as early as possible (before ``import easyocr`` / heavy torch use).
"""

from __future__ import annotations

import os


def apply_torch_thread_limits(
    *,
    num_threads: int | None = None,
    interop_threads: int | None = None,
    enable_mkldnn: bool | None = None,
) -> int:
    """Set CPU thread caps and the safe PyTorch MKL-DNN policy.

    Some virtualized production CPUs terminate inside ``mkldnn_convolution``
    with SIGFPE instead of raising a Python exception.  Keep that backend off
    by default for OCR; operators can explicitly re-enable it after validating
    the exact host CPU and image combination.
    """
    try:
        from infra.config import settings

        configured = int(getattr(settings, "TICKET_VISION_TORCH_NUM_THREADS", 2) or 2)
        configured_mkldnn = bool(
            getattr(settings, "TICKET_VISION_TORCH_ENABLE_MKLDNN", False)
        )
    except Exception:  # noqa: BLE001
        configured = 2
        configured_mkldnn = False

    n = max(1, int(num_threads if num_threads is not None else configured))
    interop = max(1, int(interop_threads if interop_threads is not None else min(2, n)))
    use_mkldnn = configured_mkldnn if enable_mkldnn is None else bool(enable_mkldnn)

    for key in (
        "OMP_NUM_THREADS",
        "MKL_NUM_THREADS",
        "OPENBLAS_NUM_THREADS",
        "NUMEXPR_NUM_THREADS",
    ):
        os.environ.setdefault(key, str(n))

    try:
        import torch

        # Apply before EasyOCR creates its model so convolutions never select
        # the oneDNN/MKL-DNN kernel that SIGFPEs on affected virtual CPUs.
        torch.backends.mkldnn.enabled = use_mkldnn
        torch.set_num_threads(n)
        try:
            torch.set_num_interop_threads(interop)
        except RuntimeError:
            # Interop threads can only be set once per process.
            pass
    except Exception:  # noqa: BLE001 -- torch may not be installed in unit tests
        pass

    return n
