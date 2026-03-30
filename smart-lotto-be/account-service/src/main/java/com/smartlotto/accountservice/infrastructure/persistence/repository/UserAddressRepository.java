package com.smartlotto.accountservice.infrastructure.persistence.repository;

import com.smartlotto.accountservice.infrastructure.persistence.entity.UserAddressEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface UserAddressRepository extends JpaRepository<UserAddressEntity, UUID> {
}
