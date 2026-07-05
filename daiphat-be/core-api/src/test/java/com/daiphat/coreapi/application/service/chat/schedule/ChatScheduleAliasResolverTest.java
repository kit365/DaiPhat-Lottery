package com.daiphat.coreapi.application.service.chat.schedule;

import com.daiphat.coreapi.application.config.ChatScheduleProperties;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryRegionCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ChatScheduleParser — alias")
class ChatScheduleAliasResolverTest {

    @Mock
    private ChatScheduleStationResolver stationResolver;

    private ChatScheduleParser parser;

    @BeforeEach
    void setUp() {
        ChatScheduleProperties properties = ChatScheduleTestFixtures.minimalProperties();
        properties.setIntentKeywords(List.of("lịch quay", "lich quay", "tra cứu lịch khác", "tra cuu lich khac"));
        properties.getRegions().put(LotteryRegionCode.MIEN_NAM.code(), List.of("miền nam", "mien nam"));
        parser = ChatScheduleTestFixtures.parser(properties, stationResolver);
    }

    @Test
    void mentionsScheduleIntent_matchesKeyword() {
        assertThat(parser.mentionsScheduleIntent("cho mình xem lịch quay")).isTrue();
    }

    @Test
    void mentionsScheduleIntent_matchesTraCuuLichKhac() {
        assertThat(parser.mentionsScheduleIntent("tra cứu lịch khác")).isTrue();
    }

    @Test
    void findRegionCode_matchesLongestRegionAlias() {
        assertThat(parser.findRegionCode("lịch miền nam")).isEqualTo(LotteryRegionCode.MIEN_NAM.code());
    }

    @Test
    void findStationCanonicalName_delegatesToStationResolver() {
        when(stationResolver.findStationNameForLegacyApi("tp.hcm")).thenReturn(java.util.Optional.of("Hồ Chí Minh"));

        assertThat(parser.findStationCanonicalName("tp.hcm")).isEqualTo("Hồ Chí Minh");
    }

    @Test
    void findStationCanonicalName_returnsNullWhenResolverMisses() {
        when(stationResolver.findStationNameForLegacyApi("xin chào")).thenReturn(java.util.Optional.empty());

        assertThat(parser.findStationCanonicalName("xin chào")).isNull();
    }
}
