package com.daiphat.coreapi.application.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "daiphat.chat.intent")
public class ChatIntentProperties {

    private List<String> escalateKeywords = new ArrayList<>();
    private List<String> accountKeywords = new ArrayList<>();
    private List<String> resultKeywords = new ArrayList<>();
    private List<String> fortuneKeywords = new ArrayList<>();
    private List<String> trashTalkExact = new ArrayList<>();
    private List<String> scheduleDateContextVerbs = new ArrayList<>();
    private StationScheduleLookup stationScheduleLookup = new StationScheduleLookup();

    @Getter
    @Setter
    public static class StationScheduleLookup {
        private String cueWord;
        private List<String> lookupVerbs = new ArrayList<>();
    }
}
