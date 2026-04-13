package com.daiphat.accountservice.application.dto.response;

import lombok.Builder;
import java.util.UUID;

@Builder
public record RoleResponseDTO(
    java.util.UUID id,
    String code,
    String name,
    String description
) {}
