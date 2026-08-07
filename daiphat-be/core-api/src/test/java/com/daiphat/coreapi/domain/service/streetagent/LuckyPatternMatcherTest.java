package com.daiphat.coreapi.domain.service.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.LuckyMatchPosition;
import com.daiphat.coreapi.domain.model.enums.streetagent.LuckyPatternType;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LuckyPatternMatcherTest {
    @Test
    void matches_exact_and_positioned_digit_patterns() {
        assertThat(LuckyPatternMatcher.matches("686868", LuckyPatternType.EXACT, "123456,686868", null, null)).isTrue();
        assertThat(LuckyPatternMatcher.matches("123999", LuckyPatternType.DIGIT_MATCH, null, "999", LuckyMatchPosition.SUFFIX)).isTrue();
        assertThat(LuckyPatternMatcher.matches("999123", LuckyPatternType.DIGIT_MATCH, null, "999", LuckyMatchPosition.SUFFIX)).isFalse();
    }
}
