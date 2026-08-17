package com.daiphat.coreapi.domain.service.lottery;

import com.daiphat.coreapi.domain.model.enums.lottery.MatchFrom;
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultDetailModel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("TicketPrizeMatcher")
class TicketPrizeMatcherTest {

    @Test
    @DisplayName("matches LAST digits")
    void matchesLastDigits() {
        assertThat(TicketPrizeMatcher.matches("123456", "789456", MatchFrom.LAST, 3)).isTrue();
        assertThat(TicketPrizeMatcher.matches("123456", "789999", MatchFrom.LAST, 3)).isFalse();
    }

    @Test
    @DisplayName("findFirstMatch returns prize when ticket wins")
    void findFirstMatch_returnsPrize() {
        LotteryResultDetailModel detail = LotteryResultDetailModel.builder()
                .prizeCode("G8")
                .prizeDisplayName("Giải tám")
                .winningNumber("68")
                .matchFrom(MatchFrom.LAST)
                .matchDigits(2)
                .build();

        Optional<TicketPrizeMatcher.MatchResult> result =
                TicketPrizeMatcher.findFirstMatch("686868", List.of(detail));

        assertThat(result).isPresent();
        assertThat(result.get().prizeCode()).isEqualTo("G8");
    }

    @Test
    @DisplayName("matches DB_PHU and KK against special number")
    void matchesSpecialConsolationPrizes() {
        assertThat(TicketPrizeMatcher.matches("682917", "582917", MatchFrom.SPECIAL_CONSOLATION_1, 5)).isTrue();
        assertThat(TicketPrizeMatcher.matches("582917", "582917", MatchFrom.SPECIAL_CONSOLATION_1, 5)).isFalse();
        assertThat(TicketPrizeMatcher.matches("592917", "582917", MatchFrom.SPECIAL_CONSOLATION_2, 5)).isTrue();
        assertThat(TicketPrizeMatcher.matches("682917", "582917", MatchFrom.SPECIAL_CONSOLATION_2, 5)).isFalse();
    }
}
