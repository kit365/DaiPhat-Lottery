package com.daiphat.accountservice.infrastructure.adapter.auth.cache;

import com.daiphat.accountservice.application.port.out.user.cache.InviteCachePort;
import com.daiphat.accountservice.infrastructure.persistence.cache.redis.client.RedisClient;
import com.daiphat.accountservice.application.port.out.auth.keys.AuthCacheKeyGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class RedisInviteAdapter implements InviteCachePort {

    private final RedisClient redisClient;

    @Override
    public void saveInvite(String token, UUID userId, String role, Duration duration) {
        redisClient.set(AuthCacheKeyGenerator.inviteToken(token), new InviteData(userId, role), duration);
    }

    @Override
    public Optional<InviteData> getInvite(String token) {
        return redisClient.get(AuthCacheKeyGenerator.inviteToken(token), InviteData.class);
    }

    @Override
    public void deleteInvite(String token) {
        redisClient.delete(AuthCacheKeyGenerator.inviteToken(token));
    }
}
