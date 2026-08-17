package com.daiphat.coreapi.application.generator.streetagent;

import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.UUID;

/** Generates opaque, operator-friendly identifiers for allocation batches. */
@Component
public class VendorBatchCodeGenerator {

    static final String PREFIX = "VND-";
    static final int RANDOM_LENGTH = 8;

    public String nextCode() {
        return PREFIX + UUID.randomUUID().toString()
                .replace("-", "")
                .substring(0, RANDOM_LENGTH)
                .toUpperCase(Locale.ROOT);
    }
}
