package com.daiphat.coreapi.domain.service.streetagent;

import com.daiphat.coreapi.domain.model.streetagent.VendorAllocationSerialModel;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Builds a station → ticketNumber suggestion from inventory candidates.
 * Reuses {@link VendorAllocationPlanner} for even station distribution and counter reserve.
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class VendorAllocationSuggestionBuilder {

    public record AnnotatedSerial(
            VendorAllocationSerialModel serial,
            boolean vendorEligible,
            String blockedReason
    ) {
    }

    public record SerialSuggestion(
            Long serialId,
            String serialNumber,
            boolean lucky,
            List<String> luckyBadges,
            boolean vendorEligible,
            String blockedReason,
            boolean suggested
    ) {
    }

    public record TicketSuggestion(
            String ticketNumbers,
            BigDecimal faceValue,
            boolean lucky,
            List<String> luckyBadges,
            int availableCount,
            int suggestedCount,
            int selectableCount,
            boolean vendorEligible,
            String blockedReason,
            List<SerialSuggestion> serials
    ) {
    }

    public record StationSuggestion(
            Long stationId,
            String stationName,
            int availableCount,
            int suggestedCount,
            int selectableCount,
            List<TicketSuggestion> tickets
    ) {
    }

    public record Suggestion(
            int remainingDailyCap,
            int suggestedQuantity,
            int counterReservePerStation,
            String blockedReason,
            List<StationSuggestion> stations
    ) {
    }

    public static List<AnnotatedSerial> annotate(List<VendorAllocationSerialModel> serials, int reservePerStation) {
        Map<Long, Long> normalCount = serials.stream()
                .filter(s -> !s.isLucky())
                .collect(Collectors.groupingBy(VendorAllocationSerialModel::getStationId, LinkedHashMap::new, Collectors.counting()));
        Map<Long, Integer> seen = new HashMap<>();
        return serials.stream().map(serial -> {
            int position = serial.isLucky() ? 0 : seen.merge(serial.getStationId(), 1, Integer::sum);
            boolean counterReserved = !serial.isLucky()
                    && position > Math.max(0, normalCount.get(serial.getStationId()).intValue() - reservePerStation);
            boolean eligible = !serial.isLucky() && !counterReserved;
            String reason = serial.isLucky() ? "LUCKY_PATTERN" : (counterReserved ? "COUNTER_RESERVE" : null);
            return new AnnotatedSerial(serial, eligible, reason);
        }).toList();
    }

    public static Suggestion build(List<VendorAllocationSerialModel> serials, int remainingDailyCap, int reservePerStation) {
        return build(serials, remainingDailyCap, reservePerStation, null);
    }

    public static Suggestion build(
            List<VendorAllocationSerialModel> serials,
            int remainingDailyCap,
            int reservePerStation,
            String blockedReason
    ) {
        List<AnnotatedSerial> annotated = annotate(serials, reservePerStation);
        Map<Long, Integer> availableByStation = new LinkedHashMap<>();
        for (AnnotatedSerial item : annotated) {
            if (!item.serial().isLucky()) {
                availableByStation.merge(item.serial().getStationId(), 1, Integer::sum);
            }
        }

        Map<Long, Integer> plan = Map.of();
        if (remainingDailyCap > 0 && !availableByStation.isEmpty()) {
            LinkedHashMap<Long, Integer> plannable = new LinkedHashMap<>();
            for (var entry : availableByStation.entrySet()) {
                if (entry.getValue() - reservePerStation > 0) {
                    plannable.put(entry.getKey(), entry.getValue());
                }
            }
            if (!plannable.isEmpty()) {
                plan = VendorAllocationPlanner.plan(remainingDailyCap, plannable, reservePerStation);
            }
        }

        Map<Long, List<AnnotatedSerial>> eligibleByStation = annotated.stream()
                .filter(AnnotatedSerial::vendorEligible)
                .collect(Collectors.groupingBy(a -> a.serial().getStationId(), LinkedHashMap::new, Collectors.toList()));

        Set<Long> suggestedIds = new LinkedHashSet<>();
        for (var entry : plan.entrySet()) {
            List<AnnotatedSerial> eligible = eligibleByStation.getOrDefault(entry.getKey(), List.of());
            suggestedIds.addAll(pickEvenlyAcrossTicketNumbers(entry.getValue(), eligible));
        }

        LinkedHashMap<Long, List<AnnotatedSerial>> byStation = new LinkedHashMap<>();
        for (AnnotatedSerial item : annotated) {
            byStation.computeIfAbsent(item.serial().getStationId(), id -> new ArrayList<>()).add(item);
        }

        List<StationSuggestion> stations = new ArrayList<>();
        for (var stationEntry : byStation.entrySet()) {
            List<AnnotatedSerial> stationSerials = stationEntry.getValue();
            String stationName = stationSerials.getFirst().serial().getStationName();

            LinkedHashMap<String, List<AnnotatedSerial>> byTicket = new LinkedHashMap<>();
            for (AnnotatedSerial item : stationSerials) {
                byTicket.computeIfAbsent(item.serial().getTicketNumbers(), key -> new ArrayList<>()).add(item);
            }

            List<TicketSuggestion> tickets = new ArrayList<>();
            int stationSuggested = 0;
            int stationSelectable = 0;
            for (var ticketEntry : byTicket.entrySet()) {
                List<AnnotatedSerial> ticketSerials = ticketEntry.getValue();
                VendorAllocationSerialModel first = ticketSerials.getFirst().serial();
                boolean anyLucky = ticketSerials.stream().anyMatch(a -> a.serial().isLucky());
                int selectable = (int) ticketSerials.stream().filter(AnnotatedSerial::vendorEligible).count();
                int suggested = (int) ticketSerials.stream()
                        .filter(a -> suggestedIds.contains(a.serial().getSerialId()))
                        .count();
                stationSuggested += suggested;
                stationSelectable += selectable;

                boolean allBlocked = selectable == 0;
                String ticketBlockedReason = null;
                if (allBlocked) {
                    ticketBlockedReason = ticketSerials.stream()
                            .map(AnnotatedSerial::blockedReason)
                            .filter(Objects::nonNull)
                            .findFirst()
                            .orElse(null);
                }

                List<String> badges = badges(first.getLuckyBadges());
                if (anyLucky && badges.isEmpty()) {
                    badges = List.of("Số đẹp");
                }

                List<SerialSuggestion> serialSuggestions = ticketSerials.stream()
                        .map(a -> new SerialSuggestion(
                                a.serial().getSerialId(),
                                a.serial().getSerialNumber(),
                                a.serial().isLucky(),
                                badges(a.serial().getLuckyBadges()),
                                a.vendorEligible(),
                                a.blockedReason(),
                                suggestedIds.contains(a.serial().getSerialId())
                        ))
                        .toList();

                tickets.add(new TicketSuggestion(
                        first.getTicketNumbers(),
                        first.getFaceValue(),
                        anyLucky,
                        badges,
                        ticketSerials.size(),
                        suggested,
                        selectable,
                        selectable > 0,
                        ticketBlockedReason,
                        serialSuggestions
                ));
            }

            stations.add(new StationSuggestion(
                    stationEntry.getKey(),
                    stationName,
                    stationSerials.size(),
                    stationSuggested,
                    stationSelectable,
                    tickets
            ));
        }

        int suggestedQuantity = suggestedIds.size();
        return new Suggestion(remainingDailyCap, suggestedQuantity, reservePerStation, blockedReason, stations);
    }

    /**
     * Round-robin across ticket numbers so a station suggestion does not dump all qty onto one number.
     */
    static List<Long> pickEvenlyAcrossTicketNumbers(int quantity, List<AnnotatedSerial> eligibleOrdered) {
        if (quantity <= 0 || eligibleOrdered == null || eligibleOrdered.isEmpty()) {
            return List.of();
        }
        LinkedHashMap<String, Deque<Long>> queues = new LinkedHashMap<>();
        for (AnnotatedSerial item : eligibleOrdered) {
            queues.computeIfAbsent(item.serial().getTicketNumbers(), key -> new ArrayDeque<>())
                    .add(item.serial().getSerialId());
        }
        List<Long> picked = new ArrayList<>(Math.min(quantity, eligibleOrdered.size()));
        int target = Math.min(quantity, eligibleOrdered.size());
        while (picked.size() < target) {
            boolean progressed = false;
            for (Deque<Long> queue : queues.values()) {
                if (picked.size() >= target) {
                    break;
                }
                Long next = queue.pollFirst();
                if (next != null) {
                    picked.add(next);
                    progressed = true;
                }
            }
            if (!progressed) {
                break;
            }
        }
        return picked;
    }

    private static List<String> badges(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        return Arrays.stream(raw.split(",")).map(String::trim).filter(v -> !v.isEmpty()).toList();
    }
}
