from domain.stations.models import StationRef

# Bootstrap fallback list ONLY -- used when a /v1/scan request doesn't supply
# `activeStations` in its metadata (Java always should, since Java owns the
# real station/product master data; see doc section 6, "Station mapping").
# Not the platform's real station list (ids are always None; Java assigns
# the authoritative ones) -- but it does need to cover every province that
# actually issues an XSKT ticket, since any station missing here means a
# scan run without Java-supplied metadata (local/manual testing, an
# unconfigured environment) can NEVER match that station's name however
# well OCR reads it. Covers the standard three-region set of Vietnamese
# lottery stations (Miền Nam / Miền Trung / Miền Bắc).
DEFAULT_STATIONS: tuple[StationRef, ...] = (
    # -- Miền Nam (South) --
    StationRef(
        id=None,
        name="TP. Hồ Chí Minh",
        code="HCM",
        aliases=("tp.hcm", "tp hcm", "hcm", "sài gòn", "saigon", "sai gon", "ho chi minh", "hồ chí minh"),
    ),
    StationRef(id=None, name="Đồng Tháp", code="DTH", aliases=("dong thap",)),
    StationRef(id=None, name="Cà Mau", code="CMU", aliases=("ca mau",)),
    StationRef(id=None, name="Bến Tre", code="BTR", aliases=("ben tre",)),
    StationRef(id=None, name="Vũng Tàu", code="VTU", aliases=("vung tau", "ba ria vung tau", "bà rịa - vũng tàu")),
    StationRef(id=None, name="Bạc Liêu", code="BLU", aliases=("bac lieu",)),
    StationRef(id=None, name="Cần Thơ", code="CTH", aliases=("can tho",)),
    StationRef(id=None, name="Đồng Nai", code="DNI", aliases=("dong nai",)),
    StationRef(id=None, name="Sóc Trăng", code="STR", aliases=("soc trang",)),
    StationRef(id=None, name="Tây Ninh", code="TNH", aliases=("tay ninh",)),
    StationRef(id=None, name="An Giang", code="AGI", aliases=("an giang",)),
    StationRef(id=None, name="Bình Thuận", code="BTH", aliases=("binh thuan",)),
    StationRef(id=None, name="Vĩnh Long", code="VLG", aliases=("vinh long",)),
    StationRef(id=None, name="Bình Dương", code="BDU", aliases=("binh duong",)),
    StationRef(id=None, name="Trà Vinh", code="TVI", aliases=("tra vinh", "xstv")),
    StationRef(id=None, name="Long An", code="LAN", aliases=("long an",)),
    StationRef(id=None, name="Bình Phước", code="BPC", aliases=("binh phuoc",)),
    StationRef(id=None, name="Hậu Giang", code="HGI", aliases=("hau giang",)),
    StationRef(id=None, name="Kiên Giang", code="KGI", aliases=("kien giang",)),
    StationRef(id=None, name="Tiền Giang", code="TGI", aliases=("tien giang",)),
    StationRef(id=None, name="Lâm Đồng", code="LDG", aliases=("lam dong", "da lat", "đà lạt")),
    # -- Miền Trung (Central) --
    StationRef(id=None, name="Đà Nẵng", code="DNG", aliases=("da nang", "danang")),
    StationRef(id=None, name="Khánh Hòa", code="KHA", aliases=("khanh hoa", "nha trang")),
    StationRef(id=None, name="Phú Yên", code="PYN", aliases=("phu yen",)),
    StationRef(id=None, name="Thừa Thiên Huế", code="HUE", aliases=("thua thien hue", "hue", "huế")),
    StationRef(id=None, name="Bình Định", code="BDH", aliases=("binh dinh",)),
    StationRef(id=None, name="Quảng Trị", code="QTR", aliases=("quang tri",)),
    StationRef(id=None, name="Gia Lai", code="GLA", aliases=("gia lai",)),
    StationRef(id=None, name="Ninh Thuận", code="NTH", aliases=("ninh thuan",)),
    StationRef(id=None, name="Quảng Nam", code="QNA", aliases=("quang nam",)),
    StationRef(id=None, name="Đắk Lắk", code="DLK", aliases=("dak lak", "đăk lăk")),
    StationRef(id=None, name="Quảng Ngãi", code="QNG", aliases=("quang ngai",)),
    StationRef(id=None, name="Đắk Nông", code="DNO", aliases=("dak nong", "đăk nông")),
    StationRef(id=None, name="Kon Tum", code="KTU", aliases=("kon tum",)),
    # -- Miền Bắc (North) --
    StationRef(id=None, name="Hà Nội", code="HNI", aliases=("ha noi", "hanoi")),
    StationRef(id=None, name="Quảng Ninh", code="QNI", aliases=("quang ninh",)),
    StationRef(id=None, name="Hải Phòng", code="HPH", aliases=("hai phong",)),
    StationRef(id=None, name="Bắc Ninh", code="BNI", aliases=("bac ninh",)),
    StationRef(id=None, name="Nam Định", code="NDI", aliases=("nam dinh",)),
    StationRef(id=None, name="Thái Bình", code="TBI", aliases=("thai binh",)),
)
