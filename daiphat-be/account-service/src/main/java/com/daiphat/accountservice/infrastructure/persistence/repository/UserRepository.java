package com.daiphat.accountservice.infrastructure.persistence.repository;

import com.daiphat.accountservice.infrastructure.persistence.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, UUID> {
    Optional<UserEntity> findByUsername(String username);
    @org.springframework.data.jpa.repository.Query("SELECT u.id FROM UserEntity u WHERE u.username = :username")
    Optional<UUID> findIdByUsername(String username);
    Optional<UserEntity> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "UPDATE users SET id = :newId WHERE id = :oldId", nativeQuery = true)
    @org.springframework.transaction.annotation.Transactional
    void updateUserId(UUID oldId, UUID newId);
}
