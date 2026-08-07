from domain.stations.models import StationRef

# Bootstrap fallback list ONLY -- used when a /v1/scan request doesn't supply
# `activeStations` in its metadata (Java always should, since Java owns the
# real station/product master data; see doc section 6, "Station mapping").
# Kept intentionally small and illustrative; do not treat this as the
# platform's real station list.
DEFAULT_STATIONS: tuple[StationRef, ...] = (
    StationRef(
        id=None,
        name="TP. Hồ Chí Minh",
        code="HCM",
        aliases=("tp.hcm", "tp hcm", "hcm", "sài gòn", "saigon", "sai gon", "ho chi minh", "hồ chí minh"),
    ),
    StationRef(id=None, name="Đồng Tháp", code="DTH", aliases=("dong thap",)),
    StationRef(id=None, name="Cà Mau", code="CMU", aliases=("ca mau",)),
    StationRef(id=None, name="Bến Tre", code="BTR", aliases=("ben tre",)),
    StationRef(id=None, name="Vũng Tàu", code="VTU", aliases=("vung tau", "ba ria vung tau")),
    StationRef(id=None, name="Cần Thơ", code="CTH", aliases=("can tho",)),
    StationRef(id=None, name="Đồng Nai", code="DNI", aliases=("dong nai",)),
    StationRef(id=None, name="Sóc Trăng", code="STR", aliases=("soc trang",)),
    StationRef(id=None, name="Tây Ninh", code="TNH", aliases=("tay ninh",)),
    StationRef(
        id=None,
        name="Đà Nẵng",
        code="DNG",
        aliases=("da nang", "danang"),
    ),
    StationRef(id=None, name="Khánh Hòa", code="KHA", aliases=("khanh hoa", "nha trang")),
    StationRef(id=None, name="Phú Yên", code="PYN", aliases=("phu yen",)),
    StationRef(id=None, name="Hà Nội", code="HNI", aliases=("ha noi", "hanoi")),
    StationRef(id=None, name="Quảng Ninh", code="QNI", aliases=("quang ninh",)),
    StationRef(id=None, name="Hải Phòng", code="HPH", aliases=("hai phong",)),
)
