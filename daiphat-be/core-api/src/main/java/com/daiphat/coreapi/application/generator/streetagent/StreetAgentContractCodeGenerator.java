package com.daiphat.coreapi.application.generator.streetagent;

import com.daiphat.coreapi.shared.time.VietnamClock;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;

/** Generates contract codes from one documented format rather than service-local literals. */
@Component
@RequiredArgsConstructor
public class StreetAgentContractCodeGenerator {

    static final String PREFIX = "HD-CTV-";
    static final int RANDOM_LENGTH = 8;
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.BASIC_ISO_DATE;

    private final VietnamClock vietnamClock;

    public String nextCode() {
        String random = UUID.randomUUID().toString().replace("-", "")
                .substring(0, RANDOM_LENGTH).toUpperCase(Locale.ROOT);
        return PREFIX + vietnamClock.today().format(DATE_FORMAT) + "-" + random;
    }
}
