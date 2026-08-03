package com.daiphat.coreapi.infrastructure.adapter.out.ai.api;

import com.daiphat.coreapi.application.dto.request.fortune.FortuneProseAiRequest;
import com.daiphat.coreapi.application.port.out.ai.FortuneProsePort;
import com.daiphat.coreapi.infrastructure.dto.response.AiRemoteApiResponse;
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
import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
public class FortuneProseAiAdapter implements FortuneProsePort {

    public static final String PROSE_PATH = "/v1/fortune/cast/prose";

    private final RestTemplate restTemplate;
    private final String baseUrl;

    public FortuneProseAiAdapter(
            RestTemplateBuilder restTemplateBuilder,
            @Value("${daiphat.fortune.ai.service.base-url:${daiphat.chat.ai.service.base-url}}") String baseUrl,
            @Value("${daiphat.fortune.ai.service.connect-timeout-ms:3000}") int connectTimeoutMs,
            @Value("${daiphat.fortune.ai.service.read-timeout-ms:5000}") int readTimeoutMs
    ) {
        this.baseUrl = UrlUtils.normalizeBaseUrl(baseUrl, "daiphat.fortune.ai.service.base-url");
        this.restTemplate = restTemplateBuilder
                .connectTimeout(Duration.ofMillis(connectTimeoutMs))
                .readTimeout(Duration.ofMillis(readTimeoutMs))
                .build();
    }

    @Override
    public Optional<String> generateProse(FortuneProseAiRequest request) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            ResponseEntity<AiRemoteApiResponse<Map<String, Object>>> response = restTemplate.exchange(
                    baseUrl + PROSE_PATH,
                    HttpMethod.POST,
                    new HttpEntity<>(request, headers),
                    new ParameterizedTypeReference<>() {
                    }
            );
            if (response.getBody() == null || !response.getBody().isSuccess() || response.getBody().getData() == null) {
                log.warn("Fortune prose AI returned unsuccessful response");
                return Optional.empty();
            }
            Object prose = response.getBody().getData().get("prose");
            if (prose instanceof String text && !text.isBlank()) {
                return Optional.of(text.trim());
            }
            return Optional.empty();
        } catch (Exception e) {
            log.warn("Fortune prose AI call failed: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
