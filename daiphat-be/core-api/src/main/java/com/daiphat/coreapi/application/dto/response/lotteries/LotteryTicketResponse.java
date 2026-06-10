package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record LotteryTicketResponse(
        UUID id,
        UUID productId,
        String productName,
        String ticketImg,
        String serialNumber,
        String numbers,
        LocalDate drawDate,
        String batchCode,
        String status,
        String statusDisplayName,
        UUID importedById,
        LocalDateTime importedAt,
        boolean verified,
        UUID verifiedById,
        LocalDateTime verifiedAt,
        LocalDateTime returnedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String createdBy,
        String lastModifiedBy
) {}
