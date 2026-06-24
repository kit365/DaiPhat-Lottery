package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.MatchFrom;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeLevel;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class PrizeStructureModel {

    private Long id;
    private Long regionId;
    private String regionCode;

    private PrizeLevel prizeLevel;
    private String prizeDisplayName;
    private String prizeCode;
    private String description;
    private BigDecimal prizeValue;
    private Integer quantity;
    private Integer matchDigits;
    private MatchFrom matchFrom;
    private String matchFromDisplayName;

    @Builder.Default
    private Integer displayOrder = 0;

    @Builder.Default
    private boolean isActive = true;

    private LocalDateTime deletedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public String resolvePrizeDisplayName() {
        if (prizeDisplayName != null && !prizeDisplayName.isBlank()) {
            return prizeDisplayName;
        }
        return prizeLevel != null ? prizeLevel.getDisplayName() : null;
    }

    public String resolveMatchFromDisplayName() {
        if (matchFromDisplayName != null && !matchFromDisplayName.isBlank()) {
            return matchFromDisplayName;
        }
        return matchFrom != null ? matchFrom.getDisplayName() : null;
    }

    public void validate() {
        if (regionId == null && (regionCode == null || regionCode.isBlank())) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_REGION_INVALID);
        }
        if (prizeLevel == null) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_INVALID_LEVEL);
        }
        if (prizeCode == null || prizeCode.isBlank()) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_CODE_REQUIRED);
        }
        if (prizeValue == null || prizeValue.compareTo(BigDecimal.ZERO) < 0) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_VALUE_INVALID);
        }
        if (quantity == null || quantity < 1) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_QUANTITY_INVALID);
        }
        if (matchFrom == null) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_MATCH_RULE_INVALID);
        }
        validateMatchDigits();
    }

    private void validateMatchDigits() {
        if (matchFrom == MatchFrom.EXACT) {
            return;
        }

        if (matchDigits == null || matchDigits < 1) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_MATCH_DIGITS_INVALID);
        }
    }



    public boolean isDeleted() {
        return this.deletedAt != null;
    }

    public boolean matchesTicket(String ticketNumber, String winningNumber) {
        if (ticketNumber == null || ticketNumber.isBlank()) {
            return false;
        }
        if (winningNumber == null || winningNumber.isBlank() || matchFrom == null) {
            return false;
        }

        return switch (matchFrom) {
            case EXACT -> ticketNumber.equals(winningNumber);
            case LAST -> matchLastDigits(ticketNumber, winningNumber);
            case ANY -> matchAnyDigits(ticketNumber, winningNumber);
            case SPECIAL_CONSOLATION_1 -> matchSubSpecial(ticketNumber, winningNumber);
            case SPECIAL_CONSOLATION_2 -> matchConsolation(ticketNumber, winningNumber);
        };
    }

    private boolean matchLastDigits(String ticketNumber, String winningNumber) {
        int digitsToMatch = resolveDigitsToMatch(winningNumber);
        if (digitsToMatch <= 0 || ticketNumber.length() < digitsToMatch || winningNumber.length() < digitsToMatch) {
            return false;
        }

        return ticketNumber.substring(ticketNumber.length() - digitsToMatch)
                .equals(winningNumber.substring(winningNumber.length() - digitsToMatch));
    }

    private boolean matchAnyDigits(String ticketNumber, String winningNumber) {
        int digitsToMatch = resolveDigitsToMatch(winningNumber);
        if (digitsToMatch <= 0 || ticketNumber.length() < digitsToMatch || winningNumber.length() < digitsToMatch) {
            return false;
        }

        Set<String> ticketSegments = collectSegments(ticketNumber, digitsToMatch);
        Set<String> winningSegments = collectSegments(winningNumber, digitsToMatch);
        return ticketSegments.stream().anyMatch(winningSegments::contains);
    }

    private boolean matchSubSpecial(String ticketNumber, String winningNumber) {
        return ticketNumber.length() == winningNumber.length()
                && winningNumber.length() >= 2
                && ticketNumber.charAt(0) != winningNumber.charAt(0)
                && ticketNumber.substring(1).equals(winningNumber.substring(1));
    }

    private boolean matchConsolation(String ticketNumber, String winningNumber) {
        if (ticketNumber.length() != winningNumber.length() || winningNumber.length() < 2) {
            return false;
        }
        if (ticketNumber.charAt(0) != winningNumber.charAt(0)) {
            return false;
        }

        int diffCount = 0;
        for (int index = 1; index < winningNumber.length(); index++) {
            if (ticketNumber.charAt(index) != winningNumber.charAt(index)) {
                diffCount++;
            }
        }
        return diffCount == 1;
    }

    private int resolveDigitsToMatch(String winningNumber) {
        if (matchDigits != null && matchDigits > 0) {
            return matchDigits;
        }
        return winningNumber.length();
    }

    private Set<String> collectSegments(String value, int segmentLength) {
        Set<String> segments = new HashSet<>();
        for (int index = 0; index <= value.length() - segmentLength; index++) {
            segments.add(value.substring(index, index + segmentLength));
        }
        return segments;
    }
}
