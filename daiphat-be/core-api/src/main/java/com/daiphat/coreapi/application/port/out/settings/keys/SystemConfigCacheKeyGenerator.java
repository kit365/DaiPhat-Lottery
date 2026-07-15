package com.daiphat.coreapi.application.port.out.settings.keys;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class SystemConfigCacheKeyGenerator {

    private static final String PREFIX = "system-config";

    public static String byKey(String configKey) {
        return PREFIX + ":key:" + configKey;
    }
}
