package com.daiphat.coreapi.application.port.in.user;

import com.daiphat.coreapi.domain.model.UserModel;
import java.util.UUID;
import java.util.Optional;

public interface UserLookupServicePort {
    UserModel findByIdOrThrow(UUID id);
    UserModel findByUsernameOrThrow(String username);
    UserModel findByUsernameOrEmailOrThrow(String usernameOrEmail);
    UserModel findActiveByIdOrThrow(UUID id);
    UserModel findActiveByUsernameOrEmailOrThrow(String usernameOrEmail);
    Optional<UserModel> findById(UUID id);
    Optional<UserModel> findByUsername(String username);
}
