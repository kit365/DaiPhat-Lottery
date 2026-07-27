package com.daiphat.coreapi.application.service.chat.flow.schedule;

import com.daiphat.coreapi.application.config.ChatScheduleProperties;
import com.daiphat.coreapi.application.port.in.chat.AiServiceConfigPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class ChatScheduleTestFixtures {

    private ChatScheduleTestFixtures() {
    }

    public static ChatScheduleProperties minimalProperties() {
        ChatScheduleProperties properties = new ChatScheduleProperties();
        properties.setIntentKeywords(List.of("lich mo thuong", "lich quay"));
        properties.setRestartPhrases(List.of("tra cuu lich khac"));
        properties.setAllDaysPhrases(List.of(
                "tat ca ngay",
                "tat ca ngay trong tuan",
                "ca tuan",
                "lich tuan",
                "ca ngay trong tuan",
                "all days",
                "full week"
        ));
        ChatScheduleProperties.DateModePhrases dateModePhrases = new ChatScheduleProperties.DateModePhrases();
        dateModePhrases.setPickDate(List.of("chon ngay"));
        dateModePhrases.setPickWeekday(List.of("chon thu"));
        properties.setDateModePhrases(dateModePhrases);
        ChatScheduleProperties.SlotAnswerPhrases slotAnswers = new ChatScheduleProperties.SlotAnswerPhrases();
        slotAnswers.setRelativeDayExact(List.of("hom nay", "hnay", "ngay mai"));
        slotAnswers.setAllStationsExact(List.of("tat ca", "all", "1"));
        slotAnswers.setAllStationsContains(List.of("tat ca dai", "xem tat ca"));
        slotAnswers.setPickStationExact(List.of("2"));
        slotAnswers.setPickStationContains(List.of("dai cu the", "chon dai", "chon mot dai", "chon dai cu the"));
        properties.setSlotAnswers(slotAnswers);
        properties.setRegionTodayPhrases(List.of(
                "dai quay hom nay",
                "dai hom nay",
                "hom nay quay",
                "xem dai hom nay"
        ));
        properties.setWeekSchedulePhrases(List.of(
                "lich ca tuan",
                "lich tuan",
                "xem lich tuan"
        ));
        properties.setNationAllPhrases(List.of(
                "ca 3 mien", "ca ba mien", "tat ca mien", "toan quoc", "ca nuoc"
        ));
        properties.setRegionAllIntentPhrases(List.of(
                "quay dai nao",
                "co may dai",
                "co bao nhieu dai",
                "may dai quay",
                "dai nao quay",
                "tat ca dai",
                "dai mien nam",
                "dai mien bac",
                "dai mien trung",
                "dai mien"
        ));
        properties.setStationExclusionPhrases(List.of("dai mien", "quay dai nao"));
        ChatScheduleProperties.RegionListIntent regionListIntent = new ChatScheduleProperties.RegionListIntent();
        regionListIntent.setStationCueWord("dai");
        regionListIntent.setStationSuffixWord("thu");
        properties.setRegionListIntent(regionListIntent);
        Map<String, List<String>> regions = new LinkedHashMap<>();
        regions.put("MIEN_NAM", List.of("mien nam"));
        regions.put("MIEN_BAC", List.of("mien bac"));
        properties.setRegions(regions);
        Map<String, List<String>> weekdays = new LinkedHashMap<>();
        weekdays.put("SATURDAY", List.of("thu 7", "thu 7"));
        properties.setWeekdays(weekdays);
        Map<String, List<String>> relativeDays = new LinkedHashMap<>();
        relativeDays.put("TODAY", List.of("hom nay", "hnay"));
        relativeDays.put("TOMORROW", List.of("ngay mai"));
        properties.setRelativeDays(relativeDays);
        return properties;
    }

    public static ChatScheduleStationResolver stationResolver(
            ChatScheduleProperties properties,
            LotteryStationRepositoryPort lotteryStationRepositoryPort
    ) {
        ChatScheduleStationResolver resolver =
                new ChatScheduleStationResolver(properties, lotteryStationRepositoryPort, aiServiceConfigPort());
        resolver.rebuild();
        return resolver;
    }

    public static ChatScheduleParser parser(
            ChatScheduleProperties properties,
            ChatScheduleStationResolver stationResolver
    ) {
        return new ChatScheduleParser(properties, stationResolver);
    }

    public static AiServiceConfigPort aiServiceConfigPort() {
        AiServiceConfigPort port = org.mockito.Mockito.mock(AiServiceConfigPort.class);
        org.mockito.Mockito.lenient().when(port.stationFuzzyMatchThreshold()).thenReturn(0.75);
        org.mockito.Mockito.lenient().when(port.stationFuzzyAmbiguityGap()).thenReturn(0.10);
        return port;
    }
}
