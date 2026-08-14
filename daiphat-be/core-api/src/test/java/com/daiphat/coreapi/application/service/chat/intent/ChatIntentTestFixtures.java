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
        properties.setSearchKeywords(List.of(
                "tim ve", "co so", "so duoi", "duoi so", "duoi la", "duoi", "co duoi",
                "so dau", "dau so", "dau", "con ve", "ve con khong"
        ));
        properties.setSuggestKeywords(List.of(
                "goi y ve", "goi y so", "goi y", "goi y cho toi", "goi y ve so",
                "ve dep", "chon ve", "con so may man", "so may man", "de xuat ve"
        ));
        properties.setResultKeywords(List.of(
                "ket qua", "xo so", "trung khong", "do ve", "kqxs"
        ));
        properties.setFortuneKeywords(List.of(
                "giac mo", "nam mo", "mo thay", "chiem bao", "so mo",
                "giai ma giac mo", "giai mong", "phong thuy", "tu vi",
                "chiem tinh", "boi mong", "mo con",
                "cung hoang dao", "hoang dao", "thien binh", "con giap",
                "can menh", "ban menh", "menh kim", "nen mua so", "mua so gi"
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
