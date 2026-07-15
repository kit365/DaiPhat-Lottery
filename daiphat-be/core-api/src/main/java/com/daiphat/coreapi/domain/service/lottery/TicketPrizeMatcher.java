package com.daiphat.coreapi.domain.service.lottery;

import com.daiphat.coreapi.domain.model.enums.lottery.MatchFrom;
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultDetailModel;

import java.util.List;
import java.util.Optional;

public final class TicketPrizeMatcher {

    private TicketPrizeMatcher() {
    }

    public record MatchResult(String prizeCode, String prizeDisplayName) {
    }

    public static Optional<MatchResult> findFirstMatch(String ticketNumbers, List<LotteryResultDetailModel> resultDetails) {
        if (ticketNumbers == null || ticketNumbers.isBlank() || resultDetails == null || resultDetails.isEmpty()) {
            return Optional.empty();
        }
        String ticket = ticketNumbers.trim();
        for (LotteryResultDetailModel detail : resultDetails) {
            if (detail.getWinningNumber() == null) {
                continue;
            }
            if (matches(ticket, detail.getWinningNumber().trim(), detail.getMatchFrom(), detail.getMatchDigits())) {
                return Optional.of(new MatchResult(
                        detail.getPrizeCode(),
                        detail.getPrizeDisplayName() != null ? detail.getPrizeDisplayName() : detail.getPrizeCode()
                ));
            }
        }
        return Optional.empty();
    }

    static boolean matches(String ticketNumber, String winningNumber, MatchFrom matchFrom, Integer matchDigits) {
        if (matchFrom == null) {
            return false;
        }
        return switch (matchFrom) {
            case EXACT -> ticketNumber.equals(winningNumber);
            case LAST -> matchesLastDigits(ticketNumber, winningNumber, matchDigits);
            case ANY -> ticketNumber.contains(winningNumber) || winningNumber.contains(ticketNumber);
            case SPECIAL_CONSOLATION_1, SPECIAL_CONSOLATION_2 -> false;
        };
    }

    private static boolean matchesLastDigits(String ticketNumber, String winningNumber, Integer matchDigits) {
        int digits = matchDigits != null && matchDigits > 0 ? matchDigits : winningNumber.length();
        if (ticketNumber.length() < digits || winningNumber.length() < digits) {
            return false;
        }
        return ticketNumber.substring(ticketNumber.length() - digits)
                .equals(winningNumber.substring(winningNumber.length() - digits));
    }
}
