package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.RegionPrizeStructureRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.RegionPrizeStructureResponse;
import com.daiphat.coreapi.application.mapper.lotteries.RegionPrizeStructureApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.RegionPrizeStructureServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.RegionPrizeStructureRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.lotteries.RegionPrizeStructureModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class RegionPrizeStructureService implements RegionPrizeStructureServicePort {

    private final RegionPrizeStructureRepositoryPort regionPrizeStructureRepositoryPort;
    private final RegionPrizeStructureApplicationMapper regionPrizeStructureApplicationMapper;

    @Override
    @Transactional(readOnly = true)
    public List<String> getRegions() {
        return regionPrizeStructureRepositoryPort.findDistinctRegions();
    }

    @Override
    @Transactional(readOnly = true)
    public List<RegionPrizeStructureResponse> getByRegion(String region) {
        String normalizedRegion = requireRegion(region);
        List<RegionPrizeStructureModel> models = regionPrizeStructureRepositoryPort.findByRegion(normalizedRegion);
        return regionPrizeStructureApplicationMapper.toResponseList(models);
    }

    @Override
    @Transactional(readOnly = true)
    public RegionPrizeStructureResponse getById(String region, Long id) {
        String normalizedRegion = requireRegion(region);
        RegionPrizeStructureModel model = getRegionPrizeOrThrow(id);
        assertBelongsToRegion(model, normalizedRegion);
        return regionPrizeStructureApplicationMapper.toResponse(model);
    }

    @Override
    @Transactional
    public RegionPrizeStructureResponse create(String region, RegionPrizeStructureRequest request) {
        String normalizedRegion = requireRegion(region);

        RegionPrizeStructureModel model = regionPrizeStructureApplicationMapper.toModel(request, normalizedRegion);
        model.validate();

        if (regionPrizeStructureRepositoryPort.existsByRegionAndPrizeCode(normalizedRegion, model.getPrizeCode())) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_DUPLICATE_CODE);
        }

        RegionPrizeStructureModel saved = regionPrizeStructureRepositoryPort.save(model);
        log.info("Created region prize structure id={} for region={}", saved.getId(), normalizedRegion);
        return regionPrizeStructureApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public RegionPrizeStructureResponse update(String region, Long id, RegionPrizeStructureRequest request) {
        String normalizedRegion = requireRegion(region);
        RegionPrizeStructureModel existing = getRegionPrizeOrThrow(id);
        assertBelongsToRegion(existing, normalizedRegion);

        RegionPrizeStructureModel merged = regionPrizeStructureApplicationMapper.merge(request, existing);
        merged.validate();

        if (regionPrizeStructureRepositoryPort.existsByRegionAndPrizeCodeExcludingId(
                normalizedRegion, merged.getPrizeCode(), id)) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_DUPLICATE_CODE);
        }

        RegionPrizeStructureModel saved = regionPrizeStructureRepositoryPort.save(merged);
        log.info("Updated region prize structure id={} for region={}", saved.getId(), normalizedRegion);
        return regionPrizeStructureApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public List<RegionPrizeStructureResponse> replaceByRegion(
            String region,
            List<RegionPrizeStructureRequest> requests) {
        String normalizedRegion = requireRegion(region);

        if (requests == null || requests.isEmpty()) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_LIST_REQUIRED);
        }

        List<RegionPrizeStructureModel> models = requests.stream()
                .map(request -> {
                    RegionPrizeStructureModel model =
                            regionPrizeStructureApplicationMapper.toModel(request, normalizedRegion);
                    model.validate();
                    return model;
                })
                .toList();

        validateUniquePrizeCodes(models);

        regionPrizeStructureRepositoryPort.deleteByRegion(normalizedRegion);
        List<RegionPrizeStructureModel> saved = regionPrizeStructureRepositoryPort.saveAll(models);

        log.info("Replaced {} region prize structures for region={}", saved.size(), normalizedRegion);
        return regionPrizeStructureApplicationMapper.toResponseList(saved);
    }

    @Override
    @Transactional
    public void delete(String region, Long id) {
        String normalizedRegion = requireRegion(region);
        RegionPrizeStructureModel model = getRegionPrizeOrThrow(id);
        assertBelongsToRegion(model, normalizedRegion);

        model.softDelete();
        regionPrizeStructureRepositoryPort.save(model);
        log.info("Soft-deleted region prize structure id={} for region={}", id, normalizedRegion);
    }

    private void assertBelongsToRegion(RegionPrizeStructureModel model, String region) {
        if (model.getRegion() == null || !model.getRegion().equalsIgnoreCase(region)) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_REGION_INVALID);
        }
    }

    private RegionPrizeStructureModel getRegionPrizeOrThrow(Long id) {
        return regionPrizeStructureRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_ITEM_NOT_FOUND));
    }

    private String requireRegion(String region) {
        if (region == null || region.isBlank()) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_REGION_REQUIRED);
        }
        return region.trim();
    }

    private void validateUniquePrizeCodes(List<RegionPrizeStructureModel> models) {
        Set<String> codes = new HashSet<>();
        for (RegionPrizeStructureModel model : models) {
            String code = model.getPrizeCode().toUpperCase();
            if (!codes.add(code)) {
                throw new DomainException(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_DUPLICATE_CODE);
            }
        }
    }
}
