package com.daiphat.accountservice.infrastructure.adapter;

import com.daiphat.accountservice.application.port.out.user.UserRepositoryPort;
import com.daiphat.accountservice.domain.model.UserModel;
import com.daiphat.accountservice.infrastructure.persistence.entity.UserEntity;
import com.daiphat.accountservice.infrastructure.persistence.mapper.UserPersistenceMapper;
import com.daiphat.accountservice.infrastructure.persistence.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.daiphat.accountservice.domain.model.enums.UserStatus;

@Component
@RequiredArgsConstructor
public class UserRepositoryAdapter implements UserRepositoryPort {

    private final UserRepository userRepository;
    private final UserPersistenceMapper userPersistenceMapper;

    @Override
    public UserModel save(UserModel userModel) {
        //model -> entity
        UserEntity entity = userPersistenceMapper.toEntity(userModel);
        UserEntity savedEntity = userRepository.save(entity);
        return userPersistenceMapper.toDomain(savedEntity);
    }

    @Override
    public Optional<UserModel> findById(UUID id) {
        return userRepository.findById(id)
                .map(userPersistenceMapper::toDomain);
    }

    @Override
    public Optional<UserModel> findByUsername(String usernameOrEmail) {
        return userRepository.findByUsernameOrEmail(usernameOrEmail, usernameOrEmail)
                .map(userPersistenceMapper::toDomain);
    }

    @Override
    public Optional<UUID> findIdByUsername(String usernameOrEmail) {
        return userRepository.findIdByUsernameOrEmail(usernameOrEmail);
    }

    @Override
    public Optional<UserModel> findByEmail(String email) {
        return userRepository.findByEmail(email)
                .map(userPersistenceMapper::toDomain);
    }

    @Override
    public List<UserModel> findAll() {
        return userRepository.findAll().stream()
                .map(userPersistenceMapper::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public Page<UserModel> findAll(Pageable pageable, String search, UserStatus status, List<String> roleIds) {
        return userRepository.findAll(com.daiphat.accountservice.infrastructure.persistence.specification.UserSpecification.filterUsers(search, status, roleIds), pageable)
                .map(userPersistenceMapper::toDomain);
    }

    @Override
    public boolean existsById(UUID id) {
        return userRepository.existsById(id);
    }

    @Override
    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    @Override
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }
    
    @Override
    public boolean existsByPhone(String phone) {
        return userRepository.existsByPhone(phone);
    }

    @Override
    public void deleteById(UUID id) {
        userRepository.deleteById(id);
    }

    @Override
    public void updateUserId(UUID oldId, UUID newId) {
        userRepository.updateUserId(oldId, newId);
    }
}
