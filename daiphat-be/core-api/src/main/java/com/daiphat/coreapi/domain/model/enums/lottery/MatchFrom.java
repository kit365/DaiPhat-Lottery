package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum MatchFrom {
    LAST("Khớp từ cuối"),
    EXACT("Khớp toàn bộ"),
    ANY("Khớp bất kỳ");

    private final String displayName;
}
