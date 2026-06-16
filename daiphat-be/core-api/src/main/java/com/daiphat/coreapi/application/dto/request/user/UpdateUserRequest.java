package com.daiphat.coreapi.application.dto.request.user;

import lombok.Builder;

import java.time.LocalDate;
import java.util.List;

@Builder
public record UpdateUserRequest(
    String firstName,
    String lastName,
    String phone,
    String roleCode,
    List<String> roles,
    String status,
    String gender,
    LocalDate dob,
    String avatar
) {}
