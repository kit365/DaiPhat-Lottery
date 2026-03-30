package com.smartlotto.accountservice.domain.model;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserImageModel {
    private UUID id;
    private UUID userId;
    private String imageUrl;
    private boolean current;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
