package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.application.dto.response.base.Views;
import com.fasterxml.jackson.annotation.JsonView;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record LotteryResultDetailResponse(
        @JsonView(Views.Admin.class) Long id,
        @JsonView(Views.Admin.class) Long lotteryResultId,
        @JsonView(Views.Admin.class) Long prizeStructureId,
        @JsonView(Views.Admin.class) String prizeLevel,
        @JsonView(Views.Admin.class) String prizeDisplayName,
        @JsonView(Views.Public.class) String prizeCode,
        @JsonView(Views.Admin.class) Integer displayOrder,
        @JsonView(Views.Admin.class) Integer matchDigits,
        @JsonView(Views.Admin.class) String matchFrom,
        @JsonView(Views.Admin.class) String matchFromDisplayName,
        @JsonView(Views.Public.class) String winningNumber,
        @JsonView(Views.Admin.class) LocalDateTime createdAt,
        @JsonView(Views.Admin.class) LocalDateTime updatedAt,
        @JsonView(Views.Admin.class) String createdBy,
        @JsonView(Views.Admin.class) String lastModifiedBy
) {}
