package com.daiphat.coreapi.domain.service.streetagent;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.util.LinkedHashMap;
import java.util.Map;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class VendorAllocationPlanner {

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

        int target = Math.min(requestedQuantity, capacities.values().stream().mapToInt(Integer::intValue).sum());
        LinkedHashMap<Long, Integer> result = new LinkedHashMap<>();
        capacities.keySet().forEach(id -> result.put(id, 0));
        int allocated = 0;
        while (allocated < target) {
            boolean progressed = false;
            for (Long stationId : capacities.keySet()) {
                if (allocated >= target) {
                    break;
                }
                int current = result.get(stationId);
                if (current < capacities.get(stationId)) {
                    result.put(stationId, current + 1);
                    allocated++;
                    progressed = true;
                }
            }
            if (!progressed) {
                break;
            }
        }
        return result;
    }

    private static int value(Integer value) {
        return value != null ? value : 0;
    }
}
