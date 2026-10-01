import sys
from types import SimpleNamespace

from domain.ocr.torch_threads import apply_torch_thread_limits


class _FakeTorch:
    def __init__(self) -> None:
        self.backends = SimpleNamespace(mkldnn=SimpleNamespace(enabled=True))
        self.num_threads = None
        self.interop_threads = None

    def set_num_threads(self, value: int) -> None:
        self.num_threads = value

    def set_num_interop_threads(self, value: int) -> None:
        self.interop_threads = value


def test_applies_safe_virtual_cpu_defaults(monkeypatch):
    fake_torch = _FakeTorch()
    monkeypatch.setitem(sys.modules, "torch", fake_torch)
    monkeypatch.setattr(
        "infra.config.settings.TICKET_VISION_TORCH_NUM_THREADS", 2, raising=False
    )
    monkeypatch.setattr(
        "infra.config.settings.TICKET_VISION_TORCH_ENABLE_MKLDNN", False, raising=False
    )

    used = apply_torch_thread_limits()

    assert used == 2
    assert fake_torch.num_threads == 2
    assert fake_torch.interop_threads == 2
    assert fake_torch.backends.mkldnn.enabled is False


def test_allows_explicit_mkldnn_opt_in(monkeypatch):
    fake_torch = _FakeTorch()
    monkeypatch.setitem(sys.modules, "torch", fake_torch)

    apply_torch_thread_limits(num_threads=1, enable_mkldnn=True)

    assert fake_torch.num_threads == 1
    assert fake_torch.backends.mkldnn.enabled is True
