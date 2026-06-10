package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.application.dto.response.base.Views;
import com.fasterxml.jackson.annotation.JsonView;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record LotteryTicketResponse(
        @JsonView(Views.Public.class) UUID id,
        @JsonView(Views.Public.class) UUID productId,
        @JsonView(Views.Public.class) String productName,
        @JsonView(Views.Public.class) String ticketImg,
        @JsonView(Views.Public.class) String serialNumber,
        @JsonView(Views.Public.class) String numbers,
        @JsonView(Views.Public.class) LocalDate drawDate,
        @JsonView(Views.Admin.class) String batchCode,
        @JsonView(Views.Public.class) String status,
        @JsonView(Views.Public.class) String statusDisplayName,
        @JsonView(Views.Admin.class) UUID importedById,
        @JsonView(Views.Admin.class) LocalDateTime importedAt,
        @JsonView(Views.Admin.class) boolean verified,
        @JsonView(Views.Admin.class) UUID verifiedById,
        @JsonView(Views.Admin.class) LocalDateTime verifiedAt,
        @JsonView(Views.Admin.class) LocalDateTime returnedAt,
        @JsonView(Views.Admin.class) LocalDateTime createdAt,
        @JsonView(Views.Admin.class) LocalDateTime updatedAt,
        @JsonView(Views.Admin.class) String createdBy,
        @JsonView(Views.Admin.class) String lastModifiedBy
) {}

