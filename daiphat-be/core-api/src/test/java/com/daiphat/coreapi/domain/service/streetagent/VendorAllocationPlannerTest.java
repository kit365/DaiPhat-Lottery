package com.daiphat.coreapi.domain.service.streetagent;

import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VendorAllocationPlannerTest {

    @Test
    void balances_stations_and_preserves_counter_reserve() {
        Map<Long, Integer> available = new LinkedHashMap<>();
        available.put(1L, 40);
        available.put(2L, 30);
        available.put(3L, 20);

        Map<Long, Integer> proposal = VendorAllocationPlanner.plan(45, available, 10);

        assertThat(proposal).containsEntry(1L, 18).containsEntry(2L, 17).containsEntry(3L, 10);
        assertThat(proposal.values().stream().mapToInt(Integer::intValue).sum()).isEqualTo(45);
    }

    @Test
    void rejects_when_a_scheduled_station_has_no_vendor_eligible_ticket() {
        assertThatThrownBy(() -> VendorAllocationPlanner.plan(10, Map.of(1L, 10, 2L, 9), 10))
                .isInstanceOf(IllegalStateException.class);
    }
}
