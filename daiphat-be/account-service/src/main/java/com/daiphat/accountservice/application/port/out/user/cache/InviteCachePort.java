package com.daiphat.accountservice.application.port.out.user.cache;

import com.daiphat.accountservice.domain.model.auth.InviteData;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

public interface InviteCachePort {
    void saveInvite(String token, UUID userId, String role, Duration duration);
    Optional<InviteData> getInvite(String token);
    void deleteInvite(String token);
}
