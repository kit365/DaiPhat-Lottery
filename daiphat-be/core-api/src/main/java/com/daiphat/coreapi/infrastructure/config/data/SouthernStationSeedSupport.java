package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;

import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Keeps demo seeds on the real 21 Miền Nam station names only —
 * never invents or consumes leftover fake/test stations.
 */
public final class SouthernStationSeedSupport {

    private static final Set<String> CATALOG_NAMES = SouthernLotteryStationCatalog.stations().stream()
            .map(SouthernLotteryStationCatalog.StationSeed::name)
            .map(SouthernStationSeedSupport::normalize)
            .collect(Collectors.toUnmodifiableSet());

    private SouthernStationSeedSupport() {
    }

    public static boolean isCanonicalSouthern(LotteryStationEntity station) {
        return station != null && isCanonicalSouthernName(station.getName());
    }

    public static boolean isCanonicalSouthernName(String name) {
        return name != null && CATALOG_NAMES.contains(normalize(name));
    }

    public static List<LotteryStationEntity> filterCanonical(Collection<LotteryStationEntity> stations) {
        if (stations == null || stations.isEmpty()) {
            return List.of();
        }
        return stations.stream()
                .filter(SouthernStationSeedSupport::isCanonicalSouthern)
                .toList();
    }

    public static String normalize(String name) {
        return name == null ? "" : name.trim().toLowerCase(Locale.ROOT);
    }
}
