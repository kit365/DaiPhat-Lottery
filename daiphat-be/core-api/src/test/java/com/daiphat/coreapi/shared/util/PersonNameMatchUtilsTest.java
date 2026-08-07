package com.daiphat.coreapi.shared.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PersonNameMatchUtilsTest {

    @Test
    void matches_ignoresCaseAndDiacriticsAndExtraSpaces() {
        assertTrue(PersonNameMatchUtils.matches("Nguyễn Văn A", "nguyen  van   a"));
        assertTrue(PersonNameMatchUtils.matches("TRẦN THỊ BÍCH", "Tran Thi Bich"));
    }

    @Test
    void matches_rejectsDifferentNames() {
        assertFalse(PersonNameMatchUtils.matches("Nguyen Van A", "Nguyen Van B"));
        assertFalse(PersonNameMatchUtils.matches(null, "Nguyen"));
        assertFalse(PersonNameMatchUtils.matches("Nguyen", " "));
    }

    @Test
    void resolveFullName_usesVietnameseOrder() {
        assertEquals("Nguyễn Văn A", PersonNameMatchUtils.resolveFullName("Văn A", "Nguyễn", null));
        assertEquals("nguyen", PersonNameMatchUtils.resolveFullName(null, null, "nguyen"));
    }

    @Test
    void matches_bankAccountAgainstResolvedFullName_ok() {
        String customerName = PersonNameMatchUtils.resolveFullName("Văn A", "Nguyễn", null);
        assertTrue(PersonNameMatchUtils.matches(customerName, "NGUYEN VAN A"));
    }
}
