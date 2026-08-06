package com.daiphat.coreapi.domain.model.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.LuckyMatchPosition;
import com.daiphat.coreapi.domain.model.enums.streetagent.LuckyPatternType;
import com.daiphat.coreapi.domain.service.streetagent.LuckyPatternMatcher;
import lombok.*;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class LuckyPatternConfigModel {
    private Long id;
    private LuckyPatternType patternType;
    private String exactNumbers;
    private String matchDigits;
    private LuckyMatchPosition matchPosition;
    private String name;
    private String description;
    private String badgeLabel;
    private String badgeColor;
    private Integer priority;
    private Boolean active;

    public boolean matches(String ticketNumbers) {
        return Boolean.TRUE.equals(active)
                && LuckyPatternMatcher.matches(ticketNumbers, patternType, exactNumbers, matchDigits, matchPosition);
    }
}
