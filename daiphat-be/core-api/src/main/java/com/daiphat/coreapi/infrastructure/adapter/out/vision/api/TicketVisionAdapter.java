package com.daiphat.coreapi.infrastructure.adapter.out.vision.api;

import com.daiphat.coreapi.application.port.out.vision.TicketVisionPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.infrastructure.dto.request.vision.RemoteScanMetadata;
import com.daiphat.coreapi.infrastructure.dto.response.ai.AiRemoteApiResponse;
import com.daiphat.coreapi.infrastructure.dto.response.vision.RemoteTicketScanResult;
import com.daiphat.coreapi.shared.util.UrlUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

/**
 * Calls the ticket-vision Python microservice's POST /v1/scan. Mirrors
 * PythonAiAdapter's RestTemplate/timeout wiring, but unlike the best-effort
 * chat/fortune AI calls (which swallow failures to null), a scan request
 * has no useful fallback, so failures are surfaced as a DomainException.
 */
@Slf4j
@Component
public class TicketVisionAdapter implements TicketVisionPort {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String baseUrl;

    public TicketVisionAdapter(
            RestTemplateBuilder restTemplateBuilder,
            ObjectMapper objectMapper,
            @Value("${daiphat.ticket-vision.service.base-url}") String baseUrl,
            @Value("${daiphat.ticket-vision.service.connect-timeout-ms}") int connectTimeoutMs,
            @Value("${daiphat.ticket-vision.service.read-timeout-ms}") int readTimeoutMs
    ) {
        this.objectMapper = objectMapper;
        this.baseUrl = UrlUtils.normalizeBaseUrl(baseUrl, "daiphat.ticket-vision.service.base-url");
        this.restTemplate = restTemplateBuilder
                .connectTimeout(Duration.ofMillis(connectTimeoutMs))
                .readTimeout(Duration.ofMillis(readTimeoutMs))
                .build();
    }

    @Override
    public RemoteTicketScanResult scan(byte[] imageBytes, String fileName, RemoteScanMetadata metadata) {
        if (baseUrl == null || baseUrl.isBlank()) {
            log.warn("ticket-vision base URL is unconfigured or empty");
            throw new DomainException(
                    ErrorCode.TICKET_SCAN_SERVICE_UNAVAILABLE,
                    "ticket-vision service is not configured"
            );
        }
        String url = baseUrl + TicketVisionApiConstants.SCAN_PATH;
        try {
            ResponseEntity<AiRemoteApiResponse<RemoteTicketScanResult>> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    buildRequest(imageBytes, fileName, metadata),
                    new ParameterizedTypeReference<>() {
                    }
            );

            AiRemoteApiResponse<RemoteTicketScanResult> body = response.getBody();
            if (body == null || !body.isSuccess() || body.getData() == null) {
                log.error("ticket-vision returned unsuccessful response from {}: {}", url, body);
                throw new DomainException(
                        ErrorCode.TICKET_SCAN_SERVICE_UNAVAILABLE,
                        body != null ? body.getMessage() : "empty response body"
                );
            }
            return body.getData();
        } catch (RestClientException e) {
            log.error("Failed to call ticket-vision scan service at {}", url, e);
            throw new DomainException(ErrorCode.TICKET_SCAN_SERVICE_UNAVAILABLE, e);
        }
    }

    private HttpEntity<MultiValueMap<String, Object>> buildRequest(
            byte[] imageBytes,
            String fileName,
            RemoteScanMetadata metadata
    ) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new NamedByteArrayResource(imageBytes, fileName));
        if (metadata != null) {
            String metadataJson = writeMetadataJson(metadata);
            if (metadataJson != null) {
                body.add("metadata", metadataJson);
            }
        }

        return new HttpEntity<>(body, headers);
    }

    private String writeMetadataJson(RemoteScanMetadata metadata) {
        try {
            return objectMapper.writeValueAsString(metadata);
        } catch (Exception e) {
            // Missing metadata just means ticket-vision falls back to its own
            // small bootstrap station list -- degrade gracefully, don't fail the scan.
            log.warn("Failed to serialize ticket-vision scan metadata, sending image without it", e);
            return null;
        }
    }

    private static final class NamedByteArrayResource extends ByteArrayResource {
        private final String fileName;

        NamedByteArrayResource(byte[] byteArray, String fileName) {
            super(byteArray);
            this.fileName = fileName != null && !fileName.isBlank() ? fileName : "ticket.jpg";
        }

        @Override
        public String getFilename() {
            return fileName;
        }
    }
}
