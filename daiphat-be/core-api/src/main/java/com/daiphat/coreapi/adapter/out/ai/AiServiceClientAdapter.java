package com.daiphat.coreapi.adapter.out.ai;

import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.config.ChatAiProperties;
import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponseDto;
import com.daiphat.coreapi.application.port.out.ai.AiServiceClientPort;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
public class AiServiceClientAdapter implements AiServiceClientPort {

    private final RestTemplate restTemplate;
    private final ChatAiProperties chatAiProperties;

    public AiServiceClientAdapter(ChatAiProperties chatAiProperties, RestTemplateBuilder restTemplateBuilder) {
        this.chatAiProperties = chatAiProperties;
        ChatAiProperties.Service service = chatAiProperties.getService();
        this.restTemplate = restTemplateBuilder
                .connectTimeout(Duration.ofMillis(service.getConnectTimeoutMs()))
                .readTimeout(Duration.ofMillis(service.getReadTimeoutMs()))
                .build();
    }

    @Override
    public ChatClassifyResponseDto classifyMessage(String message, Long conversationId) {
        if (!chatAiProperties.isEnabled()) {
            log.debug("Chat AI is disabled; skipping classify call.");
            return null;
        }

        try {
            String url = chatAiProperties.getService().getClassifyUrl();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> body = new HashMap<>();
            body.put("message", message);
            body.put("conversation_id", conversationId);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            ParameterizedTypeReference<ApiResponse<ChatClassifyResponseDto>> responseType =
                    new ParameterizedTypeReference<>() {};

            ResponseEntity<ApiResponse<ChatClassifyResponseDto>> response =
                    restTemplate.exchange(url, HttpMethod.POST, request, responseType);

            if (response.getBody() != null && response.getBody().isSuccess()) {
                return response.getBody().getData();
            }
            log.warn("AI service returned unsuccessful response: {}", response.getBody());
            return null;
        } catch (Exception e) {
            log.error("Failed to classify message using AI service", e);
            return null;
        }
    }
}
