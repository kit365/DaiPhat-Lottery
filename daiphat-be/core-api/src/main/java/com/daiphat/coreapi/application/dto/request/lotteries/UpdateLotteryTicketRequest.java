package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.Valid;

import java.time.LocalDate;
import java.util.List;

/**
 * Ticket status is intentionally absent: it is an aggregate recomputed from the
 * ticket's serials and the station draw cutoff, never set by the caller.
 */
public record UpdateLotteryTicketRequest(
        String ticketImg,
        String numbers,
        LocalDate drawDate,

        @Valid
        List<UpdateLotteryTicketSerialRequest> serials
) {}
