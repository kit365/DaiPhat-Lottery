package com.smartlotto.accountservice.infrastructure.persistence.repository;

import com.smartlotto.accountservice.infrastructure.persistence.entity.UserImageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface UserImageRepository extends JpaRepository<UserImageEntity, UUID> {
}
