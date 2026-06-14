package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.application.dto.response.base.Views;
import com.fasterxml.jackson.annotation.JsonView;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record LotteryTicketSerialResponse(
        @JsonView(Views.Public.class) Long id,
        @JsonView(Views.Public.class) Long ticketId,
        @JsonView(Views.Public.class) String ticketImg,
        @JsonView(Views.Public.class) String serialNumber,
        @JsonView(Views.Public.class) String status,
        @JsonView(Views.Public.class) String statusDisplayName,
        @JsonView(Views.Admin.class) LocalDateTime reservedAt,
        @JsonView(Views.Admin.class) LocalDateTime reservationExpiresAt,
        @JsonView(Views.Admin.class) UUID reservedByOrderId,
        @JsonView(Views.Admin.class) UUID importedById,
        @JsonView(Views.Admin.class) LocalDateTime importedAt,
        @JsonView(Views.Admin.class) boolean verified,
        @JsonView(Views.Admin.class) UUID verifiedById,
        @JsonView(Views.Admin.class) LocalDateTime verifiedAt,
        @JsonView(Views.Admin.class) LocalDateTime returnedAt,
        @JsonView(Views.Admin.class) String damagedEvidenceUrl,
        @JsonView(Views.Admin.class) String damagedReason
) {
}
