package com.daiphat.accountservice.presentation.controller;

import com.daiphat.accountservice.application.dto.request.LoginRequestDTO;
import com.daiphat.accountservice.application.dto.request.LogoutRequestDTO;
import com.daiphat.accountservice.application.dto.request.RefreshTokenRequestDTO;
import com.daiphat.accountservice.application.dto.request.UserRegistrationRequestDTO;
import com.daiphat.accountservice.application.dto.response.ApiResponseDTO;
import com.daiphat.accountservice.application.dto.response.AuthResponseDTO;
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

    private final AuthServicePort authServicePort;

    @PostMapping("/login")
    public ResponseEntity<ApiResponseDTO<AuthResponseDTO>> login(@Valid @RequestBody LoginRequestDTO request) {
        log.info("REST request to login user: {}", request.getUsername());
        AuthResponseDTO response = authServicePort.login(request);
        
        return ResponseEntity.ok(ApiResponseDTO.<AuthResponseDTO>builder()
                .data(response)
                .build());
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponseDTO<Void>> logout(@Valid @RequestBody LogoutRequestDTO request) {
        log.info("REST request to logout");
        authServicePort.logout(request);
        return ResponseEntity.ok(ApiResponseDTO.<Void>builder()
                .message("Logged out successfully")
                .build());
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponseDTO<AuthResponseDTO>> refresh(@Valid @RequestBody RefreshTokenRequestDTO request) {
        log.info("REST request to refresh token");
        AuthResponseDTO response = authServicePort.refreshToken(request);
        return ResponseEntity.ok(ApiResponseDTO.<AuthResponseDTO>builder()
                .data(response)
                .build());
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponseDTO<Void>> register(@Valid @RequestBody UserRegistrationRequestDTO request) {
        log.info("REST request to register user: {}", request.username());
        authServicePort.register(request);
        return ResponseEntity.ok(ApiResponseDTO.<Void>builder()
                .message("User registered successfully")
                .build());
    }
}
