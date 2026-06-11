package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum MatchFrom {
    EXACT("Toàn bộ 6 số"),
    LAST_5("5 số cuối"),
    LAST_4("4 số cuối"),
    LAST_3("3 số cuối"),
    LAST_2("2 số cuối"),
    ANY("Bất kỳ"),
    MISS_ONE_DIGIT("Sai 1 chữ số");

    private final String displayName;
}
