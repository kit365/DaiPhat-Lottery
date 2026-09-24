package com.daiphat.coreapi.infrastructure.adapter.out.ekyc;

import com.daiphat.coreapi.application.port.out.ekyc.EkycAiPort;
import com.daiphat.coreapi.application.port.out.ekyc.EkycFaceVerifyResult;
import com.daiphat.coreapi.application.port.out.ekyc.EkycLivenessResult;
import com.daiphat.coreapi.application.port.out.ekyc.EkycOcrResult;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.shared.util.UrlUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Slf4j
@Component
public class EkycAiAdapter implements EkycAiPort {

    private final RestTemplate restTemplate;
    private final RestTemplate healthRestTemplate;
    private final ObjectMapper objectMapper;
    private final String baseUrl;
    private final String apiKey;

    public EkycAiAdapter(
            RestTemplateBuilder restTemplateBuilder,
            ObjectMapper objectMapper,
            @Value("${daiphat.ekyc-ai.service.base-url}") String baseUrl,
            @Value("${daiphat.ekyc-ai.service.api-key:}") String apiKey,
            @Value("${daiphat.ekyc-ai.service.connect-timeout-ms:5000}") int connectTimeoutMs,
            @Value("${daiphat.ekyc-ai.service.read-timeout-ms:120000}") int readTimeoutMs
    ) {
        this.objectMapper = objectMapper;
        this.baseUrl = UrlUtils.normalizeBaseUrl(baseUrl, "daiphat.ekyc-ai.service.base-url");
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.restTemplate = restTemplateBuilder
                .connectTimeout(Duration.ofMillis(connectTimeoutMs))
                .readTimeout(Duration.ofMillis(readTimeoutMs))
                .build();
        this.healthRestTemplate = restTemplateBuilder
                .connectTimeout(Duration.ofMillis(Math.min(connectTimeoutMs, 3_000)))
                .readTimeout(Duration.ofMillis(3_000))
                .build();
    }

    @Override
    public boolean isHealthy() {
        if (baseUrl == null || baseUrl.isBlank()) {
            return false;
        }
        try {
            ResponseEntity<String> response = healthRestTemplate.getForEntity(
                    baseUrl + EkycAiApiConstants.HEALTH_PATH,
                    String.class
            );
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            log.debug("ekyc-vision health check failed at {}: {}", baseUrl, e.toString());
            return false;
        }
    }

    @Override
    public EkycLivenessResult liveness(byte[] selfieBytes) {
        JsonNode root = postMultipart(
                EkycAiApiConstants.LIVENESS_PATH,
                parts -> parts.add("selfie", namedBytes(selfieBytes, "selfie.jpg"))
        );
        return new EkycLivenessResult(
                root.path("is_live").asBoolean(false),
                root.path("score").asDouble(0),
                textOrNull(root, "method"),
                textOrNull(root, "error")
        );
    }

    @Override
    public EkycFaceVerifyResult faceVerify(byte[] selfieBytes, byte[] idFrontBytes) {
        JsonNode root = postMultipart(
                EkycAiApiConstants.FACE_VERIFY_PATH,
                parts -> {
                    parts.add("selfie", namedBytes(selfieBytes, "selfie.jpg"));
                    parts.add("id_front", namedBytes(idFrontBytes, "id_front.jpg"));
                }
        );
        return new EkycFaceVerifyResult(
                root.path("verified").asBoolean(false),
                root.path("distance").asDouble(1.0),
                root.path("score").asDouble(0),
                textOrNull(root, "method"),
                textOrNull(root, "error")
        );
    }

    @Override
    public EkycOcrResult ocrIdCard(byte[] frontBytes, byte[] backBytes) {
        JsonNode root = postMultipart(
                EkycAiApiConstants.OCR_ID_CARD_PATH,
                parts -> {
                    parts.add("front", namedBytes(frontBytes, "front.jpg"));
                    if (backBytes != null && backBytes.length > 0) {
                        parts.add("back", namedBytes(backBytes, "back.jpg"));
                    }
                }
        );
        JsonNode front = root.path("front");
        JsonNode fields = front.path("fields");
        boolean valid = front.path("is_valid").asBoolean(true) && !fields.isMissingNode();
        return new EkycOcrResult(
                valid,
                textOrNull(fields, "name"),
                textOrNull(fields, "id_number"),
                textOrNull(fields, "dob"),
                textOrNull(fields, "address"),
                textOrNull(fields, "expiry_date"),
                textOrNull(front, "error")
        );
    }

    @FunctionalInterface
    private interface PartBuilder {
        void accept(MultiValueMap<String, Object> parts);
    }

    private JsonNode postMultipart(String path, PartBuilder builder) {
        requireConfigured();
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        builder.accept(body);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        if (!apiKey.isBlank()) {
            headers.set(EkycAiApiConstants.API_KEY_HEADER, apiKey);
        }
        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    baseUrl + path,
                    new HttpEntity<>(body, headers),
                    String.class
            );
            String payload = response.getBody();
            if (payload == null || payload.isBlank()) {
                throw new DomainException(ErrorCode.EKYC_AI_UNAVAILABLE);
            }
            return objectMapper.readTree(payload);
        } catch (DomainException e) {
            throw e;
        } catch (RestClientException e) {
            log.error("ekyc-vision call failed at {}{}", baseUrl, path, e);
            throw new DomainException(ErrorCode.EKYC_AI_UNAVAILABLE, e);
        } catch (Exception e) {
            log.error("ekyc-vision response parse failed at {}{}", baseUrl, path, e);
            throw new DomainException(ErrorCode.EKYC_AI_UNAVAILABLE, e);
        }
    }

    private void requireConfigured() {
        if (baseUrl == null || baseUrl.isBlank()) {
            throw new DomainException(ErrorCode.EKYC_AI_UNAVAILABLE);
        }
    }

    private static ByteArrayResource namedBytes(byte[] data, String filename) {
        return new ByteArrayResource(data == null ? new byte[0] : data) {
            @Override
            public String getFilename() {
                return filename;
            }
        };
    }

    private static String textOrNull(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }
        String text = value.asText(null);
        return text == null || text.isBlank() ? null : text.trim();
    }
}
