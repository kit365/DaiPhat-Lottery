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
import java.util.HashMap;
import java.util.Map;

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

        JsonNode merged = root.path("merged");
        JsonNode front = root.path("front");
        JsonNode back = root.path("back");
        JsonNode frontFields = front.path("fields");
        JsonNode backFields = back.path("fields");

        // Prefer server-side merged payload; otherwise merge front/back locally.
        JsonNode fields = !merged.isMissingNode() && merged.isObject()
                ? merged
                : mergeFields(frontFields, backFields);

        boolean frontValid = front.path("is_valid").asBoolean(true);
        boolean backValid = back.isMissingNode() || back.isNull() || back.path("is_valid").asBoolean(true);
        boolean valid = frontValid && backValid && !fields.isMissingNode();

        String id = firstText(fields, "personal_identification_number", "id_number");
        String name = firstText(fields, "full_name", "name");
        String dob = firstText(fields, "date_of_birth", "dob");
        String gender = firstText(fields, "gender");
        String nationality = firstText(fields, "nationality");
        String placeOfBirth = firstText(fields, "place_of_birth_registration");
        String residence = firstText(fields, "place_of_residence", "address");
        String issueDate = firstText(fields, "issue_date");
        String expiryDate = firstText(fields, "expiry_date");

        String error = textOrNull(front, "error");
        if (error == null) {
            error = textOrNull(back, "error");
        }

        Map<String, String> fieldSides = new HashMap<>();
        fields.path("field_sides").fields().forEachRemaining(entry -> {
            String side = entry.getValue().asText(null);
            if ("front".equals(side) || "back".equals(side)) {
                fieldSides.put(entry.getKey(), side);
            }
        });

        return new EkycOcrResult(
                valid,
                name,
                id,
                dob,
                gender,
                nationality,
                placeOfBirth,
                residence,
                issueDate,
                expiryDate,
                error,
                fieldSides
        );
    }

    /**
     * Front-first for demographics; back-first for issue/expiry.
     */
    private static JsonNode mergeFields(JsonNode frontFields, JsonNode backFields) {
        com.fasterxml.jackson.databind.node.ObjectNode out =
                com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode();
        putFrontFirst(out, frontFields, backFields,
                "personal_identification_number", "id_number");
        putFrontFirst(out, frontFields, backFields, "full_name", "name");
        putFrontFirst(out, frontFields, backFields, "date_of_birth", "dob");
        putFrontFirst(out, frontFields, backFields, "gender");
        putFrontFirst(out, frontFields, backFields, "nationality");
        putFrontFirst(out, frontFields, backFields, "place_of_birth_registration");
        putFrontFirst(out, frontFields, backFields, "place_of_residence", "address");
        putBackFirst(out, frontFields, backFields, "issue_date");
        putBackFirst(out, frontFields, backFields, "expiry_date");
        // legacy mirrors
        if (out.has("personal_identification_number")) {
            out.put("id_number", out.get("personal_identification_number").asText());
        }
        if (out.has("full_name")) {
            out.put("name", out.get("full_name").asText());
        }
        if (out.has("date_of_birth")) {
            out.put("dob", out.get("date_of_birth").asText());
        }
        if (out.has("place_of_residence")) {
            out.put("address", out.get("place_of_residence").asText());
        }
        return out;
    }

    private static void putFrontFirst(
            com.fasterxml.jackson.databind.node.ObjectNode out,
            JsonNode front,
            JsonNode back,
            String... keys
    ) {
        String value = firstText(front, keys);
        if (value == null) {
            value = firstText(back, keys);
        }
        if (value != null) {
            out.put(keys[0], value);
        }
    }

    private static void putBackFirst(
            com.fasterxml.jackson.databind.node.ObjectNode out,
            JsonNode front,
            JsonNode back,
            String... keys
    ) {
        String value = firstText(back, keys);
        if (value == null) {
            value = firstText(front, keys);
        }
        if (value != null) {
            out.put(keys[0], value);
        }
    }

    private static String firstText(JsonNode node, String... keys) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        for (String key : keys) {
            String value = textOrNull(node, key);
            if (value != null) {
                return value;
            }
        }
        return null;
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
