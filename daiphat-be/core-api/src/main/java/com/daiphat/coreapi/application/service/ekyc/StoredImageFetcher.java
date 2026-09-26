package com.daiphat.coreapi.application.service.ekyc;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;

/**
 * Loads previously uploaded CCCD/selfie bytes from Cloudinary HTTPS URLs
 * or local {@code /uploads/...} paths.
 */
@Slf4j
@Component
public class StoredImageFetcher {

    private final RestTemplate restTemplate;
    private final Path localUploadRoot;

    public StoredImageFetcher(
            RestTemplateBuilder restTemplateBuilder,
            @Value("${daiphat.storage.local.upload-dir:./uploads}") String localUploadDir
    ) {
        this.restTemplate = restTemplateBuilder
                .connectTimeout(Duration.ofSeconds(5))
                .readTimeout(Duration.ofSeconds(30))
                .build();
        this.localUploadRoot = Path.of(localUploadDir).toAbsolutePath().normalize();
    }

    public byte[] fetchBytes(String imageUrl) {
        if (!StringUtils.hasText(imageUrl)) {
            throw new DomainException(ErrorCode.EKYC_INVALID_DOCUMENTS);
        }
        String url = imageUrl.trim();
        try {
            if (url.startsWith("http://") || url.startsWith("https://")) {
                ResponseEntity<byte[]> response = restTemplate.getForEntity(url, byte[].class);
                byte[] body = response.getBody();
                if (body == null || body.length == 0) {
                    throw new DomainException(ErrorCode.EKYC_INVALID_DOCUMENTS);
                }
                return body;
            }
            String relative = url.startsWith("/uploads/") ? url.substring("/uploads/".length()) : url;
            Path path = localUploadRoot.resolve(relative).normalize();
            if (!path.startsWith(localUploadRoot) || !Files.isRegularFile(path)) {
                throw new DomainException(ErrorCode.EKYC_INVALID_DOCUMENTS);
            }
            return Files.readAllBytes(path);
        } catch (DomainException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Failed to fetch eKYC image from {}", url, e);
            throw new DomainException(ErrorCode.EKYC_INVALID_DOCUMENTS, e);
        }
    }
}
