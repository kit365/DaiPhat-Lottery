package com.daiphat.coreapi.infrastructure.persistence.repository;

import com.daiphat.coreapi.infrastructure.persistence.entity.UserEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.UUID;
import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, UUID>, JpaSpecificationExecutor<UserEntity> {
    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    @EntityGraph(attributePaths = {"role", "role.permissions"})
    Optional<UserEntity> findById(UUID id);

    @EntityGraph(attributePaths = {"role", "role.permissions"})
    Optional<UserEntity> findByUsername(String username);

    @EntityGraph(attributePaths = "role")
    Optional<UserEntity> findByEmail(String email);

    @EntityGraph(attributePaths = "role")
    Optional<UserEntity> findByUsernameIgnoreCase(String username);

    @EntityGraph(attributePaths = "role")
    Optional<UserEntity> findByEmailIgnoreCase(String email);

    @Override
    @EntityGraph(attributePaths = {"role", "role.permissions"})
    List<UserEntity> findAll();

    @Override
    @EntityGraph(attributePaths = {"role", "role.permissions"})
    Page<UserEntity> findAll(Specification<UserEntity> spec, Pageable pageable);
}
