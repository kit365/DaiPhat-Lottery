package com.smartlotto.accountservice.application.dto.response;

import lombok.Builder;
import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record UserImageResponseDTO(
    UUID id,
    String imageUrl,
    boolean current,
    LocalDateTime createdAt
) {}
