package com.daiphat.coreapi.infrastructure.cache;

import com.daiphat.coreapi.application.port.out.auth.RefreshTokenStorePort;
import com.daiphat.coreapi.application.port.out.auth.keys.AuthCacheKeyGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class RedisRefreshTokenStoreAdapter implements RefreshTokenStorePort {

    private final RedisClient redisClient;

    @Override
    public void save(UUID userId, String refreshToken, Duration ttl) {
        redisClient.set(AuthCacheKeyGenerator.refreshToken(userId.toString()), hash(refreshToken), ttl);
    }

    @Override
    public Optional<String> find(UUID userId) {
        return redisClient.get(AuthCacheKeyGenerator.refreshToken(userId.toString()), String.class);
    }

    @Override
    public boolean rotate(UUID userId, String currentRefreshToken, String newRefreshToken, Duration ttl) {
        return redisClient.compareAndSet(
                AuthCacheKeyGenerator.refreshToken(userId.toString()),
                hash(currentRefreshToken),
                hash(newRefreshToken),
                ttl
        );
    }

    @Override
    public void delete(UUID userId) {
        redisClient.delete(AuthCacheKeyGenerator.refreshToken(userId.toString()));
    }

    private String hash(String refreshToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(refreshToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }
}
