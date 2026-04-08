package com.daiphat.accountservice.application.port.in;

/**
 * Port vào cho các nghiệp vụ liên quan đến Email.
 * Chuyên trách: Xử lý logic nghiệp vụ gửi email (Render template, chuẩn bị dữ liệu).
 */
public interface EmailServicePort {
    /**
     * Gửi email mã OTP cho luồng Quên mật khẩu.
     * @param email Địa chỉ email nhận.
     * @param otp Mã OTP 6 số.
     */
    void sendForgotPasswordEmail(String email, String otp);
}
