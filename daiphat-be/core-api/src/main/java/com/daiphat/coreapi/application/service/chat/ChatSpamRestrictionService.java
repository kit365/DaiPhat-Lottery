package com.daiphat.coreapi.application.service.chat;

import com.daiphat.coreapi.application.config.ChatSpamProperties;
import com.daiphat.coreapi.application.port.out.chat.ConversationRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.chat.ChatSpamRestriction;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatSpamRestrictionService {

    private final ConversationRepositoryPort conversationRepositoryPort;
    private final ChatSpamProperties chatSpamProperties;

    public ChatSpamRestriction resolve(UUID customerId) {
        return resolve(customerId, LocalDateTime.now());
    }

    public ChatSpamRestriction resolve(UUID customerId, LocalDateTime now) {
        if (customerId == null) {
            return ChatSpamRestriction.clear(0, null);
        }

        LocalDateTime lookbackStart = now.minusHours(Math.max(chatSpamProperties.getRepeatWindowHours(), 1));
        List<ConversationModel> spamCloses = conversationRepositoryPort.findSpamClosesByCustomerSince(
                customerId,
                lookbackStart
        );

        LocalDateTime lastSpamAt = spamCloses.stream()
                .map(ConversationModel::getClosedAt)
                .filter(at -> at != null)
                .max(Comparator.naturalOrder())
                .orElse(null);

        int spamCount24h = (int) spamCloses.stream()
                .map(ConversationModel::getClosedAt)
                .filter(at -> at != null && !at.isBefore(lookbackStart))
                .count();

        LocalDateTime softUntil = null;
        if (lastSpamAt != null) {
            softUntil = lastSpamAt.plusMinutes(Math.max(chatSpamProperties.getSoftCooldownMinutes(), 1));
        }

        LocalDateTime repeatUntil = null;
        if (spamCount24h >= Math.max(chatSpamProperties.getRepeatThreshold(), 1) && lastSpamAt != null) {
            repeatUntil = lastSpamAt.plusHours(Math.max(chatSpamProperties.getRepeatCooldownHours(), 1));
        }

        LocalDateTime until = maxFuture(now, softUntil, repeatUntil);
        if (until == null) {
            return ChatSpamRestriction.clear(spamCount24h, lastSpamAt);
        }

        ChatSpamRestriction.Tier tier = repeatUntil != null && until.equals(repeatUntil)
                ? ChatSpamRestriction.Tier.REPEAT
                : ChatSpamRestriction.Tier.SOFT;

        return ChatSpamRestriction.builder()
                .restricted(true)
                .until(until)
                .tier(tier)
                .spamCount24h(spamCount24h)
                .lastSpamAt(lastSpamAt)
                .build();
    }

    public void assertCustomerCanEscalate(UUID customerId) {
        ChatSpamRestriction restriction = resolve(customerId);
        if (restriction.restricted()) {
            throw new DomainException(ErrorCode.CHAT_ESCALATE_SPAM_COOLDOWN);
        }
    }

    public boolean isCustomerEscalateRestricted(UUID customerId) {
        return resolve(customerId).restricted();
    }

    /** Prefers {@code second} when equal so REPEAT wins over SOFT at the same instant. */
    private static LocalDateTime maxFuture(LocalDateTime now, LocalDateTime first, LocalDateTime second) {
        LocalDateTime best = null;
        if (first != null && first.isAfter(now)) {
            best = first;
        }
        if (second != null && second.isAfter(now) && (best == null || !second.isBefore(best))) {
            best = second;
        }
        return best;
    }
}
