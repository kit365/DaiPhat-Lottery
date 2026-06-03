package com.daiphat.coreapi.infrastructure.persistence.repository;

import com.daiphat.coreapi.infrastructure.persistence.entity.RoleEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface RoleRepository extends JpaRepository<RoleEntity, UUID> {
    Optional<RoleEntity> findByCode(String code);

    java.util.List<RoleEntity> findAllByCodeIn(java.util.Collection<String> codes);
}
