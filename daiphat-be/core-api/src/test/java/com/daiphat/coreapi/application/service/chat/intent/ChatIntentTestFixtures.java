package com.daiphat.coreapi.application.service.chat.intent;

import com.daiphat.coreapi.application.config.ChatIntentProperties;

import java.util.List;

public final class ChatIntentTestFixtures {

    private ChatIntentTestFixtures() {
    }

    public static ChatIntentProperties minimalProperties() {
        ChatIntentProperties properties = new ChatIntentProperties();
        properties.setEscalateKeywords(List.of(
                "nhan vien", "nguoi that", "tu van vien", "ho tro truc tiep", "nguoi ho tro"
        ));
        properties.setAccountKeywords(List.of(
                "don hang", "mua ve", "thanh toan", "chua nhan duoc", "loi nap tien", "nap tien"
        ));
        properties.setResultKeywords(List.of(
                "ket qua", "xo so", "trung khong", "do ve", "ve so", "kqxs"
        ));
        properties.setFortuneKeywords(List.of(
                "giac mo", "phong thuy", "con so may man", "giai ma giac mo", "tu vi"
        ));
        properties.setTrashTalkExact(List.of(
                "hi", "hello", "chao", "xin chao", "chao ban", "chao shop"
        ));
        properties.setScheduleDateContextVerbs(List.of("lich", "quay", "mo thuong"));
        ChatIntentProperties.StationScheduleLookup lookup = new ChatIntentProperties.StationScheduleLookup();
        lookup.setCueWord("dai");
        lookup.setLookupVerbs(List.of("tra cuu", "lich", "quay", "mo thuong", "tim ", " xem"));
        properties.setStationScheduleLookup(lookup);
        return properties;
    }
}
