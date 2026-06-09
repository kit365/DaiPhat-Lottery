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
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PrizeStructureService implements PrizeStructureServicePort {

    private final LotteryProductRepositoryPort lotteryProductRepositoryPort;
    private final PrizeStructureRepositoryPort prizeStructureRepositoryPort;
    private final PrizeStructureApplicationMapper prizeStructureApplicationMapper;

    @Override
    @Transactional(readOnly = true)
    public List<PrizeStructureResponse> getByProductId(UUID productId) {
        log.info("Fetching prize structures for lottery product: {}", productId);

        ensureProductExists(productId);

        List<PrizeStructureModel> models = prizeStructureRepositoryPort.findByProductId(productId);
        return prizeStructureApplicationMapper.toResponseList(models);
    }

    @Override
    @Transactional
    public List<PrizeStructureResponse> updatePrizeStructures(UUID productId, List<PrizeStructureRequest> requests) {
        log.info("Updating prize structures for lottery product: {}", productId);

        LotteryProductModel product = lotteryProductRepositoryPort.findById(productId)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_PRODUCT_NOT_FOUND));

        if (requests == null || requests.isEmpty()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Danh sách cấu trúc giải thưởng không được để trống.");
        }

        Map<UUID, PrizeStructureModel> existingById = prizeStructureRepositoryPort.findByProductId(productId)
                .stream()
                .filter(model -> model.getId() != null)
                .collect(HashMap::new, (map, model) -> map.put(model.getId(), model), HashMap::putAll);

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
            UUID productId,
            String productRegion,
            Map<UUID, PrizeStructureModel> existingById) {
        try {
            PrizeStructureModel model = request.id() != null
                    ? mergeWithExisting(request, productId, existingById)
                    : prizeStructureApplicationMapper.toModel(request);
            model.setProductId(productId);
            model.applyProductDefaults(productRegion);
            model.validate(productRegion);
            return model;
        } catch (IllegalArgumentException e) {
            throw new DomainException(ErrorCode.INVALID_INPUT,
                    "Dữ liệu cấu trúc giải thưởng không hợp lệ: " + e.getMessage());
        }
    }

    private PrizeStructureModel mergeWithExisting(
            PrizeStructureRequest request,
            UUID productId,
            Map<UUID, PrizeStructureModel> existingById) {
        PrizeStructureModel existing = existingById.get(request.id());
        if (existing == null || !productId.equals(existing.getProductId())) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Cấu trúc giải thưởng không tồn tại để cập nhật.");
        }

        PrizeStructureModel merged = PrizeStructureModel.builder()
                .id(existing.getId())
                .productId(existing.getProductId())
                .region(request.region() != null ? request.region() : existing.getRegion())
                .isOnly(request.isOnly() != null ? request.isOnly() : existing.isOnly())
                .prizeLevel(hasText(request.prizeLevel())
                        ? prizeStructureApplicationMapper.toModel(request).getPrizeLevel()
                        : existing.getPrizeLevel())
                .prizeDisplayName(request.prizeDisplayName() != null ? request.prizeDisplayName() : existing.getPrizeDisplayName())
                .prizeCode(hasText(request.prizeCode()) ? request.prizeCode() : existing.getPrizeCode())
                .prizeValue(request.prizeValue() != null ? request.prizeValue() : existing.getPrizeValue())
                .quantity(request.quantity() != null ? request.quantity() : existing.getQuantity())
                .matchDigits(request.matchDigits() != null ? request.matchDigits() : existing.getMatchDigits())
                .matchFrom(hasText(request.matchFrom())
                        ? prizeStructureApplicationMapper.toModel(request).getMatchFrom()
                        : existing.getMatchFrom())
                .matchFromDisplayName(request.matchFromDisplayName() != null
                        ? request.matchFromDisplayName()
                        : existing.getMatchFromDisplayName())
                .displayOrder(request.displayOrder() != null ? request.displayOrder() : existing.getDisplayOrder())
                .createdAt(existing.getCreatedAt())
                .updatedAt(existing.getUpdatedAt())
                .createdBy(existing.getCreatedBy())
                .lastModifiedBy(existing.getLastModifiedBy())
                .build();
        return merged;
    }

    private void validateUniquePrizeCodes(List<PrizeStructureModel> models) {
        Set<String> seenCodes = new HashSet<>();
        for (PrizeStructureModel model : models) {
            String normalizedCode = model.getPrizeCode().trim().toUpperCase();
            if (!seenCodes.add(normalizedCode)) {
                throw new DomainException(ErrorCode.PRIZE_STRUCTURE_DUPLICATE_CODE,
                        "Mã giải thưởng bị trùng: " + model.getPrizeCode());
            }
        }
    }

    private void ensureProductExists(UUID productId) {
        if (lotteryProductRepositoryPort.findById(productId).isEmpty()) {
            throw new DomainException(ErrorCode.LOTTERY_PRODUCT_NOT_FOUND);
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
