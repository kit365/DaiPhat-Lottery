package com.daiphat.coreapi.infrastructure.adapter.out.streetagent.persistence;

import com.daiphat.coreapi.application.port.out.streetagent.LuckyPatternConfigRepositoryPort;
import com.daiphat.coreapi.domain.model.streetagent.LuckyPatternConfigModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.LuckyPatternConfigEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.streetagent.LuckyPatternConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import java.util.*;

@Component
@RequiredArgsConstructor
public class LuckyPatternConfigRepositoryAdapter implements LuckyPatternConfigRepositoryPort {
    private final LuckyPatternConfigRepository repository;
    public List<LuckyPatternConfigModel> findAll() { return repository.findAll().stream().map(this::toModel).toList(); }
    public List<LuckyPatternConfigModel> findActiveByPriorityDesc() { return repository.findByActiveTrueOrderByPriorityDesc().stream().map(this::toModel).toList(); }
    public Optional<LuckyPatternConfigModel> findById(Long id) { return repository.findById(id).map(this::toModel); }
    public LuckyPatternConfigModel save(LuckyPatternConfigModel model) {
        LuckyPatternConfigEntity entity = model.getId() == null ? new LuckyPatternConfigEntity() : repository.findById(model.getId()).orElseGet(LuckyPatternConfigEntity::new);
        entity.setPatternType(model.getPatternType()); entity.setExactNumbers(model.getExactNumbers()); entity.setMatchDigits(model.getMatchDigits());
        entity.setMatchPosition(model.getMatchPosition()); entity.setName(model.getName()); entity.setDescription(model.getDescription());
        entity.setBadgeLabel(model.getBadgeLabel()); entity.setBadgeColor(model.getBadgeColor()); entity.setPriority(model.getPriority()); entity.setActive(model.getActive());
        return toModel(repository.save(entity));
    }
    private LuckyPatternConfigModel toModel(LuckyPatternConfigEntity e) { return LuckyPatternConfigModel.builder().id(e.getId()).patternType(e.getPatternType()).exactNumbers(e.getExactNumbers()).matchDigits(e.getMatchDigits()).matchPosition(e.getMatchPosition()).name(e.getName()).description(e.getDescription()).badgeLabel(e.getBadgeLabel()).badgeColor(e.getBadgeColor()).priority(e.getPriority()).active(e.getActive()).build(); }
}
