package com.smartlotto.accountservice.application.service;

import com.smartlotto.accountservice.application.dto.request.UserRegistrationRequestDTO;
import com.smartlotto.accountservice.application.dto.response.UserResponseDTO;
import com.smartlotto.accountservice.application.mapper.UserApplicationMapper;
import com.smartlotto.accountservice.application.port.in.UserServicePort;
import com.smartlotto.accountservice.application.port.out.IdentityManagementPort;
import com.smartlotto.accountservice.application.port.out.RoleRepositoryPort;
import com.smartlotto.accountservice.application.port.out.UserRepositoryPort;
import com.smartlotto.accountservice.domain.model.RoleModel;
import com.smartlotto.accountservice.domain.model.UserModel;
import com.smartlotto.accountservice.domain.model.enums.UserRole;
import com.smartlotto.accountservice.domain.exception.DomainException;
import com.smartlotto.accountservice.domain.exception.ErrorCode;
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
    private final RoleRepositoryPort roleRepositoryPort;
    private final IdentityManagementPort identityManagementPort;
    private final UserApplicationMapper userApplicationMapper;

    @Override
    @Transactional
    public UserResponseDTO register(UserRegistrationRequestDTO request) {
        log.info("Registering new user with username: {}", request.username());

        if (userRepositoryPort.existsByUsername(request.username())) {
            throw new DomainException(ErrorCode.USER_EXISTED);
        }

        // Fetch Default Role (USER)
        RoleModel defaultRole = roleRepositoryPort.findByCode(UserRole.USER.getCode())
                .orElseThrow(() -> new DomainException(ErrorCode.ROLE_NOT_FOUND));


        // DTO -> Model
        UserModel userModel = userApplicationMapper.mapToUserModel(request);
        userModel.setRole(defaultRole);
        userModel.setStatus("ACTIVE");
        userModel.setEmailVerified(false);

        // 1. Create in Identity Provider (Keycloak) first
        UUID keycloakUuid = identityManagementPort.createUser(userModel, request.password());
        
        // 2. Set the official ID from Keycloak to our model
        userModel.setId(keycloakUuid);

        // 3. Save to local DB
        UserModel savedUserModel = userRepositoryPort.save(userModel);
        
        log.info("User registered successfully with ID: {}", keycloakUuid);
        return userApplicationMapper.mapToUserResponse(savedUserModel);
    }


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
}
