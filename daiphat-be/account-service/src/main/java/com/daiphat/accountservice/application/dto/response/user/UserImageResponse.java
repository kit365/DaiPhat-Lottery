package com.daiphat.accountservice.application.dto.response.user;

import com.daiphat.accountservice.application.dto.response.base.Views;
import com.fasterxml.jackson.annotation.JsonView;
import lombok.Builder;
import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record UserImageResponse(
    @JsonView(Views.Public.class)
    UUID id,

    @JsonView(Views.Public.class)
    String imageUrl,

    @JsonView(Views.Public.class)
    boolean current,

    @JsonView(Views.Public.class)
    LocalDateTime createdAt
) {
}
