package com.daiphat.accountservice.presentation.controller;

import com.daiphat.accountservice.application.dto.request.ForgotPasswordRequestDTO;
import com.daiphat.accountservice.application.dto.request.LoginRequestDTO;
import com.daiphat.accountservice.application.dto.request.LogoutRequestDTO;
import com.daiphat.accountservice.application.dto.request.RefreshTokenRequestDTO;
import com.daiphat.accountservice.application.dto.request.ResetPasswordRequestDTO;
import com.daiphat.accountservice.application.dto.request.UserRegistrationRequestDTO;
import com.daiphat.accountservice.application.dto.request.VerifyOtpRequestDTO;
import com.daiphat.accountservice.application.dto.response.ApiResponseDTO;
import com.daiphat.accountservice.application.dto.response.AuthResponseDTO;
import com.daiphat.accountservice.application.dto.response.ForgotPasswordResponseDTO;
import com.daiphat.accountservice.application.dto.response.VerifyOtpResponseDTO;
import com.daiphat.accountservice.application.port.in.AuthServicePort;
import com.daiphat.accountservice.presentation.constants.ApiConstants;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiConstants.AUTH)
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private static final String FORGOT_PASSWORD = "/forgot-password";
    private final AuthServicePort authServicePort;

    @PostMapping(FORGOT_PASSWORD + "/request")
    public ResponseEntity<ApiResponseDTO<ForgotPasswordResponseDTO>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequestDTO request) {
        log.info("REST request to forgot password for email: {}", request.getEmail());
        ForgotPasswordResponseDTO response = authServicePort.forgotPassword(request);
        return ResponseEntity.ok(ApiResponseDTO.<ForgotPasswordResponseDTO>builder()
                .data(response)
                .message("Mã xác thực đã được gửi về Email của bạn.")
                .build());
    }

    @PostMapping(FORGOT_PASSWORD + "/resend")
    public ResponseEntity<ApiResponseDTO<ForgotPasswordResponseDTO>> resendOtp(
            @Valid @RequestBody ForgotPasswordRequestDTO request) {
        log.info("REST request to resend OTP for email: {}", request.getEmail());
        ForgotPasswordResponseDTO response = authServicePort.resendForgotPasswordOtp(request);
        return ResponseEntity.ok(ApiResponseDTO.<ForgotPasswordResponseDTO>builder()
                .data(response)
                .message("Mã xác thực mới đã được gửi.")
                .build());
    }

    @PostMapping(FORGOT_PASSWORD + "/verify")
    public ResponseEntity<ApiResponseDTO<VerifyOtpResponseDTO>> verifyOtp(@Valid @RequestBody VerifyOtpRequestDTO request) {
        VerifyOtpResponseDTO response = authServicePort.verifyResetOtp(request);
        return ResponseEntity.ok(ApiResponseDTO.<VerifyOtpResponseDTO>builder()
                .data(response)
                .message("OTP verified successfully.")
                .build());
    }

    @PostMapping(FORGOT_PASSWORD + "/reset")
    public ResponseEntity<ApiResponseDTO<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequestDTO request) {
        log.info("REST request to reset password");
        authServicePort.resetPassword(request);
        return ResponseEntity.ok(ApiResponseDTO.<Void>builder()
                .message("Password has been reset successfully.")
                .build());
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponseDTO<AuthResponseDTO>> login(@Valid @RequestBody LoginRequestDTO request) {
        log.info("REST request to login for user: {}", request.getUsername());
        AuthResponseDTO response = authServicePort.login(request);
        return ResponseEntity.ok(ApiResponseDTO.<AuthResponseDTO>builder()
                .data(response)
                .message("Login successful.")
                .build());
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponseDTO<Void>> logout(@Valid @RequestBody LogoutRequestDTO request) {
        log.info("REST request to logout");
        authServicePort.logout(request);
        return ResponseEntity.ok(ApiResponseDTO.<Void>builder()
                .message("Logged out successfully.")
                .build());
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponseDTO<Void>> register(@Valid @RequestBody UserRegistrationRequestDTO request) {
        log.info("REST request to register user: {}", request.username());
        authServicePort.register(request);
        return ResponseEntity.ok(ApiResponseDTO.<Void>builder()
                .message("User registered successfully.")
                .build());
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<ApiResponseDTO<AuthResponseDTO>> refreshToken(@Valid @RequestBody RefreshTokenRequestDTO request) {
        log.info("REST request to refresh token");
        AuthResponseDTO response = authServicePort.refreshToken(request);
        return ResponseEntity.ok(ApiResponseDTO.<AuthResponseDTO>builder()
                .data(response)
                .message("Token refreshed successfully.")
                .build());
    }
}
