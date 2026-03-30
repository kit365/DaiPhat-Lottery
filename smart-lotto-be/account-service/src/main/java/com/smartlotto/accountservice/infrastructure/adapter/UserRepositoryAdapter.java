package com.smartlotto.accountservice.infrastructure.adapter;

import com.smartlotto.accountservice.application.port.out.UserRepositoryPort;
import com.smartlotto.accountservice.domain.model.UserModel;
import com.smartlotto.accountservice.infrastructure.persistence.entity.UserEntity;
import com.smartlotto.accountservice.infrastructure.persistence.mapper.UserPersistenceMapper;
import com.smartlotto.accountservice.infrastructure.persistence.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

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
    public Optional<UserModel> findByUsername(String username) {
        return userRepository.findByUsername(username)
                .map(userPersistenceMapper::toDomain);
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
    public void deleteById(UUID id) {
        userRepository.deleteById(id);
    }

    @Override
    public void updateUserId(UUID oldId, UUID newId) {
        userRepository.updateUserId(oldId, newId);
    }
}
