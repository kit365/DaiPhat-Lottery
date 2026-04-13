package com.daiphat.accountservice.application.service;

import com.daiphat.accountservice.application.dto.response.UserAuthMeResponseDTO;
import com.daiphat.accountservice.application.dto.response.UserResponseDTO;
import com.daiphat.accountservice.application.mapper.UserApplicationMapper;
import com.daiphat.accountservice.application.port.in.UserServicePort;
import com.daiphat.accountservice.application.port.out.UserRepositoryPort;
import com.daiphat.accountservice.domain.model.UserModel;
import com.daiphat.accountservice.domain.exception.DomainException;
import com.daiphat.accountservice.domain.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService implements UserServicePort {

    private final UserRepositoryPort userRepositoryPort;
    private final UserApplicationMapper userApplicationMapper;


    @Override
    @Transactional(readOnly = true)
    public UserResponseDTO getById(UUID id) {
        UserModel user = userRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.USER_NOT_FOUND));
                
        return userApplicationMapper.mapToUserResponse(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponseDTO getByUsername(String username) {
        UserModel user = userRepositoryPort.findByUsername(username)
                .orElseThrow(() -> new DomainException(ErrorCode.USER_NOT_FOUND));
                
        return userApplicationMapper.mapToUserResponse(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserAuthMeResponseDTO getMyProfile(String username) {
        UserModel user = userRepositoryPort.findByUsername(username)
                .orElseThrow(() -> new DomainException(ErrorCode.USER_NOT_FOUND));

        return userApplicationMapper.mapToAuthMeUserResponse(user);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponseDTO> getAll() {
        return userRepositoryPort.findAll().stream()
                .map(userApplicationMapper::mapToUserResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        if (!userRepositoryPort.existsById(id)) {
            throw new DomainException(ErrorCode.USER_NOT_FOUND);
        }
        userRepositoryPort.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public UserModel fetchActiveUserByUsername(String username) {
        UserModel user = userRepositoryPort.findByUsername(username)
                .orElseThrow(() -> new DomainException(ErrorCode.INVALID_CREDENTIALS));

        user.validateLoginEligibility();
        return user;
    }

    @Override
    @Transactional(readOnly = true)
    public UserModel fetchActiveUserById(UUID id) {
        UserModel user = userRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.USER_NOT_FOUND));

        user.validateLoginEligibility();
        return user;
    }

    @Override
    @Transactional(readOnly = true)
    public UUID getIdByUsername(String username) {
        return userRepositoryPort.findIdByUsername(username)
                .orElseThrow(() -> new DomainException(ErrorCode.USER_NOT_FOUND));
    }
}
