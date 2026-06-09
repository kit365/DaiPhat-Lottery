package com.daiphat.coreapi.application.dto.request.lotteries;

import java.time.LocalDate;

public record UpdateLotteryTicketRequest(
        String ticketImg,
        String serialNumber,
        String numbers,
        LocalDate drawDate,
        String batchCode,
        String status
) {}
