package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.application.dto.response.base.Views;
import com.fasterxml.jackson.annotation.JsonView;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Builder
public record LotteryResultResponse(
        @JsonView(Views.Public.class) Long id,
        @JsonView(Views.Public.class) Long stationId,
        @JsonView(Views.Public.class) String stationName,
        @JsonView(Views.Admin.class) String region,
        @JsonView(Views.Public.class) LocalDate drawDate,
        @JsonView(Views.Admin.class) String source,
        @JsonView(Views.Admin.class) boolean isOfficial,
        @JsonView(Views.Public.class) String status,
        @JsonView(Views.Admin.class) LocalDateTime publishedAt,
        @JsonView(Views.Admin.class) LocalDateTime lastSyncedAt,
        @JsonView(Views.Admin.class) LocalDateTime createdAt,
        @JsonView(Views.Admin.class) LocalDateTime updatedAt,
        @JsonView(Views.Admin.class) String createdBy,
        @JsonView(Views.Admin.class) String lastModifiedBy
) {}
