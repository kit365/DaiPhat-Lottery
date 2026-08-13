package com.daiphat.coreapi.shared.time;

import com.daiphat.coreapi.shared.util.DrawScheduleUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Single injectable clock for street-vendor business rules in Vietnam time. */
@Component
@RequiredArgsConstructor
public class VietnamClock {

    private final Clock clock;

    public LocalDateTime now() {
        return LocalDateTime.ofInstant(clock.instant(), DrawScheduleUtils.VIETNAM_ZONE);
    }

    public LocalDate today() {
        return now().toLocalDate();
    }
}
