package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum MatchFrom {
    LAST("Khớp từ cuối"),
    EXACT("Khớp toàn bộ"),
    ANY("Khớp bất kỳ"),
    SPECIAL_CONSOLATION_1("Sai số đầu tiên, các số còn lại đúng thứ tự"),
    SPECIAL_CONSOLATION_2("Đúng số đầu tiên, sai 1 số trong 5 số còn lại");

    private final String displayName;
}
