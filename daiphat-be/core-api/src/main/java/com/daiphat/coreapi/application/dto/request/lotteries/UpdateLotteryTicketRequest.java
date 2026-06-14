package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;

import java.time.LocalDate;

public record UpdateLotteryTicketRequest(
        String ticketImg,
        String serialNumber,
        String numbers,
        LocalDate drawDate,
        String batchCode,
        LotteryTicketStatus status
) {}
