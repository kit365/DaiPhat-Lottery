package com.daiphat.coreapi.application.service.chat.schedule;

import com.daiphat.coreapi.application.config.ChatScheduleProperties;
import com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleStationMatchResult;
import com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleStationResolveResult;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.chat.ChatScheduleStationMatchSource;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ChatScheduleStationResolver")
class ChatScheduleStationMatcherTest {

    @Mock
    private LotteryStationRepositoryPort lotteryStationRepositoryPort;

    private ChatScheduleStationResolver stationResolver;

    @BeforeEach
    void setUp() {
        ChatScheduleProperties properties = new ChatScheduleProperties();
        properties.setIntentKeywords(List.of("lich quay"));
        ChatScheduleProperties.StationAlias hcm = new ChatScheduleProperties.StationAlias();
        hcm.setName("Hồ Chí Minh");
        hcm.setAliases(List.of("tp.hcm", "hcm"));
        properties.setStations(List.of(hcm));

        when(lotteryStationRepositoryPort.findAll()).thenReturn(List.of(
                activeStation(1L, "Hồ Chí Minh"),
                activeStation(2L, "Bến Tre")
        ));
        stationResolver = ChatScheduleTestFixtures.stationResolver(properties, lotteryStationRepositoryPort);
    }

    @Test
    void match_yamlAlias_resolvesHcm() {
        Optional<ChatScheduleStationMatchResult> result = stationResolver.match("tp.hcm hôm nay");

        assertThat(result).isPresent();
        assertThat(result.get().source()).isEqualTo(ChatScheduleStationMatchSource.YAML);
        assertThat(result.get().station().getName()).isEqualTo("Hồ Chí Minh");
    }

    @Test
    void match_autoAlias_benTreWithoutYaml() {
        Optional<ChatScheduleStationMatchResult> result = stationResolver.match("cho em xem lich dai ben tre");

        assertThat(result).isPresent();
        assertThat(result.get().source()).isEqualTo(ChatScheduleStationMatchSource.AUTO_ALIAS);
        assertThat(result.get().station().getName()).isEqualTo("Bến Tre");
    }

    @Test
    void match_fuzzy_typoBenTre() {
        Optional<ChatScheduleStationMatchResult> result = stationResolver.match("Bên Tre");

        assertThat(result).isPresent();
        assertThat(result.get().source()).isEqualTo(ChatScheduleStationMatchSource.FUZZY);
        assertThat(result.get().station().getName()).isEqualTo("Bến Tre");
    }

    @Test
    void match_unknown_returnsEmpty() {
        assertThat(stationResolver.match("xyz abc random")).isEmpty();
    }

    @Test
    void resolve_multipleSegments_returnsMultiple() {
        ChatScheduleStationResolveResult result = stationResolver.resolve("hcm với bến tre");

        assertThat(result).isInstanceOf(ChatScheduleStationResolveResult.Multiple.class);
        ChatScheduleStationResolveResult.Multiple multiple = (ChatScheduleStationResolveResult.Multiple) result;
        assertThat(multiple.matches()).hasSize(2);
    }

    @Test
    void resolve_ambiguousNearScore_returnsAmbiguous() {
        when(lotteryStationRepositoryPort.findAll()).thenReturn(List.of(
                activeStation(1L, "Hồ Chí Minh"),
                activeStation(2L, "Bến Tre"),
                activeStation(10L, "Tiền Giang"),
                activeStation(11L, "Kiên Giang")
        ));
        stationResolver.rebuild();

        ChatScheduleStationResolveResult result = stationResolver.resolve("giang");

        assertThat(result).isInstanceOf(ChatScheduleStationResolveResult.Ambiguous.class);
    }

    private LotteryStationModel activeStation(Long id, String name) {
        LotteryRegionModel region = new LotteryRegionModel();
        region.setCode("MIEN_NAM");
        LotteryStationModel model = new LotteryStationModel();
        model.setId(id);
        model.setName(name);
        model.setStatus(LotteryStationStatus.ACTIVE);
        model.setRegion(region);
        return model;
    }
}
