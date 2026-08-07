package com.daiphat.coreapi.infrastructure.persistence.repository.fortune;

import com.daiphat.coreapi.infrastructure.persistence.entity.fortune.FortuneCastEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FortuneCastRepository extends JpaRepository<FortuneCastEntity, Long> {

    Optional<FortuneCastEntity> findFirstByUserIdOrderByCreatedAtDesc(UUID userId);

    List<FortuneCastEntity> findTop2ByUserIdOrderByCreatedAtDesc(UUID userId);
}
