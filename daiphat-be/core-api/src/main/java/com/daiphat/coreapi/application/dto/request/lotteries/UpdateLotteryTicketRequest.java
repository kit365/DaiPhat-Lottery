package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;

import jakarta.validation.Valid;

import java.time.LocalDate;
import java.util.List;

public record UpdateLotteryTicketRequest(
        String ticketImg,
        String numbers,
        LocalDate drawDate,
        String batchCode,
        LotteryTicketStatus status,

        @Valid
        List<UpdateLotteryTicketSerialRequest> serials
) {}
