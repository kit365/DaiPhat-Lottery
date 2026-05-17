package com.daiphat.accountservice.application.service.user;

import com.daiphat.accountservice.application.port.in.user.UserLookupServicePort;
import com.daiphat.accountservice.application.port.out.user.UserRepositoryPort;
import com.daiphat.accountservice.domain.exception.DomainException;
import com.daiphat.accountservice.domain.exception.ErrorCode;
import com.daiphat.accountservice.domain.model.UserModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserLookupService implements UserLookupServicePort {

    private final UserRepositoryPort userRepositoryPort;

    @Override
    public UserModel findByIdOrThrow(UUID id) {
        return userRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.USER_NOT_FOUND));
    }

    @Override
    public UserModel findByUsernameOrThrow(String username) {
        return userRepositoryPort.findByUsername(username)
                .orElseThrow(() -> new DomainException(ErrorCode.USER_NOT_FOUND));
    }

    @Override
    public UserModel findByEmailOrThrow(String email) {
        return userRepositoryPort.findByEmail(email)
                .orElseThrow(() -> new DomainException(ErrorCode.USER_NOT_FOUND));
    }

    @Override
    public UserModel findActiveByIdOrThrow(UUID id) {
        UserModel user = findByIdOrThrow(id);
        user.validateLoginEligibility();
        return user;
    }

    @Override
    public UserModel findActiveByUsernameOrThrow(String username) {
        UserModel user = findByUsernameOrThrow(username);
        user.validateLoginEligibility();
        return user;
    }

    /**
     * @deprecated Special utility for mixed ID/Username lookups (e.g., Invite Flow). 
     * Avoid using as a default lookup pattern to maintain explicit API contracts.
     */
    @Override
    public UserModel findByIdentifierOrThrow(String idOrUsername) {
        return userRepositoryPort.findByUsername(idOrUsername)
                .or(() -> {
                    try {
                        return userRepositoryPort.findById(UUID.fromString(idOrUsername));
                    } catch (Exception e) {
                        return java.util.Optional.empty();
                    }
                })
                .orElseThrow(() -> new DomainException(ErrorCode.USER_NOT_FOUND));
    }

    @Override
    public java.util.Optional<UserModel> findByUsername(String username) {
        return userRepositoryPort.findByUsername(username);
    }

    @Override
    public java.util.Optional<UserModel> findById(UUID id) {
        return userRepositoryPort.findById(id);
    }
}
