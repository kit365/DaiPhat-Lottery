package com.daiphat.coreapi.domain.service.streetagent;

import com.daiphat.coreapi.domain.model.streetagent.VendorAllocationSerialModel;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

/** Builds an explainable vendor proposal: protected counter stock is calculated per station. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class VendorAllocationSuggestionBuilder {
    public record ReservePolicy(int fixedReserve, BigDecimal reservePercent) {
        public ReservePolicy {
            if (fixedReserve < 0 || reservePercent == null || reservePercent.signum() < 0
                    || reservePercent.compareTo(BigDecimal.ONE) > 0) {
                throw new IllegalArgumentException("Invalid counter reserve policy");
            }
        }
    }
    public record StationCapacity(int normalEligibleQuantity, int luckyQuantity, int fixedReserveQuantity,
                                  int percentReserveQuantity, int effectiveAgencyReserveQuantity, int vendorCapacity) { }
    public record AnnotatedSerial(VendorAllocationSerialModel serial, boolean vendorEligible, String blockedReason) { }
    public record SerialSuggestion(Long serialId, String serialNumber, boolean lucky, List<String> luckyBadges,
                                   boolean vendorEligible, String blockedReason, boolean suggested) { }
    public record TicketSuggestion(String ticketNumbers, BigDecimal faceValue, boolean lucky, List<String> luckyBadges,
                                   int availableCount, int suggestedCount, int selectableCount, boolean vendorEligible,
                                   String blockedReason, List<SerialSuggestion> serials) { }
    public record StationSuggestion(Long stationId, String stationName, int availableCount,
                                    int normalEligibleQuantity, int luckyQuantity, int fixedReserveQuantity,
                                    int percentReserveQuantity, int effectiveAgencyReserveQuantity, int vendorCapacity,
                                    int suggestedCount, int selectableCount, List<TicketSuggestion> tickets) { }
    public record Suggestion(int requestedQuantity, int remainingDailyCap, int capLimitedQuantity,
                             int totalVendorCapacity, int allowedQuantity, int suggestedQuantity,
                             int counterReservePerStation, BigDecimal counterReservePercentPerStation,
                             int shortfallQuantity, int capShortfallQuantity, int inventoryShortfallQuantity,
                             List<String> shortageReasons, String blockedReason, List<StationSuggestion> stations) { }

    /** Source-compatible fixed-only annotation for existing candidate consumers. */
    public static List<AnnotatedSerial> annotate(List<VendorAllocationSerialModel> serials, int fixedReserve) {
        return annotate(serials, new ReservePolicy(fixedReserve, BigDecimal.ZERO));
    }

    public static List<AnnotatedSerial> annotate(List<VendorAllocationSerialModel> serials, ReservePolicy policy) {
        Map<Long, StationCapacity> capacities = capacities(serials, policy);
        Map<Long, Integer> normalSeen = new HashMap<>();
        return serials.stream().map(serial -> {
            if (serial.isLucky()) return new AnnotatedSerial(serial, false, "LUCKY_PATTERN");
            int position = normalSeen.merge(serial.getStationId(), 1, Integer::sum);
            StationCapacity capacity = capacities.get(serial.getStationId());
            boolean protectedForCounter = position > capacity.vendorCapacity();
            return new AnnotatedSerial(serial, !protectedForCounter,
                    protectedForCounter ? "COUNTER_RESERVE" : null);
        }).toList();
    }

    public static Suggestion build(List<VendorAllocationSerialModel> serials, int remainingDailyCap, int fixedReserve) {
        return build(serials, remainingDailyCap, remainingDailyCap, new ReservePolicy(fixedReserve, BigDecimal.ZERO), null);
    }

    public static Suggestion build(List<VendorAllocationSerialModel> serials, int remainingDailyCap, int fixedReserve,
                                   String blockedReason) {
        return build(serials, remainingDailyCap, remainingDailyCap, new ReservePolicy(fixedReserve, BigDecimal.ZERO), blockedReason);
    }

    public static Suggestion build(List<VendorAllocationSerialModel> serials, int remainingDailyCap, int requestedQuantity,
                                   ReservePolicy policy, String blockedReason) {
        int requested = Math.max(0, requestedQuantity);
        int cap = Math.max(0, remainingDailyCap);
        Map<Long, StationCapacity> capacities = capacities(serials, policy);
        int totalCapacity = capacities.values().stream().mapToInt(StationCapacity::vendorCapacity).sum();
        int capLimited = Math.min(requested, cap);
        int allowed = Math.min(capLimited, totalCapacity);
        int capShortfall = Math.max(0, requested - cap);
        int inventoryShortfall = Math.max(0, capLimited - totalCapacity);
        List<String> shortageReasons = new ArrayList<>();
        if (capShortfall > 0) shortageReasons.add("DAILY_CAP_LIMIT");
        if (inventoryShortfall > 0) shortageReasons.add("INSUFFICIENT_STATION_CAPACITY");
        if (serials.isEmpty() && blockedReason != null) shortageReasons.add(blockedReason);

        List<AnnotatedSerial> annotated = annotate(serials, policy);
        Map<Long, Integer> stationCapacities = capacities.entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, entry -> entry.getValue().vendorCapacity(), (a, b) -> a, LinkedHashMap::new));
        Map<Long, Integer> plan = stationCapacities.isEmpty() ? Map.of() : VendorAllocationPlanner.plan(allowed, stationCapacities);
        Map<Long, List<AnnotatedSerial>> eligibleByStation = annotated.stream().filter(AnnotatedSerial::vendorEligible)
                .collect(Collectors.groupingBy(item -> item.serial().getStationId(), LinkedHashMap::new, Collectors.toList()));
        Set<Long> suggestedIds = new LinkedHashSet<>();
        plan.forEach((stationId, quantity) -> suggestedIds.addAll(pickEvenlyAcrossTicketNumbers(quantity,
                eligibleByStation.getOrDefault(stationId, List.of()))));

        LinkedHashMap<Long, List<AnnotatedSerial>> byStation = new LinkedHashMap<>();
        annotated.forEach(item -> byStation.computeIfAbsent(item.serial().getStationId(), ignored -> new ArrayList<>()).add(item));
        List<StationSuggestion> stations = new ArrayList<>();
        byStation.entrySet().stream().sorted(Map.Entry.comparingByKey()).forEach(stationEntry -> {
            List<AnnotatedSerial> stationSerials = stationEntry.getValue();
            StationCapacity stationCapacity = capacities.get(stationEntry.getKey());
            LinkedHashMap<String, List<AnnotatedSerial>> byTicket = new LinkedHashMap<>();
            stationSerials.forEach(item -> byTicket.computeIfAbsent(item.serial().getTicketNumbers(), ignored -> new ArrayList<>()).add(item));
            List<TicketSuggestion> tickets = new ArrayList<>();
            int stationSuggested = 0;
            int stationSelectable = 0;
            for (List<AnnotatedSerial> ticketSerials : byTicket.values()) {
                VendorAllocationSerialModel first = ticketSerials.getFirst().serial();
                int selectable = (int) ticketSerials.stream().filter(AnnotatedSerial::vendorEligible).count();
                int suggested = (int) ticketSerials.stream().filter(item -> suggestedIds.contains(item.serial().getSerialId())).count();
                stationSuggested += suggested; stationSelectable += selectable;
                boolean anyLucky = ticketSerials.stream().anyMatch(item -> item.serial().isLucky());
                String ticketBlockedReason = selectable == 0 ? ticketSerials.stream().map(AnnotatedSerial::blockedReason)
                        .filter(Objects::nonNull).findFirst().orElse(null) : null;
                List<String> badges = badges(first.getLuckyBadges());
                if (anyLucky && badges.isEmpty()) badges = List.of("Số đẹp");
                tickets.add(new TicketSuggestion(first.getTicketNumbers(), first.getFaceValue(), anyLucky, badges,
                        ticketSerials.size(), suggested, selectable, selectable > 0, ticketBlockedReason,
                        ticketSerials.stream().map(item -> new SerialSuggestion(item.serial().getSerialId(), item.serial().getSerialNumber(),
                                item.serial().isLucky(), badges(item.serial().getLuckyBadges()), item.vendorEligible(),
                                item.blockedReason(), suggestedIds.contains(item.serial().getSerialId()))).toList()));
            }
            stations.add(new StationSuggestion(stationEntry.getKey(), stationSerials.getFirst().serial().getStationName(),
                    stationSerials.size(), stationCapacity.normalEligibleQuantity(), stationCapacity.luckyQuantity(),
                    stationCapacity.fixedReserveQuantity(), stationCapacity.percentReserveQuantity(),
                    stationCapacity.effectiveAgencyReserveQuantity(), stationCapacity.vendorCapacity(), stationSuggested,
                    stationSelectable, tickets));
        });
        return new Suggestion(requested, cap, capLimited, totalCapacity, allowed, suggestedIds.size(), policy.fixedReserve(),
                policy.reservePercent(), requested - allowed, capShortfall, inventoryShortfall, List.copyOf(shortageReasons),
                blockedReason, stations);
    }

    static Map<Long, StationCapacity> capacities(List<VendorAllocationSerialModel> serials, ReservePolicy policy) {
        LinkedHashMap<Long, List<VendorAllocationSerialModel>> byStation = new LinkedHashMap<>();
        serials.forEach(serial -> byStation.computeIfAbsent(serial.getStationId(), ignored -> new ArrayList<>()).add(serial));
        LinkedHashMap<Long, StationCapacity> result = new LinkedHashMap<>();
        byStation.entrySet().stream().sorted(Map.Entry.comparingByKey()).forEach(entry -> {
            int normal = (int) entry.getValue().stream().filter(serial -> !serial.isLucky()).count();
            int lucky = entry.getValue().size() - normal;
            int percent = policy.reservePercent().multiply(BigDecimal.valueOf(normal)).setScale(0, RoundingMode.CEILING).intValueExact();
            int reserve = Math.min(normal, Math.max(policy.fixedReserve(), percent));
            result.put(entry.getKey(), new StationCapacity(normal, lucky, policy.fixedReserve(), percent, reserve, normal - reserve));
        });
        return result;
    }

    static List<Long> pickEvenlyAcrossTicketNumbers(int quantity, List<AnnotatedSerial> eligibleOrdered) {
        if (quantity <= 0 || eligibleOrdered == null || eligibleOrdered.isEmpty()) return List.of();
        LinkedHashMap<String, Deque<Long>> queues = new LinkedHashMap<>();
        eligibleOrdered.forEach(item -> queues.computeIfAbsent(item.serial().getTicketNumbers(), ignored -> new ArrayDeque<>()).add(item.serial().getSerialId()));
        List<Long> picked = new ArrayList<>(Math.min(quantity, eligibleOrdered.size()));
        while (picked.size() < Math.min(quantity, eligibleOrdered.size())) {
            boolean progressed = false;
            for (Deque<Long> queue : queues.values()) if (picked.size() < quantity && !queue.isEmpty()) { picked.add(queue.removeFirst()); progressed = true; }
            if (!progressed) break;
        }
        return picked;
    }
    private static List<String> badges(String raw) {
        if (raw == null || raw.isBlank()) return List.of();
        return Arrays.stream(raw.split(",")).map(String::trim).filter(value -> !value.isEmpty()).toList();
    }
}
