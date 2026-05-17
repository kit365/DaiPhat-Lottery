package com.daiphat.accountservice.application.dto.request.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

@Builder
public record CreateUserRequest(
    String firstName,
    String lastName,
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    String email,
    String phone,
    String roleCode,
    String status,
    String avatar
) {}
