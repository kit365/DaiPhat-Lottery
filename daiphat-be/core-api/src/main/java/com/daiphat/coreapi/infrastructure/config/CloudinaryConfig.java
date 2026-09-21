package com.daiphat.coreapi.infrastructure.config;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "daiphat.storage.provider", havingValue = "cloudinary", matchIfMissing = true)
public class CloudinaryConfig {

    @Bean
    public Cloudinary cloudinary(
            @Value("${daiphat.storage.cloudinary.cloud-name:}") String cloudName,
            @Value("${daiphat.storage.cloudinary.api-key:}") String apiKey,
            @Value("${daiphat.storage.cloudinary.api-secret:}") String apiSecret
    ) {
        if (cloudName == null || cloudName.isBlank()
                || apiKey == null || apiKey.isBlank()
                || apiSecret == null || apiSecret.isBlank()) {
            throw new IllegalStateException(
                    "Cloudinary is enabled but CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET "
                            + "are missing. Set credentials or use STORAGE_PROVIDER=local."
            );
        }
        return new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key", apiKey,
                "api_secret", apiSecret,
                "secure", true,
                // Fail fast instead of hanging until the FE axios timeout.
                "connect_timeout", 10_000,
                "timeout", 45_000
        ));
    }
}
