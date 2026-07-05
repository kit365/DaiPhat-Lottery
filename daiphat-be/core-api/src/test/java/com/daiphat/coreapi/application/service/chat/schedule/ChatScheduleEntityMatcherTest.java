package com.daiphat.coreapi.application.service.chat.schedule;

import com.daiphat.coreapi.application.config.ChatScheduleProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
@DisplayName("ChatScheduleParser — entity")
class ChatScheduleEntityMatcherTest {

    @Mock
    private ChatScheduleStationResolver stationResolver;

    private ChatScheduleParser parser;

    @BeforeEach
    void setUp() {
        ChatScheduleProperties properties = ChatScheduleTestFixtures.minimalProperties();
        properties.getRegions().put("MIEN_NAM", List.of("mien nam"));
        parser = ChatScheduleTestFixtures.parser(properties, stationResolver);
    }

    @Test
    void mentionsRegionAllListIntent_daiMienNam() {
        assertThat(parser.mentionsRegionAllListIntent("lịch mở thưởng đài miền nam thứ 3"))
                .isTrue();
    }

    @Test
    void mentionsRegionAllListIntent_mienNamThu3WithoutDai_isFalse() {
        assertThat(parser.mentionsRegionAllListIntent("lịch mở thưởng miền nam thứ 3"))
                .isFalse();
    }

    @Test
    void mentionsRegionAllListIntent_quayDaiNao() {
        assertThat(parser.mentionsRegionAllListIntent("miền nam hôm nay quay đài nào"))
                .isTrue();
    }
}
