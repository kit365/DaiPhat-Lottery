package com.daiphat.accountservice.application.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Builder;

@Builder(toBuilder = true)
public record UserRegistrationRequestDTO(
    @NotBlank(message = MSG_USERNAME_REQUIRED)
    @Size(min = 4, max = 50, message = MSG_USERNAME_LENGTH)
    @Pattern(regexp = "^[a-z0-9_]+$", message = MSG_USERNAME_PATTERN)
    String username,

    @NotBlank(message = MSG_EMAIL_REQUIRED)
    @Email(message = MSG_EMAIL_INVALID)
    String email,

    @NotBlank(message = MSG_PASSWORD_REQUIRED)
    @Size(min = 8, max = 128, message = MSG_PASSWORD_LENGTH)
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,128}$", 
             message = MSG_PASSWORD_PATTERN)
    String password,

    @NotBlank(message = MSG_FIRSTNAME_REQUIRED)
    @Size(max = 100, message = MSG_FIELD_TOO_LONG)
    String firstName,

    @NotBlank(message = MSG_LASTNAME_REQUIRED)
    @Size(max = 100, message = MSG_FIELD_TOO_LONG)
    String lastName,

    @NotBlank(message = MSG_PHONE_REQUIRED)
    @Pattern(regexp = "^[0-9]{10,15}$", message = MSG_PHONE_PATTERN)
    @Size(max = 100, message = MSG_FIELD_TOO_LONG)
    String phone,

    @AssertTrue(message = MSG_TERMS_REQUIRED)
    boolean agreedToTerms
) {
    public static final String MSG_USERNAME_REQUIRED = "Username không được để trống";
    public static final String MSG_USERNAME_LENGTH = "Tên đăng nhập phải từ 4 đến 50 ký tự";
    public static final String MSG_USERNAME_PATTERN = "Username chỉ được chứa chữ cái viết thường, số và dấu gạch dưới, không có khoảng trắng";
    
    public static final String MSG_EMAIL_REQUIRED = "Email không được để trống";
    public static final String MSG_EMAIL_INVALID = "Định dạng email không hợp lệ";
    
    public static final String MSG_PASSWORD_REQUIRED = "Mật khẩu không được để trống";
    public static final String MSG_PASSWORD_LENGTH = "Password too long (max 128 characters)";
    public static final String MSG_PASSWORD_PATTERN = "Mật khẩu phải chứa chữ hoa, chữ thường, số và ký tự đặc biệt";
    
    public static final String MSG_FIRSTNAME_REQUIRED = "Tên không được để trống";
    public static final String MSG_LASTNAME_REQUIRED = "Họ không được để trống";
    public static final String MSG_FIELD_TOO_LONG = "Thông tin nhập vào quá dài (Tối đa 100 ký tự).";
    
    public static final String MSG_PHONE_REQUIRED = "Số điện thoại không được để trống";
    public static final String MSG_PHONE_PATTERN = "Định dạng số điện thoại không hợp lệ";
    
    public static final String MSG_TERMS_REQUIRED = "Bạn phải chấp nhận Điều khoản & Điều kiện";
}
