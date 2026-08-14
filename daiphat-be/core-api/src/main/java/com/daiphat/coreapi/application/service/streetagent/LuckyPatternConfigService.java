package com.daiphat.coreapi.application.service.streetagent;

import com.daiphat.coreapi.application.dto.request.streetagent.UpsertLuckyPatternConfigRequest;
import com.daiphat.coreapi.application.dto.response.streetagent.LuckyPatternConfigResponse;
import com.daiphat.coreapi.application.port.in.streetagent.LuckyPatternConfigServicePort;
import com.daiphat.coreapi.application.port.out.streetagent.LuckyPatternConfigRepositoryPort;
import com.daiphat.coreapi.application.port.out.streetagent.VendorAllocationRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.streetagent.LuckyPatternConfigModel;
import com.daiphat.coreapi.domain.model.streetagent.VendorAllocationSerialModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LuckyPatternConfigService implements LuckyPatternConfigServicePort {
    private final LuckyPatternConfigRepositoryPort luckyPatternConfigRepositoryPort;
    private final VendorAllocationRepositoryPort vendorAllocationRepositoryPort;
    private final LuckySerialTagger luckySerialTagger;

    @Override
    @Transactional(readOnly = true)
    public List<LuckyPatternConfigResponse> getAll() {
        return luckyPatternConfigRepositoryPort.findAll().stream()
                .sorted(Comparator.comparing(LuckyPatternConfigModel::getPriority, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::response).toList();
    }

    @Override
    @Transactional
    public LuckyPatternConfigResponse create(UpsertLuckyPatternConfigRequest request) {
        LuckyPatternConfigModel entity = LuckyPatternConfigModel.builder().build();
        apply(entity, request);
        LuckyPatternConfigModel saved = luckyPatternConfigRepositoryPort.save(entity);
        recomputeAll();
        return response(saved);
    }

    @Override
    @Transactional
    public LuckyPatternConfigResponse update(Long id, UpsertLuckyPatternConfigRequest request) {
        LuckyPatternConfigModel entity = luckyPatternConfigRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.INVALID_INPUT));
        apply(entity, request);
        LuckyPatternConfigModel saved = luckyPatternConfigRepositoryPort.save(entity);
        recomputeAll();
        return response(saved);
    }

    @Override
    @Transactional
    public void recomputeAll() {
        List<LuckyPatternConfigModel> patterns = luckySerialTagger.loadActivePatterns();
        List<VendorAllocationSerialModel> serials = vendorAllocationRepositoryPort.findAllLiveSerials();
        for (VendorAllocationSerialModel serial : serials) {
            luckySerialTagger.apply(serial, patterns);
        }
        vendorAllocationRepositoryPort.saveSerials(serials);
    }

    private void apply(LuckyPatternConfigModel entity, UpsertLuckyPatternConfigRequest request) {
        entity.setPatternType(request.patternType());
        entity.setExactNumbers(request.exactNumbers());
        entity.setMatchDigits(request.matchDigits());
        entity.setMatchPosition(request.matchPosition());
        entity.setName(request.name().trim());
        entity.setDescription(request.description());
        entity.setBadgeLabel(request.badgeLabel().trim());
        entity.setBadgeColor(request.badgeColor());
        entity.setPriority(request.priority() == null ? 0 : request.priority());
        entity.setActive(request.active() == null || request.active());
    }

    private LuckyPatternConfigResponse response(LuckyPatternConfigModel entity) {
        return new LuckyPatternConfigResponse(entity.getId(), entity.getPatternType(), entity.getExactNumbers(), entity.getMatchDigits(),
                entity.getMatchPosition(), entity.getName(), entity.getDescription(), entity.getBadgeLabel(), entity.getBadgeColor(),
                entity.getPriority(), entity.getActive());
    }
}
