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
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Calls the ticket-vision Python microservice's POST /v1/scan.
 *
 * <p>Connectivity / true outages → {@link ErrorCode#TICKET_SCAN_SERVICE_UNAVAILABLE} (503).
 * OCR soft-failures (success:false, empty body, parse issues) degrade to an empty
 * scan result with warnings so partial/unreadable tickets never become HTTP 500/503.
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
                String visionMessage = body != null ? body.getMessage() : "empty response body";
                log.warn("ticket-vision soft-failed at {}: {}", url, visionMessage);
                return emptyResult(List.of(
                        visionMessage != null && !visionMessage.isBlank()
                                ? visionMessage
                                : "OCR không trả về kết quả cho ảnh này."
                ));
            }
            return normalize(body.getData());
        } catch (ResourceAccessException e) {
            log.error("ticket-vision unreachable at {}", url, e);
            throw new DomainException(ErrorCode.TICKET_SCAN_SERVICE_UNAVAILABLE, e);
        } catch (RestClientException e) {
            // Includes many conversion failures — soft-degrade so one bad OCR payload
            // never becomes HTTP 500 for the Admin upload flow.
            log.error("ticket-vision call failed at {} — returning empty soft result", url, e);
            return emptyResult(List.of(
                    "Không thể phân tích kết quả OCR từ dịch vụ quét vé. Vui lòng thử ảnh khác hoặc chỉnh góc chụp."
            ));
        } catch (Exception e) {
            log.error("Unexpected ticket-vision error at {} — returning empty soft result", url, e);
            return emptyResult(List.of(
                    "Đã xảy ra lỗi khi xử lý OCR. Ảnh vẫn có thể tải lại để quét lại."
            ));
        }
    }

    private static RemoteTicketScanResult normalize(RemoteTicketScanResult data) {
        List<String> warnings = data.warnings() != null ? new ArrayList<>(data.warnings()) : new ArrayList<>();
        return new RemoteTicketScanResult(
                data.scanId() != null && !data.scanId().isBlank() ? data.scanId() : UUID.randomUUID().toString(),
                data.tickets() != null ? data.tickets().size() : 0,
                data.tickets() != null ? data.tickets() : List.of(),
                warnings,
                data.imageWidth(),
                data.imageHeight()
        );
    }

    private static RemoteTicketScanResult emptyResult(List<String> warnings) {
        return new RemoteTicketScanResult(
                UUID.randomUUID().toString(),
                0,
                List.of(),
                warnings,
                null,
                null
        );
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
