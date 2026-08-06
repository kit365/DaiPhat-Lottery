package com.daiphat.coreapi.infrastructure.persistence.repository.streetagent;

import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.LuckyPatternConfigEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LuckyPatternConfigRepository extends JpaRepository<LuckyPatternConfigEntity, Long> {
    List<LuckyPatternConfigEntity> findByActiveTrueOrderByPriorityDesc();
}
