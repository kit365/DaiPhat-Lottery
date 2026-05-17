package com.daiphat.accountservice.application.port.in.user;

import com.daiphat.accountservice.domain.model.UserModel;
import java.util.UUID;

public interface UserLookupServicePort {
    UserModel findByIdOrThrow(UUID id);
    UserModel findByUsernameOrThrow(String username);
    UserModel findByEmailOrThrow(String email);
    UserModel findActiveByIdOrThrow(UUID id);
    UserModel findActiveByUsernameOrThrow(String username);
    
    // Multi-identifier lookup (Used in InviteStaff)
    UserModel findByIdentifierOrThrow(String idOrUsername);

    // Optional lookups (Used in LoginAttemptService for soft checks)
    java.util.Optional<UserModel> findByUsername(String username);
    java.util.Optional<UserModel> findById(UUID id);
}
