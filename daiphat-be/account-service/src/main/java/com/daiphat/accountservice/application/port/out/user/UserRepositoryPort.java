package com.daiphat.accountservice.application.port.out.user;

import com.daiphat.accountservice.domain.model.UserModel;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepositoryPort {
    UserModel save(UserModel userModel);

    Optional<UserModel> findById(UUID id);

    Optional<UserModel> findByUsername(String username);

    Optional<UUID> findIdByUsername(String username);

    Optional<UserModel> findByEmail(String email);

    List<UserModel> findAll();
    
    org.springframework.data.domain.Page<UserModel> findAll(
            org.springframework.data.domain.Pageable pageable, 
            String search, 
            com.daiphat.accountservice.domain.model.enums.UserStatus status, 
            java.util.List<String> roleIds);

    boolean existsById(UUID id);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    void deleteById(UUID id);

    void updateUserId(UUID oldId, UUID newId);
    
    long deleteInactiveUsers(com.daiphat.accountservice.domain.model.enums.UserStatus status, java.time.LocalDateTime before);
}
