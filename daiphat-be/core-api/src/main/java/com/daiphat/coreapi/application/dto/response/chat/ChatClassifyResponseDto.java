package com.daiphat.coreapi.application.dto.response.chat;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ChatClassifyResponseDto {
    String intent;
    Double confidence;
    Map<String, String> entities;
    String suggestedReply;
}
