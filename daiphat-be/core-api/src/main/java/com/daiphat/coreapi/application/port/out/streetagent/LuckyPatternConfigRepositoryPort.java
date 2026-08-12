package com.daiphat.coreapi.application.port.out.streetagent;

import com.daiphat.coreapi.domain.model.streetagent.LuckyPatternConfigModel;
import java.util.List;
import java.util.Optional;

public interface LuckyPatternConfigRepositoryPort {
    List<LuckyPatternConfigModel> findAll();
    List<LuckyPatternConfigModel> findActiveByPriorityDesc();
    Optional<LuckyPatternConfigModel> findById(Long id);
    LuckyPatternConfigModel save(LuckyPatternConfigModel model);
}
