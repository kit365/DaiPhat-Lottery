import unicodedata
import re

def normalize_text(text: str) -> str:
    """
    Chuẩn hóa văn bản tiếng Việt:
    - Loại bỏ khoảng trắng thừa
    - Đưa về chữ thường
    """
    if not text:
        return ""
    
    text = str(text).lower().strip()
    # Loại bỏ khoảng trắng thừa (nhiều space thành 1)
    text = re.sub(r'\s+', ' ', text)
    return text

def remove_accents(text: str) -> str:
    """
    Loại bỏ dấu tiếng Việt
    """
    if not text:
        return ""
    text = unicodedata.normalize('NFD', text)
    text = text.encode('ascii', 'ignore').decode("utf-8")
    return str(text)
