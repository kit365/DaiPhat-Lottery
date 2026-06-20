package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourceItem;
import com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourcePreviewResult;
import com.daiphat.coreapi.application.dto.request.lotteries.RegionPrizeStructureRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.SyncPrizeStructuresRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeStructureResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeStructureSyncItemResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeStructureSyncResponse;
import com.daiphat.coreapi.application.mapper.lotteries.PrizeStructureApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.PrizeStructureServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryRegionRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.PrizeStructureRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.PrizeStructureSourceSyncPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import com.daiphat.coreapi.domain.model.enums.lottery.SyncAction;
import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;
import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class PrizeStructureService implements PrizeStructureServicePort {

    private final PrizeStructureRepositoryPort prizeStructureRepositoryPort;
    private final LotteryRegionRepositoryPort lotteryRegionRepositoryPort;
    private final PrizeStructureSourceSyncPort prizeStructureSourceSyncPort;
    private final PrizeStructureApplicationMapper prizeStructureApplicationMapper;

    @Override
    @Transactional(readOnly = true)
    public List<String> getRegions() {
        return prizeStructureRepositoryPort.findDistinctRegionCodes();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PrizeStructureResponse> getByRegion(String region) {
        LotteryRegionModel resolvedRegion = resolveRegion(region);
        List<PrizeStructureModel> models = prizeStructureRepositoryPort.findByRegionCode(resolvedRegion.region());
        return prizeStructureApplicationMapper.toResponseList(models);
    }

    @Override
    @Transactional(readOnly = true)
    public PrizeStructureResponse getById(String region, Long id) {
        LotteryRegionModel resolvedRegion = resolveRegion(region);
        PrizeStructureModel model = getPrizeStructureOrThrow(id);
        assertBelongsToRegion(model, resolvedRegion.region());
        return prizeStructureApplicationMapper.toResponse(model);
    }

    @Override
    @Transactional(readOnly = true)
    public PrizeStructureModel getModelById(Long id) {
        return getPrizeStructureOrThrow(id);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<PrizeStructureModel> findModelById(Long id) {
        return prizeStructureRepositoryPort.findById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PrizeStructureModel> getModelsByRegion(String region) {
        LotteryRegionModel resolvedRegion = resolveRegion(region);
        return prizeStructureRepositoryPort.findByRegionCode(resolvedRegion.region());
    }

    @Override
    @Transactional
    public PrizeStructureResponse create(String region, RegionPrizeStructureRequest request) {
        LotteryRegionModel resolvedRegion = resolveRegion(region);

        PrizeStructureModel model = prizeStructureApplicationMapper.toModel(
                request,
                resolvedRegion.getId(),
                resolvedRegion.region()
        );
        model.validate();

        if (prizeStructureRepositoryPort.existsByRegionCodeAndPrizeCode(resolvedRegion.region(), model.getPrizeCode())) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_DUPLICATE_CODE);
        }

        PrizeStructureModel saved = prizeStructureRepositoryPort.save(model);
        log.info("Created prize structure id={} for region={}", saved.getId(), resolvedRegion.region());
        return prizeStructureApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public PrizeStructureResponse update(String region, Long id, RegionPrizeStructureRequest request) {
        LotteryRegionModel resolvedRegion = resolveRegion(region);
        PrizeStructureModel existing = getPrizeStructureOrThrow(id);
        assertBelongsToRegion(existing, resolvedRegion.region());

        PrizeStructureModel merged = prizeStructureApplicationMapper.merge(request, existing);
        merged.validate();

        if (prizeStructureRepositoryPort.existsByRegionCodeAndPrizeCodeExcludingId(
                resolvedRegion.region(), merged.getPrizeCode(), id)) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_DUPLICATE_CODE);
        }

        PrizeStructureModel saved = prizeStructureRepositoryPort.save(merged);
        log.info("Updated prize structure id={} for region={}", saved.getId(), resolvedRegion.region());
        return prizeStructureApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public List<PrizeStructureResponse> replaceByRegion(
            String region,
            List<RegionPrizeStructureRequest> requests) {
        LotteryRegionModel resolvedRegion = resolveRegion(region);

        if (requests == null || requests.isEmpty()) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_LIST_REQUIRED);
        }

        List<PrizeStructureModel> models = requests.stream()
                .map(request -> {
                    PrizeStructureModel model = prizeStructureApplicationMapper.toModel(
                            request,
                            resolvedRegion.getId(),
                            resolvedRegion.region()
                    );
                    model.validate();
                    return model;
                })
                .toList();

        validateUniquePrizeCodes(models);

        prizeStructureRepositoryPort.deleteByRegionCode(resolvedRegion.region());
        List<PrizeStructureModel> saved = prizeStructureRepositoryPort.saveAll(models);

        log.info("Replaced {} prize structures for region={}", saved.size(), resolvedRegion.region());
        return prizeStructureApplicationMapper.toResponseList(saved);
    }

    @Override
    @Transactional
    public PrizeStructureSyncResponse syncByRegion(SyncPrizeStructuresRequest request) {
        LotteryRegionModel resolvedRegion = resolveRegion(request.region());
        PrizeStructureSourcePreviewResult preview = loadSyncPreview(request.source(), resolvedRegion);
        validateSyncSourceResult(preview, resolvedRegion.region());

        Map<String, PrizeStructureModel> existingByCode = indexExistingByCode(resolvedRegion.region());
        SyncDraft syncDraft = processSyncItems(preview, resolvedRegion, existingByCode);
        int deletedCount = deleteObsoleteStructures(existingByCode);
        List<PrizeStructureModel> saved = prizeStructureRepositoryPort.saveAll(syncDraft.toSave());
        Map<String, PrizeStructureModel> savedByCode = indexSavedByCode(saved);
        List<PrizeStructureSyncItemResponse> finalizedItems = finalizeSyncItems(syncDraft.items(), savedByCode);

        return prizeStructureApplicationMapper.toSyncResponse(
                preview,
                resolvedRegion,
                syncDraft.createdCount(),
                syncDraft.updatedCount(),
                deletedCount,
                syncDraft.skippedCount(),
                finalizedItems
        );
    }

    @Override
    @Transactional
    public void delete(String region, Long id) {
        LotteryRegionModel resolvedRegion = resolveRegion(region);
        PrizeStructureModel model = getPrizeStructureOrThrow(id);
        assertBelongsToRegion(model, resolvedRegion.region());

        prizeStructureRepositoryPort.deleteById(id);
        log.info("Deleted prize structure id={} for region={}", id, resolvedRegion.region());
    }

    private void assertBelongsToRegion(PrizeStructureModel model, String region) {
        if (model.getRegionCode() == null || !model.getRegionCode().equalsIgnoreCase(region)) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_REGION_INVALID);
        }
    }

    private PrizeStructureModel getPrizeStructureOrThrow(Long id) {
        return prizeStructureRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_STRUCTURE_NOT_FOUND));
    }

    private LotteryRegionModel resolveRegion(String region) {
        if (region == null || region.isBlank()) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_REGION_REQUIRED);
        }
        String normalized = LotteryRegionModel.normalizeCode(region);
        return lotteryRegionRepositoryPort.findByCode(normalized)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_REGION_NOT_FOUND));
    }

    private void validateUniquePrizeCodes(List<PrizeStructureModel> models) {
        Set<String> codes = new HashSet<>();
        for (PrizeStructureModel model : models) {
            String code = model.getPrizeCode().toUpperCase();
            if (!codes.add(code)) {
                throw new DomainException(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_DUPLICATE_CODE);
            }
        }
    }

    private PrizeStructureSourcePreviewResult loadSyncPreview(
            LotteryStationSourceType sourceType,
            LotteryRegionModel resolvedRegion
    ) {
        return prizeStructureSourceSyncPort.preview(sourceType, resolvedRegion.region());
    }

    private SyncDraft processSyncItems(
            PrizeStructureSourcePreviewResult preview,
            LotteryRegionModel resolvedRegion,
            Map<String, PrizeStructureModel> existingByCode
    ) {
        List<PrizeStructureModel> toSave = new java.util.ArrayList<>();
        List<PrizeStructureSyncItemResponse> items = new java.util.ArrayList<>();
        int createdCount = 0;
        int updatedCount = 0;
        int skippedCount = 0;

        for (PrizeStructureSourceItem sourceItem : preview.items()) {
            PrizeStructureModel candidate = prizeStructureApplicationMapper.toModel(sourceItem, resolvedRegion);
            PrizeStructureModel existing = existingByCode.remove(candidate.getPrizeCode().toUpperCase(Locale.ROOT));

            if (existing == null) {
                candidate.validate();
                toSave.add(candidate);
                createdCount++;
                items.add(buildCreatedSyncItem(candidate, sourceItem, preview.source()));
                continue;
            }

            PrizeStructureModel merged = merge(existing, candidate);
            merged.validate();

            if (isEquivalent(existing, merged)) {
                toSave.add(existing);
                skippedCount++;
                items.add(buildSkippedSyncItem(existing, preview.source()));
                continue;
            }

            toSave.add(merged);
            updatedCount++;
            items.add(buildUpdatedSyncItem(existing.getId(), merged, sourceItem, preview.source()));
        }

        return new SyncDraft(toSave, items, createdCount, updatedCount, skippedCount);
    }

    private PrizeStructureSyncItemResponse buildCreatedSyncItem(
            PrizeStructureModel candidate,
            PrizeStructureSourceItem sourceItem,
            String source
    ) {
        return prizeStructureApplicationMapper.toSyncItemResponse(
                null, candidate, SyncAction.CREATED, buildItemNote(sourceItem, source)
        );
    }

    private PrizeStructureSyncItemResponse buildUpdatedSyncItem(
            Long prizeStructureId,
            PrizeStructureModel model,
            PrizeStructureSourceItem sourceItem,
            String source
    ) {
        return prizeStructureApplicationMapper.toSyncItemResponse(
                prizeStructureId, model, SyncAction.UPDATED, buildItemNote(sourceItem, source)
        );
    }

    private PrizeStructureSyncItemResponse buildSkippedSyncItem(
            PrizeStructureModel existing,
            String source
    ) {
        return prizeStructureApplicationMapper.toSyncItemResponse(
                existing.getId(), existing, SyncAction.SKIPPED, "Không có thay đổi từ nguồn " + source
        );
    }

    private int deleteObsoleteStructures(Map<String, PrizeStructureModel> existingByCode) {
        int deletedCount = existingByCode.size();
        for (PrizeStructureModel obsolete : existingByCode.values()) {
            if (obsolete.getId() != null) {
                prizeStructureRepositoryPort.deleteById(obsolete.getId());
            }
        }
        return deletedCount;
    }

    private Map<String, PrizeStructureModel> indexSavedByCode(List<PrizeStructureModel> saved) {
        Map<String, PrizeStructureModel> savedByCode = new LinkedHashMap<>();
        for (PrizeStructureModel model : saved) {
            savedByCode.put(model.getPrizeCode().toUpperCase(Locale.ROOT), model);
        }
        return savedByCode;
    }

    private List<PrizeStructureSyncItemResponse> finalizeSyncItems(
            List<PrizeStructureSyncItemResponse> items,
            Map<String, PrizeStructureModel> savedByCode
    ) {
        return items.stream()
                .map(item -> {
                    PrizeStructureModel savedModel = savedByCode.get(item.prizeCode().toUpperCase(Locale.ROOT));
                    return prizeStructureApplicationMapper.finalizeSyncItemResponse(item, savedModel);
                })
                .toList();
    }

    private void validateSyncSourceResult(PrizeStructureSourcePreviewResult preview, String regionCode) {
        if (preview == null || preview.items() == null || preview.items().isEmpty()) {
            throw new DomainException(
                    ErrorCode.PRIZE_STRUCTURE_SYNC_SOURCE_EMPTY,
                    "Nguồn dữ liệu không trả về cấu trúc giải hợp lệ cho miền " + regionCode
            );
        }
        validateUniqueSourcePrizeCodes(preview.items());
    }

    private void validateUniqueSourcePrizeCodes(List<PrizeStructureSourceItem> items) {
        Set<String> codes = new HashSet<>();
        for (PrizeStructureSourceItem item : items) {
            if (item.prizeCode() == null || item.prizeCode().isBlank()) {
                throw new DomainException(ErrorCode.PRIZE_STRUCTURE_SYNC_SOURCE_INVALID);
            }
            if (!codes.add(item.prizeCode().trim().toUpperCase(Locale.ROOT))) {
                throw new DomainException(ErrorCode.PRIZE_STRUCTURE_SYNC_SOURCE_INVALID);
            }
        }
    }

    private Map<String, PrizeStructureModel> indexExistingByCode(String regionCode) {
        Map<String, PrizeStructureModel> existingByCode = new LinkedHashMap<>();
        for (PrizeStructureModel model : prizeStructureRepositoryPort.findByRegionCode(regionCode)) {
            if (model.getPrizeCode() != null) {
                existingByCode.put(model.getPrizeCode().toUpperCase(Locale.ROOT), model);
            }
        }
        return existingByCode;
    }

    private PrizeStructureModel merge(PrizeStructureModel existing, PrizeStructureModel candidate) {
        return PrizeStructureModel.builder()
                .id(existing.getId())
                .regionId(existing.getRegionId())
                .regionCode(existing.getRegionCode())
                .prizeLevel(candidate.getPrizeLevel())
                .prizeDisplayName(candidate.getPrizeDisplayName())
                .prizeCode(candidate.getPrizeCode())
                .description(candidate.getDescription())
                .prizeValue(candidate.getPrizeValue())
                .quantity(candidate.getQuantity())
                .matchDigits(candidate.getMatchDigits())
                .matchFrom(candidate.getMatchFrom())
                .matchFromDisplayName(candidate.getMatchFromDisplayName())
                .displayOrder(candidate.getDisplayOrder())
                .isActive(candidate.isActive())
                .createdAt(existing.getCreatedAt())
                .updatedAt(existing.getUpdatedAt())
                .createdBy(existing.getCreatedBy())
                .lastModifiedBy(existing.getLastModifiedBy())
                .deletedAt(existing.getDeletedAt())
                .build();
    }

    private boolean isEquivalent(PrizeStructureModel existing, PrizeStructureModel candidate) {
        return existing.getPrizeLevel() == candidate.getPrizeLevel()
                && Objects.equals(existing.getPrizeDisplayName(), candidate.getPrizeDisplayName())
                && Objects.equals(existing.getPrizeCode(), candidate.getPrizeCode())
                && Objects.equals(existing.getDescription(), candidate.getDescription())
                && Objects.equals(existing.getPrizeValue(), candidate.getPrizeValue())
                && Objects.equals(existing.getQuantity(), candidate.getQuantity())
                && Objects.equals(existing.getMatchDigits(), candidate.getMatchDigits())
                && existing.getMatchFrom() == candidate.getMatchFrom()
                && Objects.equals(existing.getMatchFromDisplayName(), candidate.getMatchFromDisplayName())
                && Objects.equals(existing.getDisplayOrder(), candidate.getDisplayOrder())
                && existing.isActive() == candidate.isActive();
    }

    private String buildItemNote(PrizeStructureSourceItem item, String source) {
        if (item.note() != null && !item.note().isBlank()) {
            return item.note();
        }
        return "Đồng bộ từ nguồn " + source;
    }

    private record SyncDraft(
            List<PrizeStructureModel> toSave,
            List<PrizeStructureSyncItemResponse> items,
            int createdCount,
            int updatedCount,
            int skippedCount
    ) {
    }
}
