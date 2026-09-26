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
) -> int:
    """Set OMP/MKL env + torch thread caps. Returns the thread count used."""
    try:
        from infra.config import settings

        configured = int(getattr(settings, "TICKET_VISION_TORCH_NUM_THREADS", 2) or 2)
    except Exception:  # noqa: BLE001
        configured = 2

    n = max(1, int(num_threads if num_threads is not None else configured))
    interop = max(1, int(interop_threads if interop_threads is not None else min(2, n)))

    for key in (
        "OMP_NUM_THREADS",
        "MKL_NUM_THREADS",
        "OPENBLAS_NUM_THREADS",
        "NUMEXPR_NUM_THREADS",
    ):
        os.environ.setdefault(key, str(n))

    try:
        import torch

        torch.set_num_threads(n)
        try:
            torch.set_num_interop_threads(interop)
        except RuntimeError:
            # Interop threads can only be set once per process.
            pass
    except Exception:  # noqa: BLE001 -- torch may not be installed in unit tests
        pass

    return n
