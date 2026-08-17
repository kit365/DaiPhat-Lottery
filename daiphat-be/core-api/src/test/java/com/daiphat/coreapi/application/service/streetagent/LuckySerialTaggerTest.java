package com.daiphat.coreapi.application.service.streetagent;

import com.daiphat.coreapi.application.port.out.streetagent.LuckyPatternConfigRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.streetagent.LuckyPatternType;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.domain.model.streetagent.LuckyPatternConfigModel;
import com.daiphat.coreapi.domain.model.streetagent.VendorAllocationSerialModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LuckySerialTaggerTest {

    @Mock
    private LuckyPatternConfigRepositoryPort luckyPatternConfigRepositoryPort;

    private LuckySerialTagger tagger;

    @BeforeEach
    void setUp() {
        tagger = new LuckySerialTagger(luckyPatternConfigRepositoryPort);
    }

    @Test
    void resolve_marksLuckyWhenExactPatternMatches() {
        when(luckyPatternConfigRepositoryPort.findActiveByPriorityDesc()).thenReturn(List.of(
                LuckyPatternConfigModel.builder()
                        .patternType(LuckyPatternType.EXACT)
                        .exactNumbers("686868")
                        .badgeLabel("Lộc phát")
                        .active(true)
                        .priority(10)
                        .build()
        ));

        LuckySerialTagger.LuckyTag tag = tagger.resolve("686868");

        assertThat(tag.lucky()).isTrue();
        assertThat(tag.luckyBadges()).isEqualTo("Lộc phát");
    }

    @Test
    void resolve_returnsNotLuckyWhenNoPatternMatches() {
        when(luckyPatternConfigRepositoryPort.findActiveByPriorityDesc()).thenReturn(List.of(
                LuckyPatternConfigModel.builder()
                        .patternType(LuckyPatternType.EXACT)
                        .exactNumbers("686868")
                        .badgeLabel("Lộc phát")
                        .active(true)
                        .build()
        ));

        LuckySerialTagger.LuckyTag tag = tagger.resolve("001234");

        assertThat(tag.lucky()).isFalse();
        assertThat(tag.luckyBadges()).isEmpty();
    }

    @Test
    void apply_setsFieldsOnInventorySerial() {
        when(luckyPatternConfigRepositoryPort.findActiveByPriorityDesc()).thenReturn(List.of(
                LuckyPatternConfigModel.builder()
                        .patternType(LuckyPatternType.EXACT)
                        .exactNumbers("999999")
                        .badgeLabel("Tứ quý")
                        .active(true)
                        .build()
        ));
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder().serialNumber("A1").build();

        tagger.apply(serial, "999999");

        assertThat(serial.isLucky()).isTrue();
        assertThat(serial.getLuckyBadges()).isEqualTo("Tứ quý");
    }

    @Test
    void apply_clearsLuckyOnVendorSerialWhenPatternsEmpty() {
        VendorAllocationSerialModel serial = VendorAllocationSerialModel.builder()
                .ticketNumbers("686868")
                .lucky(true)
                .luckyBadges("old")
                .build();

        tagger.apply(serial, List.of());

        assertThat(serial.isLucky()).isFalse();
        assertThat(serial.getLuckyBadges()).isEmpty();
    }
}
