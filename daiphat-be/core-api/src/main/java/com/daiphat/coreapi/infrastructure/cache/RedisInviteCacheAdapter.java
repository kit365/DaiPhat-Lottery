package com.daiphat.coreapi.infrastructure.cache;

import com.daiphat.coreapi.application.port.out.auth.InviteCachePort;
import com.daiphat.coreapi.domain.model.auth.InviteData;
import com.daiphat.coreapi.application.port.out.auth.keys.AuthCacheKeyGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class RedisInviteCacheAdapter implements InviteCachePort {

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
