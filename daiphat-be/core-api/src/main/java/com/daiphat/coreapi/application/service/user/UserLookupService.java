package com.daiphat.coreapi.application.service.user;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.UserModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
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
    public UserModel findByUsernameOrEmailOrThrow(String usernameOrEmail) {
        return userRepositoryPort.findByUsernameOrEmail(usernameOrEmail)
                .orElseThrow(() -> new DomainException(ErrorCode.USER_NOT_FOUND));
    }

    @Override
    public UserModel findActiveByIdOrThrow(UUID id) {
        UserModel user = findByIdOrThrow(id);
        user.validateLoginEligibility();
        return user;
    }

    @Override
    public UserModel findActiveByUsernameOrEmailOrThrow(String usernameOrEmail) {
        UserModel user = findByUsernameOrEmailOrThrow(usernameOrEmail);
        user.validateLoginEligibility();
        return user;
    }

    @Override
    public Optional<UserModel> findById(UUID id) {
        return userRepositoryPort.findById(id);
    }

    @Override
    public Optional<UserModel> findByUsername(String username) {
        return userRepositoryPort.findByUsername(username);
    }
}
