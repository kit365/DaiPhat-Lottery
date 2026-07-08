package com.daiphat.coreapi.application.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "daiphat.chat.schedule")
public class ChatScheduleProperties {

    private List<String> intentKeywords = new ArrayList<>();
    private List<String> restartPhrases = new ArrayList<>();
    private List<String> allDaysPhrases = new ArrayList<>();
    private DateModePhrases dateModePhrases = new DateModePhrases();
    private SlotAnswerPhrases slotAnswers = new SlotAnswerPhrases();
    private List<String> nationAllPhrases = new ArrayList<>();
    private List<String> regionAllIntentPhrases = new ArrayList<>();
    private List<String> stationExclusionPhrases = new ArrayList<>();
    private RegionListIntent regionListIntent = new RegionListIntent();
    private Map<String, List<String>> regions = new LinkedHashMap<>();
    private List<StationAlias> stations = new ArrayList<>();
    private Map<String, List<String>> weekdays = new LinkedHashMap<>();
    private Map<String, List<String>> relativeDays = new LinkedHashMap<>();

    @Getter
    @Setter
    public static class DateModePhrases {
        private List<String> pickDate = new ArrayList<>();
        private List<String> pickWeekday = new ArrayList<>();
    }

    @Getter
    @Setter
    public static class SlotAnswerPhrases {
        private List<String> relativeDayExact = new ArrayList<>();
        private List<String> allStationsExact = new ArrayList<>();
        private List<String> allStationsContains = new ArrayList<>();
        private List<String> pickStationExact = new ArrayList<>();
        private List<String> pickStationContains = new ArrayList<>();
    }

    @Getter
    @Setter
    public static class RegionListIntent {
        private String stationCueWord;
        private String stationSuffixWord;
    }

    @Getter
    @Setter
    public static class StationAlias {
        private String name;
        private List<String> aliases = new ArrayList<>();
    }
}
