package com.daiphat.coreapi.application.dto.request.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

import java.time.LocalDate;
import java.util.List;

@Builder
public record CreateUserRequest(
    String firstName,
    String lastName,
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    String email,
    String phone,
    String gender,
    LocalDate dob,
    String roleCode,
    List<String> roles,
    String status,
    String avatar
) {}
