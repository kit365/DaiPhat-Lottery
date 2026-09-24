"""Make ``python-bidi`` importable under Windows Application Control / SAC.

``python-bidi`` 0.6+ ships a Rust ``.pyd``. Smart App Control / WDAC often
blocks that unsigned extension with::

    DLL load failed while importing bidi: An Application Control policy has
    blocked this file.

PaddleX (``from bidi.algorithm import get_display``) and EasyOCR
(``from bidi import get_display``) both need this package. Vietnamese lottery
OCR does not need real BiDi — we only need the import to succeed.

Prefer ``python-bidi==0.4.2`` (pure Python). That version exposes
``get_display`` only under ``bidi.algorithm``, so we also alias it on the
package root for EasyOCR.
"""

from __future__ import annotations

import sys
import types


def ensure_bidi() -> None:
    """Idempotent: ensure ``import bidi`` / ``from bidi import get_display`` work."""
    try:
        from bidi import get_display as _root_get_display  # noqa: F401

        return
    except Exception:  # noqa: BLE001
        pass

    # 0.4.2: package imports, but root has no get_display.
    try:
        import bidi
        from bidi.algorithm import get_display

        try:
            from bidi.algorithm import get_base_level
        except ImportError:  # pragma: no cover - older stubs

            def get_base_level(text: str) -> int:  # type: ignore[misc]
                return 0

        bidi.get_display = get_display  # type: ignore[attr-defined]
        bidi.get_base_level = get_base_level  # type: ignore[attr-defined]
        return
    except Exception:  # noqa: BLE001
        pass

    # 0.6.x with blocked .pyd: ``import bidi`` fails in package __init__.
    # Install a minimal pure-Python stand-in (identity display — LTR only).
    algo = types.ModuleType("bidi.algorithm")

    def get_display(str_or_bytes, encoding="utf-8", *args, **kwargs):  # noqa: ANN001
        return str_or_bytes

    def get_base_level(text: str) -> int:  # noqa: ARG001
        return 0

    algo.get_display = get_display  # type: ignore[attr-defined]
    algo.get_base_level = get_base_level  # type: ignore[attr-defined]

    pkg = types.ModuleType("bidi")
    pkg.get_display = get_display  # type: ignore[attr-defined]
    pkg.get_base_level = get_base_level  # type: ignore[attr-defined]
    pkg.algorithm = algo  # type: ignore[attr-defined]
    pkg.__path__ = []  # mark as package for ``from bidi.algorithm import …``

    sys.modules["bidi"] = pkg
    sys.modules["bidi.algorithm"] = algo
