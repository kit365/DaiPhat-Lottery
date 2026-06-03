package com.daiphat.coreapi.domain.valueobject;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.ToString;

import java.util.regex.Pattern;

/**
 * Value Object representing a Vietnamese Phone Number.
 * Validates against known carrier prefixes:
 * - Viettel: 032-039, 086, 096-098
 * - Mobifone: 070, 076-079, 089, 090, 093
 * - Vinaphone: 081-085, 088, 091, 094
 * - Vietnamobile: 052, 056, 058, 092
 * - Gmobile: 059, 099
 * - iTel: 087
 */
@Getter
@ToString
@EqualsAndHashCode
public class Phone {
    private final String value;

    // Regex breakdown:
    // 0: Starts with 0
    // (3[2-9]|7[06-9]|8[1-9]|9[0-46-9]|5[2689]): Carrier prefixes
    // [0-9]{7}: Followed by exactly 7 digits
    private static final String VIETNAMESE_PHONE_REGEX = "^0(3[2-9]|7[06-9]|8[1-9]|9[0-46-9]|5[2689])[0-9]{7}$";
    private static final Pattern PATTERN = Pattern.compile(VIETNAMESE_PHONE_REGEX);

    public Phone(String value) {
        if (value == null || !isValid(value)) {
            throw new DomainException(ErrorCode.PHONE_INVALID);
        }
        this.value = value;
    }

    public static boolean isValid(String value) {
        return value != null && PATTERN.matcher(value).matches();
    }

    public static Phone of(String value) {
        return new Phone(value);
    }
}
