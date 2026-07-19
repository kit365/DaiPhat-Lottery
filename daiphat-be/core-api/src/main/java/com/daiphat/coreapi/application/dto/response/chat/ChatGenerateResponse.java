package com.daiphat.coreapi.application.dto.response.chat;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ChatGenerateResponse {
    String reply;

    @JsonProperty("luckyNumbers")
    @JsonAlias({"lucky_numbers"})
    @Builder.Default
    List<String> luckyNumbers = new ArrayList<>();

    String symbol;
}
