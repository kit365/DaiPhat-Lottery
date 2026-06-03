package com.daiphat.coreapi.application.port.out.auth;

import com.daiphat.coreapi.domain.model.auth.InviteData;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

public interface InviteCachePort {
    void saveInvite(String token, UUID userId, String role, Duration duration);
    Optional<InviteData> getInvite(String token);
    void deleteInvite(String token);
}
