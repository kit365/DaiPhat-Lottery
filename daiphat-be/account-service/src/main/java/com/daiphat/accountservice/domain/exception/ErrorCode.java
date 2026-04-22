package com.daiphat.accountservice.domain.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    // Auth Errors
    INVALID_CREDENTIALS("AUTH_001", "Tên đăng nhập hoặc mật khẩu không chính xác.", HttpStatus.BAD_REQUEST),
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
    
    // System Errors
    UNCATEGORIZED_EXCEPTION("SYS_001", "Lỗi chưa được phân loại.", HttpStatus.INTERNAL_SERVER_ERROR),
    INTERNAL_SERVER_ERROR("SYS_002", "Hệ thống đang bận, vui lòng thử lại sau.", HttpStatus.INTERNAL_SERVER_ERROR),
    TOO_MANY_REQUESTS("SYS_003", 
            "Bạn đã thực hiện quá nhiều yêu cầu, vui lòng thử lại sau %s giây.", 
            HttpStatus.TOO_MANY_REQUESTS),
    INVALID_KEY("SYS_004", "Mã lỗi không hợp lệ.", HttpStatus.BAD_REQUEST),
    SYNC_FAILED("SYS_005", "Đồng bộ dữ liệu thất bại.", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_INPUT("SYS_006", "Dữ liệu nhập vào không hợp lệ.", HttpStatus.BAD_REQUEST),
    PASSWORD_CONFIRM_MISMATCH("AUTH_030", "Xác nhận mật khẩu không khớp", HttpStatus.BAD_REQUEST),
    ACCESS_DENIED("AUTH_031", "Bạn không có quyền truy cập tài nguyên này.", HttpStatus.FORBIDDEN);

    private final String code;
    private final String message;
    private final HttpStatus status;

    ErrorCode(String code, String message, HttpStatus status) {
        this.code = code;
        this.message = message;
        this.status = status;
    }
}
