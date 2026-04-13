package com.daiphat.accountservice.application.dto.response;

import lombok.Builder;

@Builder
public record AuthMeRoleResponseDTO(
    String code,
    String name
) {}
