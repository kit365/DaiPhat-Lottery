package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.application.dto.response.base.Views;
import com.fasterxml.jackson.annotation.JsonView;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Builder
public record LotteryTicketResponse(
        @JsonView(Views.Public.class) Long id,
        @JsonView(Views.Public.class) Long stationId,
        @JsonView(Views.Public.class) String stationName,
        @JsonView(Views.Public.class) String ticketImg,
        @JsonView(Views.Public.class) String serialNumber,
        @JsonView(Views.Public.class) String numbers,
        @JsonView(Views.Public.class) LocalDate drawDate,
        @JsonView(Views.Public.class) Integer quantity,
        @JsonView(Views.Public.class) BigDecimal priceSnapshot,
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
        @JsonView(Views.Admin.class) String lastModifiedBy,
        @JsonView(Views.Public.class) List<LotteryTicketSerialResponse> serials
) {
    public LotteryTicketResponse withStationName(String stationName) {
        return new LotteryTicketResponse(
                id,
                stationId,
                stationName,
                ticketImg,
                serialNumber,
                numbers,
                drawDate,
                quantity,
                priceSnapshot,
                batchCode,
                status,
                statusDisplayName,
                importedById,
                importedAt,
                verified,
                verifiedById,
                verifiedAt,
                returnedAt,
                createdAt,
                updatedAt,
                createdBy,
                lastModifiedBy,
                serials
        );
    }
}
