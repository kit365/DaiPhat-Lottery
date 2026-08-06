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
