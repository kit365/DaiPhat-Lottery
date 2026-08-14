package com.daiphat.coreapi.application.service.streetagent;

import com.daiphat.coreapi.application.port.out.streetagent.LuckyPatternConfigRepositoryPort;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.domain.model.streetagent.LuckyPatternConfigModel;
import com.daiphat.coreapi.domain.model.streetagent.VendorAllocationSerialModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Shared lucky-pattern tagging for inventory create and full recompute.
 * Capacity formula reads {@code is_lucky} on serials — tags must stay consistent.
 */
@Component
@RequiredArgsConstructor
public class LuckySerialTagger {

    private final LuckyPatternConfigRepositoryPort luckyPatternConfigRepositoryPort;

    public record LuckyTag(boolean lucky, String luckyBadges) {
    }

    public List<LuckyPatternConfigModel> loadActivePatterns() {
        return luckyPatternConfigRepositoryPort.findActiveByPriorityDesc();
    }

    public LuckyTag resolve(String ticketNumbers) {
        return resolve(ticketNumbers, loadActivePatterns());
    }

    public LuckyTag resolve(String ticketNumbers, List<LuckyPatternConfigModel> patterns) {
        if (ticketNumbers == null || ticketNumbers.isBlank() || patterns == null || patterns.isEmpty()) {
            return new LuckyTag(false, "");
        }
        List<String> badges = patterns.stream()
                .filter(pattern -> pattern.matches(ticketNumbers))
                .map(LuckyPatternConfigModel::getBadgeLabel)
                .distinct()
                .toList();
        return new LuckyTag(!badges.isEmpty(), String.join(",", badges));
    }

    public void apply(LotteryTicketSerialModel serial, String ticketNumbers) {
        LuckyTag tag = resolve(ticketNumbers);
        serial.setLucky(tag.lucky());
        serial.setLuckyBadges(tag.luckyBadges());
    }

    public void apply(VendorAllocationSerialModel serial, List<LuckyPatternConfigModel> patterns) {
        LuckyTag tag = resolve(serial.getTicketNumbers(), patterns);
        serial.setLucky(tag.lucky());
        serial.setLuckyBadges(tag.luckyBadges());
    }
}
