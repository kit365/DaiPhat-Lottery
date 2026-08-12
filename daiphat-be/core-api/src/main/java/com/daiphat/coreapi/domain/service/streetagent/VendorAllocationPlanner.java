package com.daiphat.coreapi.domain.service.streetagent;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.util.LinkedHashMap;
import java.util.Map;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class VendorAllocationPlanner {

    /**
     * Constrained round-robin. The map must be ordered by station id so a remainder is deterministic.
     */
    public static Map<Long, Integer> plan(int requestedQuantity, Map<Long, Integer> capacities) {
        if (requestedQuantity < 0 || capacities == null || capacities.isEmpty()) {
            throw new IllegalArgumentException("Invalid vendor allocation inputs");
        }
        LinkedHashMap<Long, Integer> safeCapacities = new LinkedHashMap<>();
        capacities.entrySet().stream().sorted(Map.Entry.comparingByKey())
                .forEach(entry -> safeCapacities.put(entry.getKey(), Math.max(0, value(entry.getValue()))));
        int target = Math.min(requestedQuantity, safeCapacities.values().stream().mapToInt(Integer::intValue).sum());
        LinkedHashMap<Long, Integer> result = new LinkedHashMap<>();
        safeCapacities.keySet().forEach(id -> result.put(id, 0));
        for (int allocated = 0; allocated < target;) {
            boolean progressed = false;
            for (Long stationId : safeCapacities.keySet()) {
                if (allocated >= target) break;
                if (result.get(stationId) < safeCapacities.get(stationId)) {
                    result.put(stationId, result.get(stationId) + 1);
                    allocated++;
                    progressed = true;
                }
            }
            if (!progressed) break;
        }
        return result;
    }

    public static Map<Long, Integer> plan(int requestedQuantity, Map<Long, Integer> availableByStation, int reservePerStation) {
        if (requestedQuantity < 0 || reservePerStation < 0 || availableByStation == null || availableByStation.isEmpty()) {
            throw new IllegalArgumentException("Invalid vendor allocation inputs");
        }
        LinkedHashMap<Long, Integer> capacities = new LinkedHashMap<>();
        for (var entry : availableByStation.entrySet()) {
            int capacity = Math.max(0, value(entry.getValue()) - reservePerStation);
            if (capacity == 0) {
                throw new IllegalStateException("Every scheduled station must have at least one vendor-eligible ticket");
            }
            capacities.put(entry.getKey(), capacity);
        }

        return plan(requestedQuantity, capacities);
    }

    private static int value(Integer value) {
        return value != null ? value : 0;
    }
}
