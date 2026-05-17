package com.daiphat.accountservice.application.dto.request.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

@Builder
public record UpdateUserRequest(
    String firstName,
    String lastName,
    String phone,
    String roleCode,
    String status,
    String avatar
) {}
