package com.daiphat.coreapi.domain.service.lottery;

import com.daiphat.coreapi.domain.model.enums.lottery.MatchFrom;
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultDetailModel;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public final class TicketPrizeMatcher {

    private TicketPrizeMatcher() {
    }

    public record MatchResult(
            String prizeCode,
            String prizeDisplayName,
            Long prizeStructureId,
            BigDecimal prizeAmount,
            String winningNumber,
            String matchFrom,
            Integer matchDigits
    ) {
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
                        detail.getPrizeDisplayName() != null ? detail.getPrizeDisplayName() : detail.getPrizeCode(),
                        detail.getPrizeStructureId(),
                        null,
                        detail.getWinningNumber().trim(),
                        detail.getMatchFrom() != null ? detail.getMatchFrom().name() : null,
                        detail.getMatchDigits()
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
            case SPECIAL_CONSOLATION_1 -> matchesSubSpecial(ticketNumber, winningNumber);
            case SPECIAL_CONSOLATION_2 -> matchesConsolation(ticketNumber, winningNumber);
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

    /** Sai số đầu, 5 số còn lại đúng theo giải đặc biệt. */
    private static boolean matchesSubSpecial(String ticketNumber, String winningNumber) {
        if (ticketNumber.length() != winningNumber.length() || winningNumber.length() < 2) {
            return false;
        }
        return ticketNumber.charAt(0) != winningNumber.charAt(0)
                && ticketNumber.substring(1).equals(winningNumber.substring(1));
    }

    /** Đúng số đầu, sai đúng 1 số trong 5 số còn lại so với giải đặc biệt. */
    private static boolean matchesConsolation(String ticketNumber, String winningNumber) {
        if (ticketNumber.length() != winningNumber.length() || winningNumber.length() < 2) {
            return false;
        }
        if (ticketNumber.charAt(0) != winningNumber.charAt(0)) {
            return false;
        }
        int diffCount = 0;
        for (int i = 1; i < winningNumber.length(); i++) {
            if (ticketNumber.charAt(i) != winningNumber.charAt(i)) {
                diffCount++;
            }
        }
        return diffCount == 1;
    }
}
