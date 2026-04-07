package com.daiphat.accountservice.application.port.out;

import com.daiphat.accountservice.domain.model.UserModel;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepositoryPort {
    UserModel save(UserModel userModel);
    Optional<UserModel> findById(UUID id);
    Optional<UserModel> findByUsername(String username);
    Optional<UserModel> findByEmail(String email);
    List<UserModel> findAll();
    boolean existsById(UUID id);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    void deleteById(UUID id);
    void updateUserId(UUID oldId, UUID newId);
}

