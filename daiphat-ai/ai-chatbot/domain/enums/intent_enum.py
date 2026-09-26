from enum import Enum

class IntentEnum(str, Enum):
    # Lottery Queries
    WEB_SEARCH = "WEB_SEARCH"      # Tìm vé, chọn vé
    WEB_RESULT = "WEB_RESULT"      # Xem kết quả, dò số
    WEB_SUGGEST = "WEB_SUGGEST"    # Giải mã giấc mơ, gợi ý số
    WEB_SCHEDULE = "WEB_SCHEDULE"  # Lịch quay thưởng
    
    # Action/Support
    WEB_ACCOUNT = "WEB_ACCOUNT"    # Ví, nạp tiền, trúng thưởng
    WEB_SUPPORT = "WEB_SUPPORT"    # Hướng dẫn, hỗ trợ kỹ thuật
    
    # Casual/Risk
    TRASH_TALK = "TRASH_TALK"      # Nói chuyện phiếm, "rác", greeting
    SYSTEM_ATTACK = "SYSTEM_ATTACK" # Hack, spam hệ thống
    
    # Fallback
    OTHER_KNOWLEDGE = "OTHER_KNOWLEDGE" # Kiến thức chung ngoài xổ số
    UNKNOWN = "UNKNOWN"            # Không xác định
    
    # Chat-specific
    ESCALATE_REQUEST = "ESCALATE_REQUEST" # Yêu cầu gặp nhân viên thật
