package com.daiphat.coreapi.application.service.chat;

import com.daiphat.coreapi.application.config.ChatSpamProperties;
import com.daiphat.coreapi.application.port.out.chat.ConversationRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.chat.ChatSpamRestriction;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationCloseReason;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ChatSpamRestrictionService")
class ChatSpamRestrictionServiceTest {

    private static final UUID CUSTOMER_ID = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

    @Mock
    private ConversationRepositoryPort conversationRepositoryPort;

    private ChatSpamProperties properties;
    private ChatSpamRestrictionService service;

    @BeforeEach
    void setUp() {
        properties = new ChatSpamProperties();
        properties.setSoftCooldownMinutes(60);
        properties.setRepeatThreshold(3);
        properties.setRepeatWindowHours(24);
        properties.setRepeatCooldownHours(24);
        service = new ChatSpamRestrictionService(conversationRepositoryPort, properties);
    }

    @Test
    void resolve_noSpam_isClear() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 31, 12, 0);
        when(conversationRepositoryPort.findSpamClosesByCustomerSince(eq(CUSTOMER_ID), any()))
                .thenReturn(List.of());

        ChatSpamRestriction restriction = service.resolve(CUSTOMER_ID, now);

        assertThat(restriction.restricted()).isFalse();
        assertThat(restriction.spamCount24h()).isZero();
        assertThat(restriction.until()).isNull();
    }

    @Test
    void resolve_oneRecentSpam_appliesSoftCooldown() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 31, 12, 0);
        LocalDateTime spamAt = now.minusMinutes(20);
        when(conversationRepositoryPort.findSpamClosesByCustomerSince(eq(CUSTOMER_ID), any()))
                .thenReturn(List.of(spamClose(spamAt)));

        ChatSpamRestriction restriction = service.resolve(CUSTOMER_ID, now);

        assertThat(restriction.restricted()).isTrue();
        assertThat(restriction.tier()).isEqualTo(ChatSpamRestriction.Tier.SOFT);
        assertThat(restriction.until()).isEqualTo(spamAt.plusMinutes(60));
        assertThat(restriction.spamCount24h()).isEqualTo(1);
    }

    @Test
    void resolve_softCooldownExpired_isClear() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 31, 12, 0);
        LocalDateTime spamAt = now.minusMinutes(90);
        when(conversationRepositoryPort.findSpamClosesByCustomerSince(eq(CUSTOMER_ID), any()))
                .thenReturn(List.of(spamClose(spamAt)));

        ChatSpamRestriction restriction = service.resolve(CUSTOMER_ID, now);

        assertThat(restriction.restricted()).isFalse();
        assertThat(restriction.spamCount24h()).isEqualTo(1);
    }

    @Test
    void resolve_threeSpamIn24h_appliesRepeatCooldown() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 31, 12, 0);
        LocalDateTime latest = now.minusMinutes(10);
        when(conversationRepositoryPort.findSpamClosesByCustomerSince(eq(CUSTOMER_ID), any()))
                .thenReturn(List.of(
                        spamClose(latest),
                        spamClose(now.minusHours(2)),
                        spamClose(now.minusHours(5))
                ));

        ChatSpamRestriction restriction = service.resolve(CUSTOMER_ID, now);

        assertThat(restriction.restricted()).isTrue();
        assertThat(restriction.tier()).isEqualTo(ChatSpamRestriction.Tier.REPEAT);
        assertThat(restriction.until()).isEqualTo(latest.plusHours(24));
        assertThat(restriction.spamCount24h()).isEqualTo(3);
    }

    @Test
    void resolve_newSpamDuringCooldown_extendsFromLatest() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 31, 12, 0);
        LocalDateTime latest = now.minusMinutes(5);
        when(conversationRepositoryPort.findSpamClosesByCustomerSince(eq(CUSTOMER_ID), any()))
                .thenReturn(List.of(
                        spamClose(latest),
                        spamClose(now.minusHours(1)),
                        spamClose(now.minusHours(3))
                ));

        ChatSpamRestriction first = service.resolve(CUSTOMER_ID, now);
        assertThat(first.until()).isEqualTo(latest.plusHours(24));

        LocalDateTime newer = now.plusMinutes(30);
        when(conversationRepositoryPort.findSpamClosesByCustomerSince(eq(CUSTOMER_ID), any()))
                .thenReturn(List.of(
                        spamClose(newer),
                        spamClose(latest),
                        spamClose(now.minusHours(1)),
                        spamClose(now.minusHours(3))
                ));

        ChatSpamRestriction extended = service.resolve(CUSTOMER_ID, now.plusMinutes(30));
        assertThat(extended.until()).isEqualTo(newer.plusHours(24));
        assertThat(extended.until()).isAfter(first.until());
    }

    @Test
    void assertCustomerCanEscalate_throwsWhenRestricted() {
        LocalDateTime now = LocalDateTime.now();
        when(conversationRepositoryPort.findSpamClosesByCustomerSince(eq(CUSTOMER_ID), any()))
                .thenReturn(List.of(spamClose(now.minusMinutes(5))));

        assertThatThrownBy(() -> service.assertCustomerCanEscalate(CUSTOMER_ID))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> assertThat(((DomainException) ex).getErrorCode())
                        .isEqualTo(ErrorCode.CHAT_ESCALATE_SPAM_COOLDOWN));
    }

    private static ConversationModel spamClose(LocalDateTime closedAt) {
        return ConversationModel.builder()
                .customerId(CUSTOMER_ID)
                .closeReason(ConversationCloseReason.SPAM)
                .closedAt(closedAt)
                .build();
    }
}
