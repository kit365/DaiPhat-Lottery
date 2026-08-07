from domain.layouts.base import TicketLayoutStrategy
from domain.layouts.generic_layout import GenericLayoutStrategy

# Factory Pattern (doc section 9): select the appropriate layout strategy by
# station_code. Register per-station strategies here as they get calibrated,
# e.g. {"HCM": HcmLayoutStrategy(), "DNG": DaNangLayoutStrategy()}.
_REGISTRY: dict[str, TicketLayoutStrategy] = {}

_generic = GenericLayoutStrategy()


class LayoutStrategyFactory:
    @staticmethod
    def get_for_station(station_code: str | None) -> TicketLayoutStrategy:
        if station_code and station_code in _REGISTRY:
            return _REGISTRY[station_code]
        return _generic
