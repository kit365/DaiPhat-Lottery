package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;

public record LotteryTicketNumber(String value) {

    public static LotteryTicketNumber from(String rawValue, Integer requiredLength) {
        if (rawValue == null || rawValue.isBlank()) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_NUMBERS_REQUIRED);
        }

        String normalizedValue = rawValue.trim();
        if (!normalizedValue.matches("\\d+")) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_NUMBERS_INVALID);
        }

        if (requiredLength != null && normalizedValue.length() != requiredLength) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_NUMBERS_LENGTH_INVALID);
        }

        return new LotteryTicketNumber(normalizedValue);
    }
}
