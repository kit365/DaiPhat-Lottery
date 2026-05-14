package com.daiphat.accountservice.infrastructure.persistence.repository;

import com.daiphat.accountservice.infrastructure.persistence.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, UUID>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<UserEntity> {
    Optional<UserEntity> findByUsernameOrEmail(String username, String email);
    
    Optional<UserEntity> findByUsername(String username);

    @Query("SELECT u.id FROM UserEntity u WHERE u.username = :identifier OR u.email = :identifier")
    Optional<UUID> findIdByUsernameOrEmail(@Param("identifier") String identifier);

    Optional<UserEntity> findByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    @Modifying
    @Query(value = "UPDATE users SET id = :newId WHERE id = :oldId", nativeQuery = true)
    @Transactional
    void updateUserId(@Param("oldId") UUID oldId, @Param("newId") UUID newId);

    @Modifying
    @Transactional
    long deleteByStatusAndCreatedAtBefore(String status, java.time.LocalDateTime before);
}
