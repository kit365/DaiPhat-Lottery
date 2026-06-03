package com.daiphat.coreapi.application.dto.request.user;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Builder;

@Builder(toBuilder = true)
public record UserRegistrationRequest(
        @NotBlank(message = MSG_USERNAME_REQUIRED)
        @Size(min = 4, max = 50, message = MSG_USERNAME_LENGTH)
        @Pattern(regexp = "^[a-z0-9_@.]+$", message = MSG_USERNAME_PATTERN)
        String username,

        @NotBlank(message = MSG_EMAIL_REQUIRED)
        @Email(message = MSG_EMAIL_INVALID)
        String email,

        @NotBlank(message = MSG_PASSWORD_REQUIRED)
        @Size(min = 6, max = 100, message = MSG_PASSWORD_LENGTH)
        @Pattern(regexp = "^[A-Z][^\\s]{5,99}$", message = MSG_PASSWORD_PATTERN)
        String password,

        @NotBlank(message = MSG_FIRSTNAME_REQUIRED)
        @Size(max = 100, message = MSG_FIELD_TOO_LONG)
        String firstName,

        @NotBlank(message = MSG_LASTNAME_REQUIRED)
        @Size(max = 100, message = MSG_FIELD_TOO_LONG)
        String lastName,

        @NotBlank(message = MSG_PHONE_REQUIRED)
        @Pattern(regexp = "^0(3[2-9]|7[06-9]|8[1-9]|9[0-46-9]|5[2689])[0-9]{7}$", message = MSG_PHONE_PATTERN)
        @Size(max = 100, message = MSG_FIELD_TOO_LONG)
        String phone,

        @AssertTrue(message = MSG_TERMS_REQUIRED)
        boolean agreedToTerms
) {
    public static final String MSG_USERNAME_REQUIRED = "Username không được để trống";
    public static final String MSG_USERNAME_LENGTH = "Tên đăng nhập phải từ 4 đến 50 ký tự";
    public static final String MSG_USERNAME_PATTERN = "Username chỉ được chứa chữ cái viết thường, "
            + "số, dấu gạch dưới, ký tự @ và dấu chấm, không có khoảng trắng";
    public static final String MSG_EMAIL_REQUIRED = "Email không được để trống";
    public static final String MSG_EMAIL_INVALID = "Định dạng email không hợp lệ";
    public static final String MSG_PASSWORD_REQUIRED = "Mật khẩu không được để trống";
    public static final String MSG_PASSWORD_LENGTH = "Mật khẩu phải từ 6 đến 100 ký tự";
    public static final String MSG_PASSWORD_PATTERN = "Mật khẩu phải bắt đầu bằng chữ hoa và không có khoảng trắng";
    public static final String MSG_FIRSTNAME_REQUIRED = "Tên không được để trống";
    public static final String MSG_LASTNAME_REQUIRED = "Họ không được để trống";
    public static final String MSG_FIELD_TOO_LONG = "Thông tin nhập vào quá dài (Tối đa 100 ký tự).";
    public static final String MSG_PHONE_REQUIRED = "Số điện thoại không được để trống";
    public static final String MSG_PHONE_PATTERN = "Số điện thoại không hợp lệ hoặc không thuộc nhà mạng hỗ trợ";
    public static final String MSG_TERMS_REQUIRED = "Bạn phải chấp nhận Điều khoản & Điều kiện";
}
