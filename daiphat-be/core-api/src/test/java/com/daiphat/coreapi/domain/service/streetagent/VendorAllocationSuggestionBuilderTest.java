package com.daiphat.coreapi.domain.service.streetagent;

import com.daiphat.coreapi.domain.model.streetagent.VendorAllocationSerialModel;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class VendorAllocationSuggestionBuilderTest {

    @Test
    void excludes_lucky_from_vendor_capacity_and_reports_lucky_quantity() {
        List<VendorAllocationSerialModel> serials = new ArrayList<>();
        serials.addAll(stationSerials(1L, "A", "A", 20, false));
        serials.addAll(stationSerials(1L, "A", "L", 8, true));

        VendorAllocationSuggestionBuilder.Suggestion suggestion = VendorAllocationSuggestionBuilder.build(
                serials, 100, 100,
                new VendorAllocationSuggestionBuilder.ReservePolicy(10, new BigDecimal("0.20")), null);

        VendorAllocationSuggestionBuilder.StationSuggestion station = suggestion.stations().getFirst();
        // normal=20 → reserve=max(10, ceil(0.2*20))=10 → vendorCapacity=10; lucky excluded
        assertThat(station.luckyQuantity()).isEqualTo(8);
        assertThat(station.normalEligibleQuantity()).isEqualTo(20);
        assertThat(station.vendorCapacity()).isEqualTo(10);
        assertThat(station.effectiveAgencyReserveQuantity()).isEqualTo(10);
    }

    @Test
    void applies_max_of_fixed_and_percent_reserve_with_ceiling() {
        List<VendorAllocationSerialModel> serials = new ArrayList<>();
        serials.addAll(stationSerials(1L, "A", "A", 5, false));
        serials.addAll(stationSerials(2L, "B", "B", 40, false));
        serials.addAll(stationSerials(3L, "C", "C", 100, false));

        VendorAllocationSuggestionBuilder.Suggestion suggestion = VendorAllocationSuggestionBuilder.build(
                serials, 200, 200,
                new VendorAllocationSuggestionBuilder.ReservePolicy(10, new BigDecimal("0.20")), null);

        assertThat(suggestion.totalVendorCapacity()).isEqualTo(110);
        assertThat(suggestion.stations()).extracting(VendorAllocationSuggestionBuilder.StationSuggestion::vendorCapacity)
                .containsExactly(0, 30, 80);
        assertThat(suggestion.stations()).extracting(VendorAllocationSuggestionBuilder.StationSuggestion::effectiveAgencyReserveQuantity)
                .containsExactly(5, 10, 20);
    }

    @Test
    void reports_inventory_shortfall_and_rebalances_when_small_station_is_exhausted() {
        List<VendorAllocationSerialModel> serials = new ArrayList<>();
        serials.addAll(stationSerials(1L, "A", "A", 15, false)); // capacity 5
        serials.addAll(stationSerials(2L, "B", "B", 20, false)); // capacity 10
        serials.addAll(stationSerials(3L, "C", "C", 18, false)); // capacity 8

        VendorAllocationSuggestionBuilder.Suggestion suggestion = VendorAllocationSuggestionBuilder.build(
                serials, 40, 30,
                new VendorAllocationSuggestionBuilder.ReservePolicy(10, new BigDecimal("0.20")), null);

        assertThat(suggestion.allowedQuantity()).isEqualTo(23);
        assertThat(suggestion.shortfallQuantity()).isEqualTo(7);
        assertThat(suggestion.inventoryShortfallQuantity()).isEqualTo(7);
        assertThat(suggestion.shortageReasons()).containsExactly("INSUFFICIENT_STATION_CAPACITY");
        assertThat(suggestion.stations()).extracting(VendorAllocationSuggestionBuilder.StationSuggestion::suggestedCount)
                .containsExactly(5, 10, 8);
    }

    @Test
    void reports_cap_shortfall_separately_from_inventory_shortfall() {
        List<VendorAllocationSerialModel> serials = stationSerials(1L, "A", "A", 100, false);
        VendorAllocationSuggestionBuilder.Suggestion suggestion = VendorAllocationSuggestionBuilder.build(
                serials, 30, 50,
                new VendorAllocationSuggestionBuilder.ReservePolicy(10, new BigDecimal("0.20")), null);

        assertThat(suggestion.allowedQuantity()).isEqualTo(30);
        assertThat(suggestion.capShortfallQuantity()).isEqualTo(20);
        assertThat(suggestion.inventoryShortfallQuantity()).isZero();
        assertThat(suggestion.shortageReasons()).containsExactly("DAILY_CAP_LIMIT");
    }

    @Test
    void groups_by_station_and_ticket_number_with_planner_suggestion() {
        List<VendorAllocationSerialModel> serials = new ArrayList<>();
        serials.addAll(stationSerials(1L, "Đài HCM", "001001", 12, false));
        serials.addAll(stationSerials(1L, "Đài HCM", "001002", 12, false));
        serials.addAll(stationSerials(2L, "Đài ĐN", "002001", 15, false));
        serials.addAll(stationSerials(2L, "Đài ĐN", "002002", 1, true));

        VendorAllocationSuggestionBuilder.Suggestion suggestion =
                VendorAllocationSuggestionBuilder.build(serials, 10, 10);

        assertThat(suggestion.remainingDailyCap()).isEqualTo(10);
        assertThat(suggestion.suggestedQuantity()).isEqualTo(10);
        assertThat(suggestion.stations()).hasSize(2);

        VendorAllocationSuggestionBuilder.StationSuggestion hcm = suggestion.stations().getFirst();
        assertThat(hcm.stationName()).isEqualTo("Đài HCM");
        assertThat(hcm.suggestedCount()).isEqualTo(5);
        assertThat(hcm.tickets()).hasSize(2);
        assertThat(hcm.tickets().getFirst().ticketNumbers()).isEqualTo("001001");
        assertThat(hcm.tickets().getFirst().availableCount()).isEqualTo(12);
        assertThat(hcm.tickets().stream().mapToInt(VendorAllocationSuggestionBuilder.TicketSuggestion::suggestedCount).sum())
                .isEqualTo(5);
        assertThat(hcm.tickets().getFirst().serials()).hasSize(12);

        VendorAllocationSuggestionBuilder.StationSuggestion dn = suggestion.stations().get(1);
        assertThat(dn.suggestedCount()).isEqualTo(5);
        assertThat(dn.tickets().stream().anyMatch(VendorAllocationSuggestionBuilder.TicketSuggestion::lucky)).isTrue();
        assertThat(dn.tickets().stream().filter(VendorAllocationSuggestionBuilder.TicketSuggestion::lucky).findFirst())
                .get()
                .extracting(VendorAllocationSuggestionBuilder.TicketSuggestion::suggestedCount)
                .isEqualTo(0);
    }

    @Test
    void returns_inventory_groups_without_suggestion_when_cap_is_zero() {
        List<VendorAllocationSerialModel> serials = stationSerials(1L, "Đài HCM", "001001", 12, false);

        VendorAllocationSuggestionBuilder.Suggestion suggestion =
                VendorAllocationSuggestionBuilder.build(serials, 0, 10);

        assertThat(suggestion.suggestedQuantity()).isZero();
        assertThat(suggestion.stations()).hasSize(1);
        assertThat(suggestion.stations().getFirst().tickets().getFirst().availableCount()).isEqualTo(12);
        assertThat(suggestion.stations().getFirst().tickets().getFirst().suggestedCount()).isZero();
    }

    @Test
    void pick_evenly_spreads_across_ticket_numbers() {
        List<VendorAllocationSuggestionBuilder.AnnotatedSerial> eligible = new ArrayList<>();
        eligible.addAll(annotate(stationSerials(1L, "Đài HCM", "A", 3, false)));
        eligible.addAll(annotate(stationSerials(1L, "Đài HCM", "B", 3, false)));

        List<Long> picked = VendorAllocationSuggestionBuilder.pickEvenlyAcrossTicketNumbers(4, eligible);
        Map<String, Long> byTicket = eligible.stream()
                .filter(a -> picked.contains(a.serial().getSerialId()))
                .collect(Collectors.groupingBy(a -> a.serial().getTicketNumbers(), Collectors.counting()));

        assertThat(picked).hasSize(4);
        assertThat(byTicket).containsEntry("A", 2L).containsEntry("B", 2L);
    }

    private List<VendorAllocationSuggestionBuilder.AnnotatedSerial> annotate(List<VendorAllocationSerialModel> serials) {
        return VendorAllocationSuggestionBuilder.annotate(serials, 0);
    }

    private List<VendorAllocationSerialModel> stationSerials(
            Long stationId, String stationName, String ticketNumbers, int count, boolean lucky) {
        List<VendorAllocationSerialModel> list = new ArrayList<>();
        long baseId = stationId * 1_000_000L + Math.abs(ticketNumbers.hashCode() % 10_000) * 100L;
        for (int i = 0; i < count; i++) {
            list.add(VendorAllocationSerialModel.builder()
                    .serialId(baseId + i + 1)
                    .stationId(stationId)
                    .stationName(stationName)
                    .ticketNumbers(ticketNumbers)
                    .serialNumber(ticketNumbers + "-" + (i + 1))
                    .drawDate(LocalDate.of(2026, 8, 10))
                    .faceValue(BigDecimal.valueOf(10_000))
                    .lucky(lucky)
                    .luckyBadges(lucky ? "Số đẹp" : null)
                    .build());
        }
        return list;
    }
}
