"""
CCCD field extraction from PaddleOCR boxes.

Label matching runs on an accent/space/punctuation-insensitive form of each OCR box and tolerates
1–2 OCR character errors, because PaddleOCR (lang="vi") frequently glues words together
("Giói tinh/SexNamQuoc tich/Nationality") or drops letters ("Cógia tr.den04/12/2029").
Values are taken from the same box after the label, or from the neighbouring box on the same row /
below (using box geometry). Values are never invented: when a label or value cannot be located the
field is returned as None so the caller can ask the user to retake that side.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from typing import Any, Optional

FIELD_KEYS = (
    "personal_identification_number",
    "full_name",
    "date_of_birth",
    "gender",
    "nationality",
    "place_of_birth_registration",
    "place_of_residence",
    "issue_date",
    "expiry_date",
)

# Compact (accent-free, lowercase, alphanumeric-only) label variants per field.
# Covers CCCD 2016/2021 (chip) and the 2024 "Căn cước" layout.
FIELD_LABELS: dict[str, list[str]] = {
    "full_name": ["hovaten", "fullname", "hochudemvatenkhaisinh", "hochudemvaten"],
    "date_of_birth": ["ngaysinh", "dateofbirth"],
    "gender": ["gioitinh", "sex"],
    "nationality": ["quoctich", "nationality"],
    "place_of_birth_registration": [
        "quequan", "placeoforigin", "noidangkykhaisinh", "placeofbirth", "noisinh",
    ],
    "place_of_residence": ["noithuongtru", "placeofresidence", "noicutru"],
    "issue_date": ["ngaythangnam", "datemonthyear", "ngaycap", "dateofissue"],
    "expiry_date": ["cogiatriden", "giatriden", "dateofexpiry", "ngayhethan", "hethan", "expiry"],
}

# Labels of card sections that are not extracted but must stop value/continuation lookup.
OTHER_LABELS: list[str] = [
    "sodinhdanhcanhan", "personalidentificationnumber", "dacdiemnhandang",
    "personalidentification", "citizenidentitycard", "cancuoccongdan",
    "ngontrotrai", "ngontrophai", "leftindexfinger", "rightindexfinger",
    "cuctruongcuccanhsat", "directorgeneral",
]

LAYOUT_2024_MARKERS = ["noicutru", "noidangkykhaisinh"]
DATE_FIELDS = {"date_of_birth", "issue_date", "expiry_date"}
PLACE_FIELDS = {"place_of_birth_registration", "place_of_residence"}
GENDER_TOKENS = {"nam", "nu", "male", "female"}

DATE_RE = re.compile(r"(?<!\d)(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{4})(?!\d)")
VERBAL_DATE_RE = re.compile(r"ngay\s*(\d{1,2})\s*thang\s*(\d{1,2})\s*nam\s*(\d{4})")
NO_EXPIRY_RE = re.compile(r"(?i)kh[oô]ng\s*th[ơời]\s*h[ạa]n")
ID12_RE = re.compile(r"(?<!\d)(\d{12})(?!\d)")
ID9_RE = re.compile(r"(?<!\d)(\d{9})(?!\d)")
VALUE_STRIP = " \t:;.,/\\|-_'\"`~"


@dataclass
class OcrBox:
    text: str
    conf: float = 1.0
    x1: float = 0.0
    y1: float = 0.0
    x2: float = 0.0
    y2: float = 0.0

    @property
    def h(self) -> float:
        return max(1.0, self.y2 - self.y1)


@dataclass
class LabelHit:
    field: str
    start: int
    end: int


def _norm(s: str) -> str:
    return re.sub(r"\s{2,}", " ", unicodedata.normalize("NFC", s or "")).strip()


def _fold_char(ch: str) -> str:
    if ch in "đĐ":
        return "d"
    return unicodedata.normalize("NFD", ch).encode("ascii", "ignore").decode("ascii").lower()


def _fold(s: str) -> str:
    return "".join(_fold_char(c) for c in (s or ""))


def _compact_with_map(s: str) -> tuple[str, list[int]]:
    """Alphanumeric folded string plus, per compact char, its index in the original string."""
    chars: list[str] = []
    index: list[int] = []
    for i, ch in enumerate(s):
        for c in _fold_char(ch):
            if c.isalnum():
                chars.append(c)
                index.append(i)
    return "".join(chars), index


def _max_errors(label: str) -> int:
    if len(label) < 6:
        return 0
    if len(label) < 12:
        return 1
    return 2


def _approx_find(text: str, pattern: str, max_err: int) -> Optional[tuple[int, int, int]]:
    """Best approximate occurrence of pattern in text (Sellers). Returns (start, end, errors)."""
    m = len(pattern)
    if m == 0 or not text:
        return None
    if max_err == 0:
        pos = text.find(pattern)
        return (pos, pos + m, 0) if pos >= 0 else None
    col = list(range(m + 1))
    start = [0] * (m + 1)
    best: Optional[tuple[int, int, int]] = None
    for j in range(1, len(text) + 1):
        new = [0] * (m + 1)
        nstart = [j] * (m + 1)
        for i in range(1, m + 1):
            sub = col[i - 1] + (pattern[i - 1] != text[j - 1])
            skip_text = col[i] + 1
            skip_pat = new[i - 1] + 1
            if sub <= skip_text and sub <= skip_pat:
                new[i], nstart[i] = sub, start[i - 1]
            elif skip_text <= skip_pat:
                new[i], nstart[i] = skip_text, start[i]
            else:
                new[i], nstart[i] = skip_pat, nstart[i - 1]
        col, start = new, nstart
        if col[m] <= max_err and (best is None or col[m] < best[2]):
            best = (start[m], j, col[m])
            if col[m] == 0:
                break
    return best


def _label_hits(text: str) -> list[LabelHit]:
    """All field-label occurrences in one OCR box, non-overlapping, ordered by position."""
    compact, index = _compact_with_map(text)
    if not compact:
        return []
    candidates: list[tuple[int, int, int, str]] = []
    groups = list(FIELD_LABELS.items()) + [("_other", OTHER_LABELS)]
    for field, labels in groups:
        for label in labels:
            found = _approx_find(compact, label, _max_errors(label))
            if found:
                s, e, err = found
                candidates.append((s, e, err, field))
    # Prefer longer, more exact matches when they overlap.
    candidates.sort(key=lambda c: (-(c[1] - c[0]), c[2]))
    taken: list[tuple[int, int, int, str]] = []
    for c in candidates:
        if all(c[1] <= t[0] or c[0] >= t[1] for t in taken):
            taken.append(c)
    taken.sort(key=lambda c: c[0])
    return [LabelHit(field=f, start=index[s], end=index[e - 1] + 1) for s, e, _, f in taken]


def _is_mrz(text: str) -> bool:
    t = text.replace(" ", "").upper()
    return "<<" in t or bool(re.match(r"^[IAC][A-Z<]VNM", t))


def _normalize_date(text: str) -> Optional[str]:
    if not text:
        return None
    m = DATE_RE.search(text)
    if not m:
        m = VERBAL_DATE_RE.search(_fold(text))
    if not m:
        return None
    day, month, year = m.group(1), m.group(2), m.group(3)
    return f"{int(day):02d}/{int(month):02d}/{year}"


def _space_glued_words(value: str) -> str:
    """Re-insert spaces OCR dropped between words ("HongNam" -> "Hong Nam", "7Ho" -> "7 Ho")."""
    out: list[str] = []
    for i, ch in enumerate(value):
        prev = value[i - 1] if i > 0 else ""
        if ch.isupper() and (prev.islower() or prev.isdigit()):
            out.append(" ")
        out.append(ch)
    return _norm(re.sub(r"\s*,\s*", ", ", "".join(out)))


def _validate(field: str, raw: Optional[str]) -> Optional[str]:
    """Turn a raw OCR fragment into a field value, or None when it is not a plausible value."""
    value = _norm((raw or "").strip(VALUE_STRIP))
    if not value:
        return None
    if field in DATE_FIELDS:
        if field == "expiry_date" and NO_EXPIRY_RE.search(value):
            return _norm(NO_EXPIRY_RE.search(value).group(0))
        return _normalize_date(value)
    if field == "gender":
        first = value.split()[0].strip(VALUE_STRIP)
        if _fold(first) in GENDER_TOKENS:
            return first
        return value if len(value) <= 10 else None
    letters = sum(ch.isalpha() for ch in value)
    if field in ("full_name", "nationality"):
        if letters < 2 or any(ch.isdigit() for ch in value):
            return None
        return value
    if field in PLACE_FIELDS:
        return value if letters >= 2 else None
    return value


@dataclass
class _Ctx:
    boxes: list[OcrBox]
    hits: list[list[LabelHit]]


def _tail_after_field(ctx: _Ctx, bi: int, field: str) -> Optional[str]:
    """Text in box `bi` following the last consecutive label of `field`, up to the next label."""
    hits = ctx.hits[bi]
    text = ctx.boxes[bi].text
    for k, hit in enumerate(hits):
        if hit.field != field:
            continue
        last = k
        while last + 1 < len(hits) and hits[last + 1].field == field:
            last += 1
        end = hits[last + 1].start if last + 1 < len(hits) else len(text)
        return text[hits[last].end:end]
    return None


def _neighbour_text(ctx: _Ctx, bi: int, field: str) -> Optional[str]:
    """Usable text of a neighbour box: whole text if label-free, tail if it carries the same label."""
    if _is_mrz(ctx.boxes[bi].text):
        return None
    hits = ctx.hits[bi]
    if not hits:
        return ctx.boxes[bi].text
    if all(h.field == field for h in hits):
        return _tail_after_field(ctx, bi, field)
    if hits[0].start > 0:
        return ctx.boxes[bi].text[:hits[0].start]
    return None


def _right_of(ctx: _Ctx, bi: int) -> list[int]:
    b = ctx.boxes[bi]
    out = []
    for j, o in enumerate(ctx.boxes):
        if j == bi:
            continue
        overlap = min(b.y2, o.y2) - max(b.y1, o.y1)
        if overlap >= 0.4 * min(b.h, o.h) and o.x1 >= b.x2 - 0.5 * b.h:
            out.append(j)
    return sorted(out, key=lambda j: ctx.boxes[j].x1)


def _vertical_neighbours(ctx: _Ctx, bi: int, below: bool) -> list[int]:
    b = ctx.boxes[bi]
    out = []
    for j, o in enumerate(ctx.boxes):
        if j == bi:
            continue
        if below:
            gap = o.y1 - b.y2
            ok = o.y1 >= b.y1 + 0.5 * b.h and gap <= 1.5 * b.h
        else:
            gap = b.y1 - o.y2
            ok = o.y2 <= b.y2 - 0.5 * b.h and gap <= 1.5 * b.h
        left_aligned = b.x1 - 1.5 * b.h <= o.x1 <= b.x1 + 0.6 * (b.x2 - b.x1)
        if ok and left_aligned:
            out.append(j)
    return sorted(out, key=lambda j: abs(ctx.boxes[j].y1 - b.y1))


def _continuation_lines(ctx: _Ctx, bi: int, max_lines: int = 2) -> list[str]:
    """Wrapped lines of a multi-line place value, aligned with the value column of box `bi`."""
    parts: list[str] = []
    current = bi
    used = {bi}
    column_x = ctx.boxes[bi].x1
    for _ in range(max_lines):
        cur = ctx.boxes[current]
        nxt = None
        for j in sorted(range(len(ctx.boxes)), key=lambda k: ctx.boxes[k].y1):
            o = ctx.boxes[j]
            if j in used or o.y1 < cur.y1 + 0.5 * cur.h or o.y1 - cur.y2 > 1.0 * cur.h:
                continue
            if not (column_x - 1.5 * cur.h <= o.x1 <= column_x + 4 * cur.h):
                continue
            nxt = j
            break
        if nxt is None or ctx.hits[nxt] or _is_mrz(ctx.boxes[nxt].text):
            break
        parts.append(ctx.boxes[nxt].text)
        used.add(nxt)
        current = nxt
    return parts


def _extract_field(ctx: _Ctx, field: str) -> Optional[str]:
    for bi, hits in enumerate(ctx.hits):
        if not any(h.field == field for h in hits):
            continue
        if field == "issue_date" and any(h.field == "expiry_date" for h in hits):
            continue

        inline = _validate(field, _tail_after_field(ctx, bi, field))
        if inline:
            if field in PLACE_FIELDS:
                extra = _continuation_lines(ctx, bi)
                return _space_glued_words(", ".join([inline] + extra))
            return inline

        candidates = _right_of(ctx, bi) + _vertical_neighbours(ctx, bi, below=True)
        if field == "expiry_date":
            candidates += _vertical_neighbours(ctx, bi, below=False)
        for j in candidates:
            value = _validate(field, _neighbour_text(ctx, j, field))
            if value:
                if field in PLACE_FIELDS:
                    extra = _continuation_lines(ctx, j)
                    return _space_glued_words(", ".join([value] + extra))
                return value
    return None


def _extract_id(ctx: _Ctx) -> Optional[str]:
    texts = [b.text for b in ctx.boxes if not _is_mrz(b.text)]
    for regex in (ID12_RE, ID9_RE):
        for t in texts:
            if DATE_RE.search(t):
                continue
            m = regex.search(t.replace(" ", ""))
            if m:
                return m.group(1)
    return None


def _extract_mrz_name(ctx: _Ctx) -> Optional[str]:
    for b in ctx.boxes:
        t = b.text.replace(" ", "").upper()
        if "<<<" not in t:
            continue
        head = t.split("<<<", 1)[0]
        if re.fullmatch(r"[A-Z]+(<{1,2}[A-Z]+)+", head):
            return _norm(head.replace("<", " "))
    return None


def detect_card_layout(full_text: str) -> Optional[str]:
    compact, _ = _compact_with_map(full_text or "")
    if any(_approx_find(compact, m, _max_errors(m)) for m in LAYOUT_2024_MARKERS):
        return "cccd_2024"
    if _approx_find(compact, "cancuoccongdan", 2) or _approx_find(compact, "noithuongtru", 1):
        return "cccd_2016_2021"
    return None


def _boxes_from_lines(lines: list[tuple[str, float]]) -> list[OcrBox]:
    """Fallback geometry (one full-width row per line) when box coordinates are unavailable."""
    return [
        OcrBox(text=t, conf=c, x1=0, y1=i * 10, x2=1000, y2=i * 10 + 8)
        for i, (t, c) in enumerate(lines)
    ]


def parse_id_fields(
    full_text: str,
    lines: list[tuple[str, float]],
    boxes: Optional[list[OcrBox]] = None,
) -> dict[str, Any]:
    """
    Extract CCCD fields from one side's OCR output.
    Returns canonical keys plus legacy aliases. Missing values are None — never fabricated.
    """
    usable = [b for b in (boxes if boxes is not None else _boxes_from_lines(lines)) if _norm(b.text)]
    for b in usable:
        b.text = _norm(b.text)
    ctx = _Ctx(boxes=usable, hits=[_label_hits(b.text) for b in usable])

    personal_id = _extract_id(ctx)
    full_name = _extract_field(ctx, "full_name") or _extract_mrz_name(ctx)
    date_of_birth = _extract_field(ctx, "date_of_birth")
    gender = _extract_field(ctx, "gender")
    nationality = _extract_field(ctx, "nationality")
    place_of_birth = _extract_field(ctx, "place_of_birth_registration")
    place_of_residence = _extract_field(ctx, "place_of_residence")
    issue_date = _extract_field(ctx, "issue_date")
    if issue_date is None:
        m = VERBAL_DATE_RE.search(_fold(full_text or ""))
        if m:
            issue_date = f"{int(m.group(1)):02d}/{int(m.group(2)):02d}/{m.group(3)}"
    expiry_date = _extract_field(ctx, "expiry_date")

    return {
        "personal_identification_number": personal_id,
        "full_name": full_name,
        "date_of_birth": date_of_birth,
        "gender": gender,
        "nationality": nationality,
        "place_of_birth_registration": place_of_birth,
        "place_of_residence": place_of_residence,
        "issue_date": issue_date,
        "expiry_date": expiry_date,
        # Legacy aliases
        "id_number": personal_id,
        "name": full_name,
        "dob": date_of_birth,
        "address": place_of_residence,
    }


def expected_field_side(field: str, layout: Optional[str]) -> str:
    """Side of the card on which a field is printed (used to tell the user which side to retake)."""
    if field == "issue_date":
        return "back"
    if layout == "cccd_2024" and field in (
        "place_of_birth_registration", "place_of_residence", "expiry_date",
    ):
        return "back"
    return "front"


def merge_id_card_fields(
    front_fields: Optional[dict[str, Any]],
    back_fields: Optional[dict[str, Any]],
    layout: Optional[str] = None,
) -> dict[str, Any]:
    """
    Merge front + back OCR fields. Each field is read from the side it is printed on first,
    then the other side. `field_sides` reports the side a value came from, or — when missing —
    the side the user should retake. Never invents missing values.
    """
    sources = {"front": front_fields or {}, "back": back_fields or {}}

    def text_of(side: str, key: str) -> Optional[str]:
        v = sources[side].get(key)
        if v is None:
            return None
        s = str(v).strip()
        return s or None

    merged: dict[str, Any] = {}
    field_sides: dict[str, str] = {}
    for key in FIELD_KEYS:
        preferred = expected_field_side(key, layout)
        other = "back" if preferred == "front" else "front"
        value, side = None, preferred
        for candidate in (preferred, other):
            value = text_of(candidate, key)
            if value:
                side = candidate
                break
        merged[key] = value
        field_sides[key] = side

    merged.update({
        "id_number": merged["personal_identification_number"],
        "name": merged["full_name"],
        "dob": merged["date_of_birth"],
        "address": merged["place_of_residence"],
        "card_layout": layout,
        "field_sides": field_sides,
    })
    return merged
