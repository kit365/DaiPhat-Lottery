package com.daiphat.accountservice.application.dto.request.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

import java.util.List;

@Builder
public record UpdateUserRequest(
    String fullName,
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    String email,
    String phone,
    List<String> roles,
    String status,
    String avatar
) {}
