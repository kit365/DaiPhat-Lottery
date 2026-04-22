package com.daiphat.accountservice.infrastructure.persistence.repository;

import com.daiphat.accountservice.domain.model.enums.InviteStatus;
import com.daiphat.accountservice.infrastructure.persistence.entity.StaffInviteEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface StaffInviteRepository extends JpaRepository<StaffInviteEntity, UUID> {
    Optional<StaffInviteEntity> findByEmailAndStatus(String email, InviteStatus status);

    Optional<StaffInviteEntity> findByToken(String token);
}
