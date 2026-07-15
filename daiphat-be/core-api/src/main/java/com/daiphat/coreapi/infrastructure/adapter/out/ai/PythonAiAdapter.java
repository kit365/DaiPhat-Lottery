package com.daiphat.coreapi.infrastructure.adapter.out.ai;

import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponse;
import com.daiphat.coreapi.application.dto.response.chat.ChatGenerateResponse;
import com.daiphat.coreapi.application.port.out.ai.AiConsultPort;
import com.daiphat.coreapi.infrastructure.dto.AiConsultRequest;
import com.daiphat.coreapi.infrastructure.dto.AiRemoteApiResponse;
import com.daiphat.coreapi.shared.util.UrlUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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

@Slf4j
@Component
public class PythonAiAdapter implements AiConsultPort {

    private final RestTemplate restTemplate;
    private final String baseUrl;

    public PythonAiAdapter(
            RestTemplateBuilder restTemplateBuilder,
            @Value("${daiphat.chat.ai.service.base-url}") String baseUrl,
            @Value("${daiphat.chat.ai.service.connect-timeout-ms}") int connectTimeoutMs,
            @Value("${daiphat.chat.ai.service.read-timeout-ms}") int readTimeoutMs
    ) {
        this.baseUrl = UrlUtils.normalizeBaseUrl(baseUrl, "daiphat.chat.ai.service.base-url");
        this.restTemplate = restTemplateBuilder
                .connectTimeout(Duration.ofMillis(connectTimeoutMs))
                .readTimeout(Duration.ofMillis(readTimeoutMs))
                .build();
    }

    @Override
    public ChatClassifyResponse classifyMessage(String message, Long conversationId) {
        try {
            ResponseEntity<AiRemoteApiResponse<ChatClassifyResponse>> response = restTemplate.exchange(
                    endpointUrl(AiApiConstants.CLASSIFY_PATH),
                    HttpMethod.POST,
                    buildRequest(message, conversationId),
                    new ParameterizedTypeReference<>() {
                    }
            );
            return extractData(response, endpointUrl(AiApiConstants.CLASSIFY_PATH));
        } catch (Exception e) {
            log.error("Failed to classify message using AI service", e);
            return null;
        }
    }

    @Override
    public ChatGenerateResponse generateFortune(String message, Long conversationId) {
        try {
            ResponseEntity<AiRemoteApiResponse<ChatGenerateResponse>> response = restTemplate.exchange(
                    endpointUrl(AiApiConstants.GENERATE_PATH),
                    HttpMethod.POST,
                    buildRequest(message, conversationId),
                    new ParameterizedTypeReference<>() {
                    }
            );
            return extractData(response, endpointUrl(AiApiConstants.GENERATE_PATH));
        } catch (Exception e) {
            log.error("Failed to generate fortune reply using AI service", e);
            return null;
        }
    }

    private String endpointUrl(String path) {
        return baseUrl + path;
    }

    private HttpEntity<AiConsultRequest> buildRequest(String message, Long conversationId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(new AiConsultRequest(message, conversationId), headers);
    }

    private <T> T extractData(ResponseEntity<AiRemoteApiResponse<T>> response, String url) {
        if (response.getBody() != null && response.getBody().isSuccess()) {
            return response.getBody().getData();
        }
        log.warn("AI service returned unsuccessful response from {}: {}", url, response.getBody());
        return null;
    }
}
