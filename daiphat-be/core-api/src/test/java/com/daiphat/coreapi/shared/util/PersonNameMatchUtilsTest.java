package com.daiphat.coreapi.shared.util;

import org.junit.jupiter.api.Test;

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
}
