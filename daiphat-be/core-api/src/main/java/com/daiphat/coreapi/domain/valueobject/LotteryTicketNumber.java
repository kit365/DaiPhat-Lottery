package com.daiphat.coreapi.domain.valueobject;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;

public record LotteryTicketNumber(String value) {

    public static LotteryTicketNumber from(String rawValue, Integer minLength, Integer maxLength) {
        if (rawValue == null || rawValue.isBlank()) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_NUMBERS_REQUIRED);
        }

        String normalizedValue = rawValue.trim();
        if (!normalizedValue.matches("\\d+")) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_NUMBERS_INVALID);
        }

        int min = minLength != null ? minLength : 1;
        int max = maxLength != null ? maxLength : min;
        int actualLength = normalizedValue.length();
        if (actualLength < min || actualLength > max) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_NUMBERS_LENGTH_INVALID, null, min, max);
        }

        return new LotteryTicketNumber(normalizedValue);
    }

    /** @deprecated use {@link #from(String, Integer, Integer)} */
    public static LotteryTicketNumber from(String rawValue, Integer requiredLength) {
        return from(rawValue, requiredLength, requiredLength);
    }
}
