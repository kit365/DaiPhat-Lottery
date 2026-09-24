from __future__ import annotations
import re
from typing import Any

# Danh sách "Đen" - Loại trừ các từ khóa hệ thống để tránh nhầm là Tên
EXCLUDE_KEYWORDS = [
    "CONG HOA", "XÃ HỘI", "CHỦ NGHĨA", "VIỆT NAM", "DOC LAP", "TU DO", "HANH PHUC",
    "CỤC TRƯỞNG", "DIRECTOR GENERAL", "POLICE", "DEPARTMENT", "ADMINISTRATION",
    "SOCIALIST", "REPUBLIC", "IDENTITY", "CARD", "CĂN CƯỚC", "CHỨNG MINH",
    "GIA TRỊ ĐẾN", "EXPIRY", "QUÊ QUÁN", "NƠI THƯỜNG TRÚ", "NƠI ĐĂNG KÝ",
    "C06", "AN NINH", "CANH SAT", "CHÍNH PHỦ", "NGÖN TRÖ", "INDEX FINGER", "PHẠM CÔNG NGUYÊN"
]

# Các từ khóa báo hiệu kết thúc phần địa chỉ hoặc dòng rác cần bỏ qua
ADDRESS_STOP_KEYWORDS = [
    "nhan dang", "dđnd", "date of expiry", "date ot expiry", "expiry",
    "date of", "date ot", "date",
    "gia tri den", "co gia tri den", "có giá trị đến", "ngay het han", "ngày hết hạn",
]

def parse_id_fields(full_text: str, lines: list[tuple[str, float]]) -> dict[str, Any]:
    out: dict[str, Any] = {
        "name": None,
        "id_number": None,
        "dob": None,
        "address": None,
        "expiry_date": None,
    }

    # --- 1. LẤY SỐ CCCD (12 số hoặc 9 số) ---
    m12 = re.search(r"(\d{12})", full_text)
    m9 = re.search(r"(\d{9})", full_text)
    out["id_number"] = m12.group(1) if m12 else (m9.group(1) if m9 else None)

    # --- 2. LẤY NGÀY SINH & HẠN SỬ DỤNG ---
    dates = re.findall(r"\b(\d{2}[/-]\d{2}[/-]\d{4})\b", full_text)
    if dates:
        out["dob"] = dates[0].replace("-", "/")
        if len(dates) > 1:
            out["expiry_date"] = dates[-1].replace("-", "/")

    # --- 3. LẤY HỌ VÀ TÊN ---
    raw_lines = [line[0].strip() for line in lines]

    # Cách A: Tìm dưới keyword "Họ và tên"
    for i, s in enumerate(raw_lines):
        up = s.upper()
        if re.search(r"(HO TEN|HO VA TEN|FULL NAME|NAME)", up):
            if i + 1 < len(raw_lines):
                candidate = raw_lines[i + 1].strip()
                if len(candidate) > 3 and candidate.isupper() and not any(c.isdigit() for c in candidate):
                    out["name"] = candidate.title()
                    break

    # Cách B: Tìm trong dòng MRZ (Mặt sau)
    if out["name"] is None:
        mrz_match = re.search(r"([A-Z]+<<[A-Z]+<[A-Z]+)", full_text.upper())
        if mrz_match:
            name_raw = mrz_match.group(1).replace("<<", " ").replace("<", " ")
            out["name"] = name_raw.title()

    # Cách C: Lọc rác lấy dòng IN HOA dài nhất (Fallback cuối cùng)
    if out["name"] is None:
        best = None
        best_len = 0
        for s in raw_lines:
            up_s = s.upper()
            if any(kw in up_s for kw in EXCLUDE_KEYWORDS): continue
            if len(s) > 5 and s.isupper() and not any(c.isdigit() for c in s):
                if len(s) > best_len:
                    best_len = len(s)
                    best = s
        if best:
            out["name"] = best.title()

    # --- 4. LẤY ĐỊA CHỈ (Logic đã sửa lỗi bị mất đoạn) ---
    address_parts = []
    is_reading_address = False

    for line in full_text.split('\n'):
        line = line.strip()
        if not line: continue
        low = line.lower()

        # Bắt đầu đọc khi thấy keyword địa chỉ
        if any(kw in low for kw in ["thuong tru", "residence", "thường trú"]):
            is_reading_address = True
            if ":" in line:
                tail = line.split(":", 1)[1].strip()
                if tail: address_parts.append(tail)
            continue

        if is_reading_address:
            # Chỉ dừng hẳn khi gặp phần "Nhận dạng"
            if any(kw in low for kw in ["nhan dang", "dđnd", "dac diem"]):
                break

            is_trash_line = False
            for marker in ADDRESS_STOP_KEYWORDS:
                if marker in low:
                    # Nếu dòng có ngày tháng (thường là dòng Expiry), ta bỏ qua dòng này
                    if re.search(r'\d{2}[/-]\d{2}[/-]\d{4}', line):
                        is_trash_line = True
                        break
                    else:
                        # Nếu chỉ chứa chữ rác (VD: "C6 gia tri den"), ta xóa chữ đó đi và lấy phần còn lại
                        line = re.sub(f"(?i){marker}", "", line).strip()

            if is_trash_line or not line:
                continue

            # Tránh lấy nhầm lại Tên hoặc Số ID vào địa chỉ
            if line.isupper() and len(line) > 5 and not any(c.isdigit() for c in line): continue
            if re.match(r'^\d{9,12}$', line): continue

            address_parts.append(line)

    if address_parts:
        addr = ", ".join(address_parts)
        # 1. Sửa lỗi dính chữ (OCR hay bị)
        addr = re.sub(r'([a-zà-ỹ])([A-ZÀ-Ỹ])', r'\1 \2', addr)
        addr = re.sub(r'(\d)([A-ZÀ-Ỹa-zà-ỹ])', r'\1 \2', addr)
        addr = re.sub(r'([A-ZÀ-Ỹa-zà-ỹ])(\d)', r'\1 \2', addr)

        # 2. Mở rộng viết tắt cho chuyên nghiệp
        addr = re.sub(r'(?i)\bKhu\s*Ph\b', 'Khu phố', addr)
        addr = re.sub(r'(?i)\bP\s*(\d+)', r'Phường \1', addr)
        addr = re.sub(r'(?i)\bQ\s*(\d+)', r'Quận \1', addr)
        addr = re.sub(r'(?i)\bP\.\s+', 'Phường ', addr)
        addr = re.sub(r'(?i)\bQ\.\s+', 'Quận ', addr)
        addr = re.sub(r'(?i)\bTP\.\s*', 'TP. ', addr)

        # 3. Dọn dẹp ký tự đơn lẻ (như chữ "C" sót lại từ "C6")
        addr = re.sub(r'\b[Cc]\s*\d?\b(?=,|$)', '', addr)

        # 4. Xóa dấu phẩy thừa và khoảng trắng
        addr = re.sub(r',\s*,', ',', addr)
        addr = re.sub(r'\s{2,}', ' ', addr)
        out["address"] = addr.strip(", ")

    return out