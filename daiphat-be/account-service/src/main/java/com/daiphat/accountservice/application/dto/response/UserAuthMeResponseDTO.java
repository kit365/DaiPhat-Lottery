package com.daiphat.accountservice.application.dto.response;

import lombok.Builder;
import java.util.UUID;

@Builder
public record UserAuthMeResponseDTO(
    UUID id,
    String username,
    String email,
    String firstName,
    String lastName,
    AuthMeRoleResponseDTO role,
    String avatarUrl
) {}
