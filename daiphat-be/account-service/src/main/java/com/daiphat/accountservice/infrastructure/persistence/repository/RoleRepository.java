package com.daiphat.accountservice.infrastructure.persistence.repository;

import com.daiphat.accountservice.infrastructure.persistence.entity.RoleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoleRepository extends JpaRepository<RoleEntity, UUID> {
    
    @Query("SELECT r FROM RoleEntity r LEFT JOIN FETCH r.permissions")
    List<RoleEntity> findAll();

    @Query("SELECT r FROM RoleEntity r LEFT JOIN FETCH r.permissions WHERE r.code = :code")
    Optional<RoleEntity> findByCode(@Param("code") String code);

    @Query("SELECT r FROM RoleEntity r LEFT JOIN FETCH r.permissions WHERE r.code IN :codes")
    List<RoleEntity> findAllByCodeIn(@Param("codes") Collection<String> codes);
}
