package com.daiphat.coreapi.application.dto.request.user;

import lombok.Builder;

import java.util.List;

@Builder
public record UpdateUserRequest(
    String firstName,
    String lastName,
    String phone,
    String address,
    String roleCode,
    List<String> roles,
    String status,
    String avatar
) {}
