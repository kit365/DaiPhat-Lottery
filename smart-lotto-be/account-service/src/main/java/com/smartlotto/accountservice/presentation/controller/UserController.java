package com.smartlotto.accountservice.presentation.controller;

import com.smartlotto.accountservice.application.dto.request.UserRegistrationRequestDTO;
import com.smartlotto.accountservice.application.dto.response.ApiResponseDTO;
import com.smartlotto.accountservice.application.dto.response.UserResponseDTO;
import com.smartlotto.accountservice.application.port.in.UserServicePort;
import com.smartlotto.accountservice.presentation.constants.ApiConstants;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(ApiConstants.USERS)
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserServicePort userServicePort;

    @GetMapping("/me")
    public ResponseEntity<ApiResponseDTO<UserResponseDTO>> getCurrentUser(@AuthenticationPrincipal String userId) {
        log.info("REST request to get current user profile: {}", userId);
        UserResponseDTO response = userServicePort.getById(UUID.fromString(userId));
        return ResponseEntity.ok(ApiResponseDTO.<UserResponseDTO>builder()
                .data(response)
                .build());
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponseDTO<UserResponseDTO>> register(@Valid @RequestBody UserRegistrationRequestDTO request) {
        log.info("REST request to register user: {}", request.username());
        UserResponseDTO response = userServicePort.register(request);
        return new ResponseEntity<>(ApiResponseDTO.<UserResponseDTO>builder()
                .data(response)
                .build(), HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponseDTO<UserResponseDTO>> getById(@PathVariable UUID id) {
        log.info("REST request to get user by id: {}", id);
        return ResponseEntity.ok(ApiResponseDTO.<UserResponseDTO>builder()
                .data(userServicePort.getById(id))
                .build());
    }

    @GetMapping("/username/{username}")
    public ResponseEntity<ApiResponseDTO<UserResponseDTO>> getByUsername(@PathVariable String username) {
        log.info("REST request to get user by username: {}", username);
        return ResponseEntity.ok(ApiResponseDTO.<UserResponseDTO>builder()
                .data(userServicePort.getByUsername(username))
                .build());
    }

    @GetMapping
    public ResponseEntity<ApiResponseDTO<List<UserResponseDTO>>> getAll() {
        log.info("REST request to get all users");
        return ResponseEntity.ok(ApiResponseDTO.<List<UserResponseDTO>>builder()
                .data(userServicePort.getAll())
                .build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponseDTO<Void>> delete(@PathVariable UUID id) {
        log.info("REST request to delete user by id: {}", id);
        userServicePort.delete(id);
        return ResponseEntity.ok(ApiResponseDTO.<Void>builder()
                .message("Đã xóa người dùng thành công.")
                .build());
    }
}
