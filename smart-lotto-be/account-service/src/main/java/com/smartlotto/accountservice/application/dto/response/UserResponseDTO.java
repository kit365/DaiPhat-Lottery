package com.smartlotto.accountservice.application.dto.response;

import lombok.Builder;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Builder
public record UserResponseDTO(
    UUID id,
    String username,
    String email,
    String firstName,
    String lastName,
    String zodiac,
    String fortune,
    Integer age,
    RoleResponseDTO role,
    String status,
    
    // Security flags
    boolean emailVerified,
    boolean twoFactorEnabled,
    boolean agreedToTerms,
    
    // Lockout info
    Integer failedLoginAttempts,
    LocalDateTime lockedUntil,
    
    // Nested Relationships
    List<UserImageResponseDTO> images,
    List<UserAddressResponseDTO> addresses,
    
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
