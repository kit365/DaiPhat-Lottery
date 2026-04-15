package com.daiphat.accountservice.application.dto.response;

import java.util.Set;
import java.util.UUID;

public record UserAuthMeResponseDTO(
    UUID id,
    String username,
    String email,
    String firstName,
    String lastName,
    AuthMeRoleResponseDTO role,
    Set<String> permissions,
    String avatarUrl
) {}
