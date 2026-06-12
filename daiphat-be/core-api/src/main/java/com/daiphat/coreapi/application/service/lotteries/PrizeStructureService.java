package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.PrizeStructureRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeStructureResponse;
import com.daiphat.coreapi.application.mapper.lotteries.PrizeStructureApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.PrizeStructureServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryProductRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.PrizeStructureRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.lotteries.LotteryProductModel;
import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
@Service
@RequiredArgsConstructor
@Slf4j
public class PrizeStructureService implements PrizeStructureServicePort {

    private final LotteryProductRepositoryPort lotteryProductRepositoryPort;
    private final PrizeStructureRepositoryPort prizeStructureRepositoryPort;
    private final PrizeStructureApplicationMapper prizeStructureApplicationMapper;

    @Override
    @Transactional(readOnly = true)
    public List<PrizeStructureResponse> getByProductId(Long productId) {
        log.info("Fetching prize structures for lottery product: {}", productId);

        getProductOrThrow(productId);
        List<PrizeStructureModel> models = prizeStructureRepositoryPort.findByProductId(productId);
        return prizeStructureApplicationMapper.toResponseList(models);
    }

    @Override
    @Transactional
    public List<PrizeStructureResponse> updatePrizeStructures(Long productId, List<PrizeStructureRequest> requests) {
        log.info("Updating prize structures for lottery product: {}", productId);

        LotteryProductModel product = getProductOrThrow(productId);

        if (requests == null || requests.isEmpty()) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_LIST_REQUIRED);
        }

        Map<Long, PrizeStructureModel> existingById = getExistingPrizeStructuresById(productId);

        List<PrizeStructureModel> models = requests.stream()
                .map(req -> mergeAndValidateModel(req, productId, product.getRegion(), existingById))
                .toList();

        validateUniquePrizeCodes(models);

        prizeStructureRepositoryPort.deleteByProductId(productId);
        List<PrizeStructureModel> saved = prizeStructureRepositoryPort.saveAll(productId, models);

        log.info("Successfully updated {} prize structures for product: {}", saved.size(), productId);
        return prizeStructureApplicationMapper.toResponseList(saved);
    }

    private PrizeStructureModel mergeAndValidateModel(
            PrizeStructureRequest request,
            Long productId,
            String productRegion,
            Map<Long, PrizeStructureModel> existingById) {
        try {
            PrizeStructureModel model = request.id() != null
                    ? mergeWithExisting(request, productId, productRegion, existingById)
                    : prizeStructureApplicationMapper.toModel(request);
            model.setProductId(productId);
            model.applyProductDefaults(productRegion);
            model.validate(productRegion);
            return model;
        } catch (IllegalArgumentException e) {
            throw new DomainException(ErrorCode.INVALID_INPUT, e.getMessage());
        }
    }

    private PrizeStructureModel mergeWithExisting(
            PrizeStructureRequest request,
            Long productId,
            String productRegion,
            Map<Long, PrizeStructureModel> existingById) {
        PrizeStructureModel existing = existingById.get(request.id());

        if (existing == null) {
            PrizeStructureModel model = prizeStructureApplicationMapper.toModel(request);
            model.setId(null);
            model.setProductId(productId);
            model.applyProductDefaults(productRegion);
            return model;
        }

        if (!productId.equals(existing.getProductId())) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_PRODUCT_MISMATCH);
        }

        return prizeStructureApplicationMapper.merge(request, existing);
    }

    private void validateUniquePrizeCodes(List<PrizeStructureModel> models) {
        Set<String> seenCodes = new HashSet<>();
        for (PrizeStructureModel model : models) {
            String normalizedCode = model.getPrizeCode().trim().toUpperCase();
            if (!seenCodes.add(normalizedCode)) {
                throw new DomainException(ErrorCode.PRIZE_STRUCTURE_DUPLICATE_CODE);
            }
        }
    }

    private LotteryProductModel getProductOrThrow(Long productId) {
        return lotteryProductRepositoryPort.findById(productId)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_PRODUCT_NOT_FOUND));
    }

    private Map<Long, PrizeStructureModel> getExistingPrizeStructuresById(Long productId) {
        return prizeStructureRepositoryPort.findByProductId(productId).stream()
                .filter(model -> model.getId() != null)
                .collect(HashMap::new, (map, model) -> map.put(model.getId(), model), HashMap::putAll);
    }
}
