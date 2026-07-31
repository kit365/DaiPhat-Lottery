package com.daiphat.coreapi.domain.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    // Auth Errors
    INVALID_CREDENTIALS("AUTH_001", "Tên đăng nhập hoặc mật khẩu không chính xác.", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED("AUTH_002", "Bạn không có quyền truy cập tài nguyên này.", HttpStatus.UNAUTHORIZED),
    TOKEN_EXPIRED("AUTH_003", "Token đã hết hạn.", HttpStatus.UNAUTHORIZED),
    OTP_INVALID("AUTH_004", "Mã xác thực OTP không chính xác.", HttpStatus.BAD_REQUEST),
    OTP_EXPIRED("AUTH_005", "Mã xác thực OTP đã hết hạn.", HttpStatus.BAD_REQUEST),
    RESET_TOKEN_INVALID("AUTH_006", "Phiên đổi mật khẩu không hợp lệ hoặc đã hết hạn.", HttpStatus.BAD_REQUEST),
    USERNAME_REQUIRED("AUTH_007", "Username không được để trống", HttpStatus.BAD_REQUEST),
    PASSWORD_REQUIRED("AUTH_008", "Password không được để trống", HttpStatus.BAD_REQUEST),
    LASTNAME_REQUIRED("AUTH_009", "Họ không được để trống", HttpStatus.BAD_REQUEST),
    FIRSTNAME_REQUIRED("AUTH_010", "Tên không được để trống", HttpStatus.BAD_REQUEST),
    EMAIL_REQUIRED("AUTH_011", "Email không được để trống", HttpStatus.BAD_REQUEST),
    EMAIL_INVALID("AUTH_012", "Email không hợp lệ", HttpStatus.BAD_REQUEST),
    PHONE_REQUIRED("AUTH_013", "Số điện thoại không được để trống", HttpStatus.BAD_REQUEST),
    PHONE_INVALID("AUTH_014", "Số điện thoại không hợp lệ", HttpStatus.BAD_REQUEST),
    USERNAME_EXISTED("AUTH_015", "Username đã được sử dụng", HttpStatus.BAD_REQUEST),
    EMAIL_EXISTED("AUTH_016", "Email đã được sử dụng", HttpStatus.BAD_REQUEST),
    PASSWORD_WEAK("AUTH_017", 
            "Mật khẩu không đủ mạnh (Cần ít nhất 8 ký tự, bao gồm chữ hoa, "
            + "chữ thường, số và ký tự đặc biệt).", HttpStatus.BAD_REQUEST),
    USERNAME_INVALID("AUTH_018", 
            "Username không hợp lệ (3-20 ký tự, chỉ chấp nhận chữ cái, số và dấu gạch dưới).", 
            HttpStatus.BAD_REQUEST),
    FIELD_TOO_LONG("AUTH_019", "Thông tin nhập vào quá dài (Tối đa 100 ký tự).", HttpStatus.BAD_REQUEST),
    USER_INACTIVE("AUTH_020", 
            "Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email để xác nhận.", 
            HttpStatus.FORBIDDEN),
    USER_BANNED("AUTH_021", 
            "Tài khoản bị khóa vĩnh viễn. Vui lòng liên hệ bộ phận CSKH để được hỗ trợ.", 
            HttpStatus.FORBIDDEN),
    USER_LOCKED("AUTH_022", "Vui lòng thử lại sau %s giây.", HttpStatus.FORBIDDEN),
    EMAIL_NOT_VERIFIED("AUTH_023", 
            "Email chưa được xác thực. Vui lòng kiểm tra hộp thư của bạn.", 
            HttpStatus.FORBIDDEN),
    REFRESH_TOKEN_EXPIRED("AUTH_024", "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.", HttpStatus.UNAUTHORIZED),
    VERIFY_TOKEN_INVALID("AUTH_025", "Mã xác thực email không hợp lệ hoặc đã hết hạn.", HttpStatus.BAD_REQUEST),
    PASSWORD_CONTAINS_EMAIL("AUTH_026", "Mật khẩu không được chứa thông tin Email/Username.", HttpStatus.BAD_REQUEST),
    OTP_MAX_ATTEMPTS_EXCEEDED("AUTH_027", 
            "Vượt quá số lần xác thực OTP. Vui lòng yêu cầu mã mới.", 
            HttpStatus.TOO_MANY_REQUESTS),
    PHONE_EXISTED("AUTH_028", "Số điện thoại đã được sử dụng", HttpStatus.BAD_REQUEST),
    VERIFY_TOKEN_EXPIRED("AUTH_029", "Link xác thực đã hết hạn", HttpStatus.BAD_REQUEST),
    
    // User Errors
    USER_NOT_FOUND("USR_001", "Người dùng không tồn tại", HttpStatus.NOT_FOUND),
    USER_EXISTED("USR_002", "Người dùng đã tồn tại trong hệ thống.", HttpStatus.BAD_REQUEST),
    ROLE_NOT_FOUND("USR_003", "Hệ thống chưa cấu hình Role phù hợp.", HttpStatus.NOT_FOUND),
    USER_ID_MISMATCH("USR_004", 
            "Phát hiện sai lệch ID người dùng. Vui lòng liên hệ quản trị viên.", 
            HttpStatus.CONFLICT),
    USERNAME_NOT_FOUND("USR_005", "Username không tồn tại", HttpStatus.NOT_FOUND),
    EMAIL_NOT_FOUND("USR_006", "Email không tồn tại", HttpStatus.NOT_FOUND),
    INVITATION_INVALID("USR_007", "Lời mời không hợp lệ hoặc đã hết hạn", HttpStatus.BAD_REQUEST),
    INVITATION_EXPIRED("USR_008", "Lời mời đã hết hạn", HttpStatus.BAD_REQUEST),
    
    // System Errors
    UNCATEGORIZED_EXCEPTION("SYS_001", "Lỗi chưa được phân loại.", HttpStatus.INTERNAL_SERVER_ERROR),
    INTERNAL_SERVER_ERROR("SYS_002", "Hệ thống đang bận, vui lòng thử lại sau.", HttpStatus.INTERNAL_SERVER_ERROR),
    TOO_MANY_REQUESTS("SYS_003", 
            "Bạn đã thực hiện quá nhiều yêu cầu, vui lòng thử lại sau %s giây.", 
            HttpStatus.TOO_MANY_REQUESTS),
    INVALID_KEY("SYS_004", "Mã lỗi không hợp lệ.", HttpStatus.BAD_REQUEST),
    SYNC_FAILED("SYS_005", "Đồng bộ dữ liệu thất bại.", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_INPUT("SYS_006", "Dữ liệu nhập vào không hợp lệ.", HttpStatus.BAD_REQUEST),
    IMAGE_FILE_REQUIRED("SYS_007", "Vui lòng chọn một tệp hình ảnh.", HttpStatus.BAD_REQUEST),
    IMAGE_INVALID_TYPE("SYS_008", "Chỉ hỗ trợ tải lên các tệp định dạng hình ảnh.", HttpStatus.BAD_REQUEST),
    PASSWORD_CONFIRM_MISMATCH("AUTH_030", "Xác nhận mật khẩu không khớp", HttpStatus.BAD_REQUEST),
    ACCESS_DENIED("AUTH_031", "Bạn không có quyền truy cập tài nguyên này.", HttpStatus.FORBIDDEN),

    
    // Blog Errors
    BLOG_NOT_FOUND("BLG_001", "Bài viết không tồn tại.", HttpStatus.NOT_FOUND),
    CATEGORY_NOT_FOUND("BLG_002", "Danh mục không tồn tại.", HttpStatus.NOT_FOUND),
    TAG_NOT_FOUND("BLG_003", "Tag không tồn tại.", HttpStatus.NOT_FOUND),
    SLUG_EXISTED("BLG_004", "Slug đã được sử dụng.", HttpStatus.BAD_REQUEST),
    TAG_NAME_EXISTED("BLG_005", "Tên tag đã tồn tại.", HttpStatus.BAD_REQUEST),
    CATEGORY_PARENT_INVALID("BLG_006", "Danh mục cha không thể là chính nó.", HttpStatus.BAD_REQUEST),
    CATEGORY_PARENT_NOT_FOUND("BLG_007", "Danh mục cha không tồn tại.", HttpStatus.NOT_FOUND),
    BLOG_SCHEDULED_AT_REQUIRED("BLG_008", "Bài viết hẹn giờ đăng phải có thời gian lên lịch.", HttpStatus.BAD_REQUEST),
    BLOG_SCHEDULED_AT_FUTURE("BLG_009", "Thời gian lên lịch phải lớn hơn thời điểm hiện tại.", HttpStatus.BAD_REQUEST),

    // Notification Errors
    NOTIFICATION_NOT_FOUND("NTF_001", "Thông báo không tồn tại.", HttpStatus.NOT_FOUND),
    NOTIFICATION_DELETE_REQUIRES_READ("NTF_002", "Chỉ có thể xóa thông báo đã đọc.", HttpStatus.BAD_REQUEST),

    // Order Errors
    ORDER_NOT_FOUND("ORD_001", "Đơn hàng không tồn tại.", HttpStatus.NOT_FOUND),
    ORDER_INVALID_STATUS("ORD_002", "Trạng thái đơn hàng không hợp lệ cho thao tác này.", HttpStatus.BAD_REQUEST),
    ORDER_DETAIL_NOT_FOUND("ORD_003", "Chi tiết đơn hàng không tồn tại.", HttpStatus.NOT_FOUND),
    ORDER_DETAIL_INVALID_STATUS("ORD_004", "Trạng thái chi tiết đơn hàng không hợp lệ cho thao tác này.", HttpStatus.BAD_REQUEST),
    ORDER_REFUND_NOT_FOUND("ORD_005", "Yêu cầu hoàn tiền không tồn tại.", HttpStatus.NOT_FOUND),
    ORDER_REFUND_INVALID_STATUS("ORD_006", "Trạng thái yêu cầu hoàn tiền không hợp lệ cho thao tác này.", HttpStatus.BAD_REQUEST),
    ORDER_REFUND_BANK_INFO_REQUIRED("ORD_007", "Yêu cầu hoàn tiền chuyển khoản phải có đầy đủ thông tin ngân hàng.", HttpStatus.BAD_REQUEST),
    TRANSACTION_NOT_FOUND("ORD_008", "Giao dịch không tồn tại.", HttpStatus.NOT_FOUND),
    TRANSACTION_INVALID_STATUS("ORD_009", "Trạng thái giao dịch không hợp lệ cho thao tác này.", HttpStatus.BAD_REQUEST),
    UNSUPPORTED_PAYMENT_TYPE("ORD_010", "Phương thức thanh toán chưa được hỗ trợ.", HttpStatus.BAD_REQUEST),
    ORDER_CODE_GENERATION_FAILED("ORD_011", "Không thể tạo mã đơn hàng duy nhất.", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_PICKUP_TIME("ORD_012", "Thời gian hẹn lấy vé không hợp lệ.", HttpStatus.BAD_REQUEST),
    INVALID_TRANSACTION_AMOUNT("ORD_013", "Số tiền thanh toán không hợp lệ.", HttpStatus.BAD_REQUEST),
    TRANSACTION_SELECTION_REQUIRED("ORD_014", "Cần chỉ định giao dịch thanh toán.", HttpStatus.BAD_REQUEST),
    ONLINE_PAYMENT_MIN_AMOUNT("ORD_015", "Số tiền thanh toán online phải từ 10.000đ.", HttpStatus.BAD_REQUEST),
    USER_BANK_ACCOUNT_NOT_FOUND("ORD_016", "Tài khoản ngân hàng không tồn tại.", HttpStatus.NOT_FOUND),
    USER_BANK_ACCOUNT_ACCESS_DENIED("ORD_017", "Bạn không có quyền truy cập tài khoản ngân hàng này.", HttpStatus.FORBIDDEN),
    USER_BANK_ACCOUNT_INVALID_BIN("ORD_018", "Mã BIN ngân hàng không hợp lệ hoặc chưa được VietQR hỗ trợ.", HttpStatus.BAD_REQUEST),
    USER_BANK_ACCOUNT_DUPLICATE("ORD_019", "Tài khoản ngân hàng này đã được lưu.", HttpStatus.BAD_REQUEST),
    USER_BANK_ACCOUNT_IN_USE("ORD_020", "Không thể xóa tài khoản đang gắn yêu cầu hoàn tiền đang chờ xử lý.", HttpStatus.BAD_REQUEST),
    REFUND_REQUEST_NOT_FOUND("ORD_021", "Yêu cầu hoàn tiền không tồn tại.", HttpStatus.NOT_FOUND),
    REFUND_REQUEST_INVALID_STATUS("ORD_022", "Trạng thái yêu cầu hoàn tiền không hợp lệ cho thao tác này.", HttpStatus.BAD_REQUEST),
    REFUND_REQUEST_ORDER_MISMATCH("ORD_023", "Chi tiết đơn hàng không thuộc đơn hàng đã chọn.", HttpStatus.BAD_REQUEST),
    REFUND_REQUEST_BANK_ACCOUNT_MISMATCH("ORD_024", "Tài khoản ngân hàng không thuộc người yêu cầu hoàn tiền.", HttpStatus.BAD_REQUEST),
    REFUND_REQUEST_ACCESS_DENIED("ORD_025", "Bạn không có quyền truy cập yêu cầu hoàn tiền này.", HttpStatus.FORBIDDEN),
    REFUND_REQUEST_INVALID_AMOUNT("ORD_026", "Số tiền hoàn phải lớn hơn 0.", HttpStatus.BAD_REQUEST),
    REFUND_REQUEST_ORDER_DETAIL_REQUIRED("ORD_027", "Cần chỉ định chi tiết đơn hàng cho loại hoàn từng vé.", HttpStatus.BAD_REQUEST),
    VIETQR_BANK_LIST_UNAVAILABLE("ORD_028", "Không thể lấy danh sách ngân hàng từ VietQR.", HttpStatus.BAD_GATEWAY),
    REFUND_REQUEST_PARTIAL_NOT_ALLOWED("ORD_030", "Khách hàng chỉ được yêu cầu hoàn tiền toàn bộ đơn hàng.", HttpStatus.BAD_REQUEST),
    USER_BANK_ACCOUNT_TERMS_NOT_ACCEPTED("ORD_031", "Bạn cần xác nhận cam kết thông tin tài khoản ngân hàng.", HttpStatus.BAD_REQUEST),
    REFUND_REQUEST_USE_ORDER_REFUND_API("ORD_032", "Vui lòng sử dụng chức năng hủy đơn & hoàn tiền trên chi tiết đơn hàng đã thanh toán.", HttpStatus.BAD_REQUEST),
    REFUND_WINDOW_CLOSED("ORD_033", "Đã quá giờ chốt hủy đơn trong ngày (14:00).", HttpStatus.BAD_REQUEST),
    REFUND_WINDOW_EXPIRED("ORD_034", "Đã quá thời gian ân hạn hủy đơn, không thể yêu cầu hoàn tiền.", HttpStatus.BAD_REQUEST),
    REFUND_ORDER_NOT_PAID("ORD_035", "Chỉ có thể hủy & hoàn tiền đơn hàng đã thanh toán.", HttpStatus.BAD_REQUEST),
    REFUND_ORDER_ALREADY_REQUESTED("ORD_036", "Đơn hàng đã có yêu cầu hoàn tiền.", HttpStatus.BAD_REQUEST),
    REFUND_DAILY_LIMIT_EXCEEDED("ORD_037", "Bạn đã đạt giới hạn số yêu cầu hoàn tiền trong ngày. Vui lòng thử lại vào ngày mai.", HttpStatus.BAD_REQUEST),

    PRIZE_PAYOUT_NOT_FOUND("ORD_038", "Yêu cầu trả thưởng không tồn tại.", HttpStatus.NOT_FOUND),
    PRIZE_PAYOUT_INVALID_STATUS("ORD_039", "Trạng thái yêu cầu trả thưởng không hợp lệ cho thao tác này.", HttpStatus.BAD_REQUEST),
    PRIZE_PAYOUT_ACCESS_DENIED("ORD_040", "Bạn không có quyền truy cập yêu cầu trả thưởng này.", HttpStatus.FORBIDDEN),
    PRIZE_PAYOUT_NOT_ELIGIBLE("ORD_041", "Vé không đủ điều kiện trả thưởng.", HttpStatus.BAD_REQUEST),
    PRIZE_PAYOUT_ALREADY_REQUESTED("ORD_042", "Vé đã có yêu cầu trả thưởng hoặc đã được trả.", HttpStatus.BAD_REQUEST),
    PRIZE_PAYOUT_BANK_ACCOUNT_MISMATCH("ORD_043", "Tài khoản ngân hàng không thuộc khách hàng.", HttpStatus.BAD_REQUEST),
    PRIZE_PAYOUT_CODE_GENERATION_FAILED("ORD_044", "Không thể tạo mã yêu cầu trả thưởng.", HttpStatus.INTERNAL_SERVER_ERROR),

    // Lottery Errors
    // Lottery Product Errors
    LOTTERY_STATION_NOT_FOUND("LT_001", "Nhà đài không tồn tại.", HttpStatus.NOT_FOUND),
    LOTTERY_STATION_NAME_EXISTED("LT_002", "Tên nhà đài đã tồn tại.", HttpStatus.BAD_REQUEST),
    LOTTERY_STATION_INVALID_STATUS("LT_003", "Trạng thái sản phẩm không hợp lệ cho thao tác này.", HttpStatus.BAD_REQUEST),
    LOTTERY_STATION_INSUFFICIENT_INVENTORY("LT_004", "Tồn kho không đủ.", HttpStatus.BAD_REQUEST),
    LOTTERY_STATION_INVALID_DRAW_SCHEDULE("LT_030", "Lịch quay không hợp lệ.", HttpStatus.BAD_REQUEST),
    PRIZE_STRUCTURE_NOT_FOUND("LT_005", "Cấu trúc giải thưởng không tồn tại.", HttpStatus.NOT_FOUND),
    LOTTERY_TICKET_NOT_FOUND("LT_006", "Vé số không tồn tại.", HttpStatus.NOT_FOUND),
    LOTTERY_TICKET_INVALID_STATUS("LT_007", "Trạng thái vé số không hợp lệ cho thao tác này.", HttpStatus.BAD_REQUEST),
    LOTTERY_TICKET_SERIAL_EXISTED("LT_008", "Số sê-ri vé số đã tồn tại trong hệ thống.", HttpStatus.BAD_REQUEST),
    PRIZE_STRUCTURE_DUPLICATE_CODE("LT_009", "Mã giải thưởng bị trùng trong cùng sản phẩm.", HttpStatus.BAD_REQUEST),
    LOTTERY_STATION_INVALID_TYPE("LT_010", "Loại nhà đài không hợp lệ.", HttpStatus.BAD_REQUEST),
    LOTTERY_TICKET_ALREADY_VERIFIED("LT_011", "Vé số đã được xác minh trước đó.", HttpStatus.BAD_REQUEST),
    LOTTERY_TICKET_STATUS_REQUIRED("LT_012", "Trạng thái vé số không được để trống.", HttpStatus.BAD_REQUEST),
    LOTTERY_TICKET_NUMBERS_REQUIRED("LT_014", "Dãy số vé không được để trống.", HttpStatus.BAD_REQUEST),
    LOTTERY_TICKET_NUMBERS_INVALID("LT_015", "Dãy số vé chỉ được chứa chữ số.", HttpStatus.BAD_REQUEST),
    LOTTERY_TICKET_NUMBERS_LENGTH_INVALID(
            "LT_016",
            "Dãy số vé phải có từ %d đến %d chữ số.",
            HttpStatus.BAD_REQUEST
    ),
    LOTTERY_TICKET_DRAW_DATE_REQUIRED("LT_017", "Ngày quay không được để trống.", HttpStatus.BAD_REQUEST),
    LOTTERY_TICKET_DRAW_DATE_INVALID("LT_018", "Ngày quay không hợp lệ.", HttpStatus.BAD_REQUEST),
    PRIZE_STRUCTURE_LIST_REQUIRED("LT_019", "Danh sách cấu trúc giải thưởng không được để trống.", HttpStatus.BAD_REQUEST),
    PRIZE_STRUCTURE_PRODUCT_MISMATCH("LT_020", "Cấu trúc giải thưởng không thuộc sản phẩm này.", HttpStatus.BAD_REQUEST),
    PRIZE_STRUCTURE_INVALID_LEVEL("LT_021", "Bậc giải thưởng không hợp lệ.", HttpStatus.BAD_REQUEST),
    PRIZE_STRUCTURE_CODE_REQUIRED("LT_022", "Mã giải thưởng không được để trống.", HttpStatus.BAD_REQUEST),
    PRIZE_STRUCTURE_VALUE_INVALID("LT_023", "Giá trị giải thưởng phải lớn hơn hoặc bằng 0.", HttpStatus.BAD_REQUEST),
    PRIZE_STRUCTURE_QUANTITY_INVALID("LT_024", "Số lượng giải phải lớn hơn hoặc bằng 1.", HttpStatus.BAD_REQUEST),
    PRIZE_STRUCTURE_MATCH_RULE_INVALID("LT_025", "Quy tắc so khớp không hợp lệ.", HttpStatus.BAD_REQUEST),
    LOTTERY_TICKET_EXPIRED("LT_026", "Vé số đã hết hạn.", HttpStatus.BAD_REQUEST),
    LOTTERY_TICKET_BOOKING_CLOSED("LT_027", "Đã quá giờ chốt đặt vé cho kỳ quay hôm nay.", HttpStatus.BAD_REQUEST),
    PRIZE_STRUCTURE_REGION_INVALID("LT_028", "Cấu trúc giải dùng chung miền phải có region trùng với sản phẩm.", HttpStatus.BAD_REQUEST),
    PRIZE_STRUCTURE_MATCH_DIGITS_INVALID("LT_029", "Số chữ số khớp không hợp lệ.", HttpStatus.BAD_REQUEST),
    PRIZE_STRUCTURE_TEMPLATE_NOT_FOUND("LT_030", "Không tìm thấy mẫu cấu trúc giải cho miền này.", HttpStatus.BAD_REQUEST),
    PRIZE_STRUCTURE_TEMPLATE_REGION_REQUIRED("LT_031", "Miền không được để trống khi tạo đài.", HttpStatus.BAD_REQUEST),
    PRIZE_STRUCTURE_TEMPLATE_ITEM_NOT_FOUND("LT_032", "Mẫu cấu trúc giải không tồn tại.", HttpStatus.NOT_FOUND),
    PRIZE_STRUCTURE_TEMPLATE_DUPLICATE_CODE("LT_033", "Mã giải thưởng bị trùng trong cùng miền.", HttpStatus.BAD_REQUEST),
    PRIZE_STRUCTURE_TEMPLATE_LIST_REQUIRED("LT_034", "Danh sách mẫu cấu trúc giải không được để trống.", HttpStatus.BAD_REQUEST),
    PRIZE_STRUCTURE_SYNC_SOURCE_UNSUPPORTED("LT_046", "Nguồn dữ liệu đồng bộ cấu trúc giải chưa được hỗ trợ.", HttpStatus.BAD_REQUEST),
    PRIZE_STRUCTURE_SYNC_SOURCE_EMPTY("LT_047", "Nguồn dữ liệu không trả về cấu trúc giải hợp lệ.", HttpStatus.BAD_REQUEST),
    PRIZE_STRUCTURE_SYNC_SOURCE_INVALID("LT_048", "Nguồn dữ liệu cấu trúc giải chưa đủ sạch để đồng bộ.", HttpStatus.BAD_REQUEST),
    LOTTERY_STATION_SYNC_SOURCE_UNSUPPORTED("LT_035", "Nguồn dữ liệu đồng bộ nhà đài chưa được hỗ trợ.", HttpStatus.BAD_REQUEST),
    LOTTERY_STATION_SYNC_REGION_REQUIRED("LT_036", "Vui lòng chọn miền cần đồng bộ.", HttpStatus.BAD_REQUEST),
    LOTTERY_STATION_SYNC_REGION_UNSUPPORTED("LT_037", "Miền này chưa được hỗ trợ đồng bộ.", HttpStatus.BAD_REQUEST),
    LOTTERY_STATION_SYNC_SOURCE_EMPTY("LT_038", "Nguồn dữ liệu không trả về danh sách nhà đài hợp lệ.", HttpStatus.BAD_REQUEST),
    LOTTERY_STATION_SYNC_SOURCE_COUNT_MISMATCH("LT_039", "Số lượng nhà đài từ nguồn dữ liệu không khớp kỳ vọng.", HttpStatus.BAD_REQUEST),
    LOTTERY_STATION_SYNC_SOURCE_INVALID("LT_040", "Nguồn dữ liệu chưa đủ sạch để đồng bộ nhà đài.", HttpStatus.BAD_REQUEST),
    LOTTERY_STATION_SYNC_SOURCE_DUPLICATE("LT_041", "Nguồn dữ liệu chứa nhà đài bị trùng, chưa thể đồng bộ an toàn.", HttpStatus.BAD_REQUEST),
    LOTTERY_STATION_SYNC_DEFAULT_PRICE_REQUIRED("LT_042", "Cần truyền giá mặc định để tạo mới nhà đài.", HttpStatus.BAD_REQUEST),
    LOTTERY_STATION_SYNC_CANONICAL_NAME_REQUIRED("LT_043", "Nhà đài từ nguồn dữ liệu thiếu tên chuẩn.", HttpStatus.BAD_REQUEST),
    LOTTERY_STATION_ACTIVATION_INCOMPLETE("LT_044", "Nhà đài chưa đủ thông tin bắt buộc để kích hoạt.", HttpStatus.BAD_REQUEST),
    LOTTERY_REGION_NOT_FOUND("LT_044", "Miền không tồn tại.", HttpStatus.NOT_FOUND),
    LOTTERY_REGION_NUMBER_RANGE_INVALID("LT_045", "Khoảng số của miền không hợp lệ.", HttpStatus.BAD_REQUEST),
    LOTTERY_RESULT_NOT_FOUND("LT_049", "Kết quả quay số không tồn tại.", HttpStatus.NOT_FOUND),
    LOTTERY_RESULT_DUPLICATE_STATION_DRAW_DATE("LT_050", "Kết quả quay số của đài và ngày quay này đã tồn tại.", HttpStatus.BAD_REQUEST),
    LOTTERY_RESULT_STATUS_REQUIRED("LT_051", "Trạng thái kết quả quay số không được để trống.", HttpStatus.BAD_REQUEST),
    LOTTERY_RESULT_STATUS_INVALID("LT_052", "Trạng thái kết quả quay số không hợp lệ.", HttpStatus.BAD_REQUEST),
    LOTTERY_RESULT_DETAIL_NOT_FOUND("LT_053", "Chi tiết kết quả quay số không tồn tại.", HttpStatus.NOT_FOUND),
    LOTTERY_RESULT_DETAIL_WINNING_NUMBER_REQUIRED("LT_054", "Dãy số trúng không được để trống.", HttpStatus.BAD_REQUEST),
    LOTTERY_RESULT_DETAIL_WINNING_NUMBER_INVALID("LT_055", "Dãy số trúng chỉ được chứa chữ số.", HttpStatus.BAD_REQUEST),
    LOTTERY_RESULT_PRIZE_STRUCTURE_REQUIRED("LT_056", "Cấu trúc giải thưởng của dòng kết quả không được để trống.", HttpStatus.BAD_REQUEST),
    LOTTERY_RESULT_STATION_REQUIRED("LT_057", "Đài quay không được để trống.", HttpStatus.BAD_REQUEST),
    LOTTERY_RESULT_DRAW_DATE_REQUIRED("LT_058", "Ngày quay không được để trống.", HttpStatus.BAD_REQUEST),
    LOTTERY_RESULT_DETAIL_DUPLICATE("LT_059", "Dòng kết quả này đã tồn tại trong bảng chi tiết.", HttpStatus.BAD_REQUEST),
    LOTTERY_RESULT_SOURCE_UNSUPPORTED("LT_060", "Nguồn dữ liệu kết quả chưa được hỗ trợ.", HttpStatus.BAD_REQUEST),
    LOTTERY_RESULT_SOURCE_EMPTY("LT_061", "Nguồn dữ liệu không trả về kết quả hợp lệ.", HttpStatus.BAD_REQUEST),
    LOTTERY_RESULT_SOURCE_INVALID("LT_062", "Nguồn dữ liệu kết quả chưa đủ sạch để đồng bộ.", HttpStatus.BAD_REQUEST),
    LOTTERY_RESULT_RESYNC_NOT_ALLOWED("LT_063", "Chỉ có thể đồng bộ lại kết quả đang thiếu hoặc lỗi.", HttpStatus.CONFLICT),

    IMPORT_BATCH_NOT_FOUND("LT_064", "Phiếu nhập lô vé không tồn tại.", HttpStatus.NOT_FOUND),
    IMPORT_BATCH_CUTOFF_PASSED("LT_065", "Đã quá giờ chốt nhập lô vé cho kỳ quay hôm nay.", HttpStatus.BAD_REQUEST),
    IMPORT_BATCH_INVOICE_REQUIRED("LT_066", "Biên lai nhập lô là bắt buộc cho loại lô này.", HttpStatus.BAD_REQUEST),
    IMPORT_BATCH_INVALID_BATCH_TYPE("LT_067", "Loại lô nhập không hợp lệ.", HttpStatus.BAD_REQUEST),
    IMPORT_BATCH_DECLARE_QUANTITY_INVALID("LT_068", "Số lượng khai báo phải lớn hơn 0.", HttpStatus.BAD_REQUEST),
    IMPORT_BATCH_DRAW_DATE_INVALID("LT_069", "Ngày quay không khớp lịch quay của nhà đài.", HttpStatus.BAD_REQUEST),
    IMPORT_BATCH_STATION_INACTIVE("LT_070", "Nhà đài chưa được kích hoạt.", HttpStatus.BAD_REQUEST),
    IMPORT_BATCH_INVALID_STATUS("LT_071", "Trạng thái phiếu nhập lô không hợp lệ cho thao tác này.", HttpStatus.BAD_REQUEST),
    IMPORT_BATCH_IMPORT_COST_INVALID("LT_072", "Giá vốn nhập lô phải lớn hơn 0.", HttpStatus.BAD_REQUEST),
    IMPORT_BATCH_DRAFT_ALREADY_EXISTS(
            "LT_073",
            "Bạn đã có phiếu nhập lô chưa hoàn tất cho cùng nhà cung cấp, ngày quay và hình thức nhập. Bạn có thể tiếp tục phiếu hiện tại hoặc tạo phiếu mới cho đợt giao khác.",
            HttpStatus.CONFLICT
    ),
    IMPORT_BATCH_DUPLICATE_STATION("LT_076", "Mỗi nhà đài chỉ được khai báo một lần trong cùng phiếu nhập lô.", HttpStatus.BAD_REQUEST),
    LOTTERY_SUPPLIER_NOT_FOUND("LT_077", "Nhà cung cấp không tồn tại.", HttpStatus.NOT_FOUND),
    LOTTERY_SUPPLIER_CODE_DUPLICATE("LT_078", "Mã nhà cung cấp đã tồn tại.", HttpStatus.BAD_REQUEST),
    LOTTERY_SUPPLIER_INACTIVE("LT_079", "Nhà cung cấp đang ngừng hoạt động.", HttpStatus.BAD_REQUEST),
    IMPORT_BATCH_SUPPLIER_REQUIRED("LT_080", "Nhà cung cấp không được để trống.", HttpStatus.BAD_REQUEST),
    IMPORT_BATCH_NO_SUPPLIER_CONFIGURED(
            "LT_084",
            "Chưa có nhà cung cấp. Vui lòng tạo nhà cung cấp trước khi nhập vé.",
            HttpStatus.BAD_REQUEST
    ),
    IMPORT_BATCH_LINE_BATCH_CODE_MISSING(
            "LT_085",
            "Dòng phiếu nhập lô chưa có mã lô hệ thống.",
            HttpStatus.BAD_REQUEST
    ),
    IMPORT_BATCH_STATION_DRAFT_EXISTS(
            "LT_086",
            "Nhà đài đã có phiếu nhập nháp cho ngày quay này. Vui lòng hoàn tất phiếu hiện tại trước khi tạo mới.",
            HttpStatus.CONFLICT
    ),
    IMPORT_BATCH_ALL_STATIONS_DRAFT(
            "LT_087",
            "Tất cả nhà đài trong ngày quay đã có phiếu nhập nháp. Vui lòng hoàn tất các phiếu hiện tại hoặc chọn ngày quay khác.",
            HttpStatus.CONFLICT
    ),
    IMPORT_BATCH_CANCELLED(
            "LT_088",
            "Phiếu nhập lô đã bị hủy vì quá giờ chốt nhập lô cho kỳ quay hôm nay.",
            HttpStatus.BAD_REQUEST
    ),
    IMPORT_BATCH_LINE_CANCELLED(
            "LT_095",
            "Dòng nhập lô cho nhà đài này đã bị hủy và không thể nhập thêm vé.",
            HttpStatus.BAD_REQUEST
    ),

    LOTTERY_SUPPLIER_ACTIVATION_INCOMPLETE(
            "LT_081",
            "Nhà cung cấp chưa đủ thông tin bắt buộc để kích hoạt.",
            HttpStatus.BAD_REQUEST
    ),
    LOTTERY_SUPPLIER_PAYMENT_TERM_INVALID(
            "LT_082",
            "Số ngày thanh toán không được âm.",
            HttpStatus.BAD_REQUEST
    ),
    LOTTERY_SUPPLIER_IMPORT_COST_INVALID(
            "LT_083",
            "Giá vốn mặc định không được âm.",
            HttpStatus.BAD_REQUEST
    ),
    LOTTERY_TICKET_IMPORT_BATCH_REQUIRED("LT_074", "Vé số phải được tạo thông qua phiếu nhập lô.", HttpStatus.BAD_REQUEST),
    LOTTERY_TICKET_IMPORT_BATCH_MISMATCH("LT_075", "Thông tin vé số không khớp với phiếu nhập lô.", HttpStatus.BAD_REQUEST),
    IMPORT_BATCH_LINE_QUANTITY_EXCEEDED(
            "LT_084",
            "Số lượng vé nhập vượt quá số lượng khai báo của dòng phiếu.",
            HttpStatus.BAD_REQUEST
    ),
    LOTTERY_TICKET_NUMBERS_DUPLICATED_IN_REQUEST(
            "LT_085",
            "Dãy số bị trùng trong cùng một lần nhập.",
            HttpStatus.BAD_REQUEST
    ),
    LOTTERY_TICKET_SECTION_SERIALS_REQUIRED(
            "LT_089",
            "Mỗi dãy số phải có ít nhất một số sê-ri.",
            HttpStatus.BAD_REQUEST
    ),
    LOTTERY_TICKET_SERIAL_WITHOUT_NUMBERS(
            "LT_090",
            "Số sê-ri phải thuộc một dãy số.",
            HttpStatus.BAD_REQUEST
    ),
    IMPORT_BATCH_LINE_NOT_DELETABLE(
            "LT_091",
            "Không thể xóa dòng phiếu ở trạng thái hiện tại. Dòng đang nhập cần tạm dừng trước khi xóa.",
            HttpStatus.BAD_REQUEST
    ),
    IMPORT_BATCH_LINE_NOT_PAUSABLE(
            "LT_102",
            "Chỉ có thể tạm dừng dòng phiếu đang ở trạng thái Đang nhập.",
            HttpStatus.BAD_REQUEST
    ),
    IMPORT_BATCH_LINE_NOT_RESUMABLE(
            "LT_103",
            "Chỉ có thể tiếp tục nhập dòng phiếu đang ở trạng thái Tạm dừng nhập.",
            HttpStatus.BAD_REQUEST
    ),
    IMPORT_BATCH_LAST_LINE_CANNOT_DELETE(
            "LT_092",
            "Không thể xóa dòng cuối cùng của phiếu nhập lô.",
            HttpStatus.BAD_REQUEST
    ),
    IMPORT_BATCH_LINE_HAS_LOCKED_TICKETS(
            "LT_093",
            "Không thể xóa dòng phiếu vì có vé đã được giữ chỗ hoặc đã bán.",
            HttpStatus.CONFLICT
    ),
    IMPORT_BATCH_LINE_NOT_EDITABLE(
            "LT_094",
            "Dòng phiếu nhập lô không thể chỉnh sửa ở trạng thái hiện tại (đã nhập đủ hoặc đã hủy). Dòng đang nhập không được đổi nhà đài.",
            HttpStatus.BAD_REQUEST
    ),
    IMPORT_BATCH_LINE_DECLARE_QUANTITY_LOCKED_IMPORTING(
            "LT_104",
            "Không thể sửa số lượng khai báo khi dòng đang nhập. Vui lòng tạm dừng nhập trước khi chỉnh sửa.",
            HttpStatus.BAD_REQUEST
    ),
    IMPORT_BATCH_LINE_DECLARE_QUANTITY_REQUIRES_ADJUSTMENT_FLOW(
            "LT_105",
            "Không thể sửa số lượng khai báo trực tiếp khi dòng đang tạm dừng. Vui lòng dùng chức năng Điều chỉnh số lượng khai báo.",
            HttpStatus.BAD_REQUEST
    ),
    IMPORT_BATCH_LINE_IMPORTED_CONFIRMATION_REQUIRED(
            "LT_106",
            "Số lượng khai báo khớp số vé đã nhập. Vui lòng xác nhận để đánh dấu dòng là Đã nhập đủ.",
            HttpStatus.BAD_REQUEST
    ),
    IMPORT_BATCH_INVOICE_EVIDENCE_LOCKED(
            "LT_107",
            "Không thể thay đổi ảnh biên lai khi chỉnh sửa phiếu nhập lô. Ảnh biên lai chỉ xem được.",
            HttpStatus.BAD_REQUEST
    ),
    IMPORT_BATCH_SUPPLIER_LOCKED_IMPORTED_LINES(
            "LT_097",
            "Không thể thay đổi nhà cung cấp khi phiếu nhập lô đã chuyển sang trạng thái Đang nhập hoặc Nhập một phần.",
            HttpStatus.BAD_REQUEST
    ),
    IMPORT_BATCH_DECLARE_QUANTITY_BELOW_IMPORTED(
            "LT_096",
            "Số lượng khai báo (%d) không được nhỏ hơn số vé đã nhập (%d). Vui lòng xóa bớt vé đã nhập trước khi giảm số lượng khai báo.",
            HttpStatus.BAD_REQUEST
    ),
    IMPORT_BATCH_DECLARE_QUANTITY_MISMATCH(
            "LT_098",
            "Tổng số lượng khai báo của các nhà đài phải bằng Tổng số lượng khai báo của phiếu nhập lô.",
            HttpStatus.BAD_REQUEST
    ),
    IMPORT_BATCH_DECLARE_QUANTITY_REDUCTION_IMPORTED_ONLY(
            "LT_099",
            "Không thể giảm số lượng khai báo vì phần vé thừa nằm ở các dòng đã nhập hoàn tất (IMPORTED). Chỉ được xóa vé ở dòng OPEN, IMPORTING hoặc PAUSED.",
            HttpStatus.BAD_REQUEST
    ),
    IMPORT_BATCH_DECLARE_QUANTITY_REDUCTION_TICKETS_INVALID(
            "LT_100",
            "Danh sách vé cần xóa không hợp lệ hoặc chưa đủ số lượng yêu cầu (%d vé).",
            HttpStatus.BAD_REQUEST
    ),
    IMPORT_BATCH_TICKET_DELETE_LINE_IMPORTED(
            "LT_101",
            "Không được xóa vé thuộc dòng phiếu nhập lô đã hoàn tất (IMPORTED).",
            HttpStatus.BAD_REQUEST
    ),

    // Street Agent Profile Errors
    STREET_AGENT_PROFILE_NOT_FOUND("SAG_001", "Hồ sơ đại lý bán dạo không tồn tại.", HttpStatus.NOT_FOUND),
    STREET_AGENT_PROFILE_PHONE_EXISTED("SAG_002", "Số điện thoại đã được sử dụng cho hồ sơ khác.", HttpStatus.BAD_REQUEST),
    STREET_AGENT_PROFILE_CCCD_EXISTED("SAG_003", "Số CCCD đã được sử dụng cho hồ sơ khác.", HttpStatus.BAD_REQUEST),
    STREET_AGENT_PROFILE_INVALID_STATUS("SAG_004", "Trạng thái hồ sơ không hợp lệ.", HttpStatus.BAD_REQUEST),
    STREET_AGENT_PROFILE_INVALID_CONTRACT_DATE("SAG_005", "Ngày kết thúc hợp đồng phải sau ngày bắt đầu.", HttpStatus.BAD_REQUEST),

    // Support Ticket Errors
    TICKET_NOT_FOUND("TKT_001", "Yêu cầu hỗ trợ không tồn tại.", HttpStatus.NOT_FOUND),
    TICKET_ACCESS_DENIED("TKT_002", "Bạn không có quyền truy cập yêu cầu hỗ trợ này.", HttpStatus.FORBIDDEN),
    TICKET_CATEGORY_NOT_FOUND("TKT_003", "Danh mục yêu cầu hỗ trợ không tồn tại.", HttpStatus.NOT_FOUND),
    TICKET_INVALID_STATUS("TKT_004", "Trạng thái yêu cầu hỗ trợ không hợp lệ cho thao tác này.", HttpStatus.BAD_REQUEST),
    TICKET_CANNOT_UPDATE("TKT_005", "Không thể cập nhật yêu cầu hỗ trợ ở trạng thái hiện tại.", HttpStatus.BAD_REQUEST),
    TICKET_CANNOT_CLOSE("TKT_006", "Chỉ có thể đóng yêu cầu hỗ trợ đang ở trạng thái mới tạo.", HttpStatus.BAD_REQUEST),
    TICKET_REF_REQUIRED("TKT_007", "Danh mục này yêu cầu chọn đối tượng tham chiếu.", HttpStatus.BAD_REQUEST),
    TICKET_REF_INVALID("TKT_008", "Đối tượng tham chiếu không hợp lệ.", HttpStatus.BAD_REQUEST),
    TICKET_REF_ORDER_MISMATCH("TKT_009", "Đơn hàng không thuộc tài khoản của bạn.", HttpStatus.BAD_REQUEST),
    TICKET_ATTACHMENT_ONLY_ALLOWED("TKT_010", "Ở trạng thái chờ phản hồi, chỉ được cập nhật tệp đính kèm.", HttpStatus.BAD_REQUEST),
    TICKET_COMMENT_NOT_ALLOWED("TKT_011", "Không thể gửi tin nhắn khi yêu cầu đã được giải quyết, từ chối hoặc đã đóng.", HttpStatus.BAD_REQUEST),
    TICKET_COMMENT_TURN_VIOLATION("TKT_012", "Vui lòng chờ phản hồi từ bên còn lại trước khi gửi tin nhắn mới.", HttpStatus.BAD_REQUEST),
    TICKET_COMMENT_CONTENT_INVALID("TKT_013", "Nội dung tin nhắn không được để trống.", HttpStatus.BAD_REQUEST),
    TICKET_CANNOT_ASSIGN("TKT_014", "Chỉ có thể tiếp nhận yêu cầu hỗ trợ đang ở trạng thái mới tạo.", HttpStatus.BAD_REQUEST),
    TICKET_CANNOT_RESOLVE("TKT_015", "Không thể giải quyết yêu cầu hỗ trợ ở trạng thái hiện tại.", HttpStatus.BAD_REQUEST),
    TICKET_RESOLUTION_INVALID("TKT_016", "Nội dung phương án giải quyết không được để trống.", HttpStatus.BAD_REQUEST),
    TICKET_OPERATOR_MUST_ASSIGN_FIRST("TKT_017", "Vui lòng tiếp nhận ticket trước khi trả lời khách hàng.", HttpStatus.BAD_REQUEST),
    TICKET_REF_REFUND_MISMATCH(
            "TKT_018",
            "Yêu cầu hoàn tiền không tồn tại hoặc không thuộc tài khoản của bạn.",
            HttpStatus.BAD_REQUEST),
    TICKET_REFUND_COMPLAINT_TOO_EARLY(
            "TKT_019",
            "Yêu cầu hoàn tiền vẫn trong thời gian cam kết xử lý (%d giờ). Vui lòng chờ trong khi chúng tôi xử lý yêu cầu của bạn.",
            HttpStatus.BAD_REQUEST),
    TICKET_REFUND_COMPLAINT_STATUS_INVALID(
            "TKT_020",
            "Trạng thái yêu cầu hoàn tiền không hợp lệ cho loại khiếu nại này.",
            HttpStatus.BAD_REQUEST),
    TICKET_REFUND_COMPLAINT_WINDOW_EXPIRED(
            "TKT_021",
            "Yêu cầu hoàn tiền này đã hết thời hạn khiếu nại (hết hạn sau %d ngày).",
            HttpStatus.BAD_REQUEST),
    TICKET_CANNOT_REJECT("TKT_022", "Không thể từ chối yêu cầu hỗ trợ ở trạng thái hiện tại.", HttpStatus.BAD_REQUEST),
    TICKET_CANNOT_ACCEPT_RESOLUTION(
            "TKT_023",
            "Chỉ có thể xác nhận hài lòng khi yêu cầu đang ở trạng thái đã giải quyết.",
            HttpStatus.BAD_REQUEST),
    TICKET_CANNOT_REOPEN_RESOLUTION(
            "TKT_024",
            "Chỉ có thể mở lại yêu cầu khi đang ở trạng thái đã giải quyết.",
            HttpStatus.BAD_REQUEST),
    TICKET_STAFF_ACTION_INVALID("TKT_025", "Hành động phản hồi của nhân viên không hợp lệ.", HttpStatus.BAD_REQUEST),
    TICKET_REASON_COMMENT_REQUIRED(
            "TKT_026",
            "Phải có bình luận lý do hợp lệ khi giải quyết hoặc từ chối yêu cầu.",
            HttpStatus.BAD_REQUEST),
    TICKET_CANNOT_AUTO_CLOSE(
            "TKT_027",
            "Chỉ có thể tự động đóng yêu cầu đang ở trạng thái đã giải quyết.",
            HttpStatus.BAD_REQUEST),
    TICKET_ORDER_COMPLAINT_NOT_ELIGIBLE(
            "TKT_028",
            "%s",
            HttpStatus.BAD_REQUEST),
    TICKET_ORDER_COMPLAINT_CATEGORY_MISMATCH(
            "TKT_029",
            "Loại khiếu nại không phù hợp với trạng thái đơn hàng hiện tại.",
            HttpStatus.BAD_REQUEST),
    TICKET_ORDER_COMPLAINT_EVIDENCE_REQUIRED(
            "TKT_030",
            "Khiếu nại lỗi đồng bộ thanh toán yêu cầu đính kèm biên lai chuyển khoản.",
            HttpStatus.BAD_REQUEST),

    // Chat Errors
    CONVERSATION_NOT_FOUND("CHT_001", "Không tìm thấy cuộc trò chuyện.", HttpStatus.NOT_FOUND),
    CONVERSATION_ACCESS_DENIED("CHT_002", "Bạn không thuộc cuộc trò chuyện này.", HttpStatus.FORBIDDEN),
    CONVERSATION_ASSIGNED_TO_OTHER("CHT_003", "Hội thoại đã được phân công cho nhân viên khác.", HttpStatus.BAD_REQUEST),
    CONVERSATION_CLOSE_DENIED("CHT_004", "Bạn không thể đóng hội thoại này.", HttpStatus.FORBIDDEN),
    CONVERSATION_ALREADY_CLOSED("CHT_005", "Cuộc trò chuyện đã đóng.", HttpStatus.BAD_REQUEST),
    CONVERSATION_CANNOT_ESCALATE("CHT_006", "Cuộc trò chuyện không thể chuyển cho nhân viên.", HttpStatus.BAD_REQUEST),
    CONVERSATION_ALREADY_ASSIGNED("CHT_007", "Hội thoại đã được nhân viên khác nhận.", HttpStatus.BAD_REQUEST),
    CONVERSATION_CANNOT_ASSIGN("CHT_008", "Hội thoại không thể nhận ở trạng thái hiện tại.", HttpStatus.BAD_REQUEST),
    CONVERSATION_UNASSIGN_DENIED("CHT_009", "Bạn không thể trả hội thoại này.", HttpStatus.FORBIDDEN),
    CONVERSATION_ESCALATE_DENIED("CHT_010", "Bạn không có quyền chuyển hội thoại này.", HttpStatus.FORBIDDEN),
    CONVERSATION_VIEW_DENIED("CHT_011", "Bạn không có quyền xem lịch sử hội thoại này.", HttpStatus.FORBIDDEN),
    AI_SERVICE_CONFIG_NOT_FOUND("CHT_012", "Thiếu cấu hình AI bắt buộc trong hệ thống.", HttpStatus.INTERNAL_SERVER_ERROR),
    AI_SERVICE_CONFIG_INVALID("CHT_013", "Cấu hình AI không hợp lệ hoặc thiếu giá trị bắt buộc.", HttpStatus.INTERNAL_SERVER_ERROR),
    CONVERSATION_CANNOT_CANCEL_STAFF_REQUEST(
            "CHT_014",
            "Không thể huỷ yêu cầu gặp nhân viên ở trạng thái hiện tại.",
            HttpStatus.BAD_REQUEST
    ),

    // System Config Errors
    SYSTEM_CONFIG_NOT_FOUND("CFG_001", "Cấu hình hệ thống không tồn tại.", HttpStatus.NOT_FOUND),
    SYSTEM_CONFIG_VALUE_INVALID("CFG_002", "Giá trị cấu hình không hợp lệ với kiểu dữ liệu.", HttpStatus.BAD_REQUEST),
    SYSTEM_CONFIG_TYPE_INVALID("CFG_003", "Loại cấu hình không hợp lệ.", HttpStatus.BAD_REQUEST),
    SYSTEM_CONFIG_NOT_EDITABLE("CFG_004", "Cấu hình này không cho phép chỉnh sửa bởi Admin.", HttpStatus.FORBIDDEN);

    private final String code;
    private final String message;
    private final HttpStatus status;

    ErrorCode(String code, String message, HttpStatus status) {
        this.code = code;
        this.message = message;
        this.status = status;
    }
}
