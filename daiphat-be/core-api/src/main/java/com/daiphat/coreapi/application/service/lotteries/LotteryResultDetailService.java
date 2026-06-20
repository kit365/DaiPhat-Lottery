package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.lotteries.LotteryResultSourceItem;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryResultDetailRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryResultDetailRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultDetailResponse;
import com.daiphat.coreapi.application.mapper.lotteries.LotteryResultApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryResultDetailServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.PrizeStructureServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryResultDetailRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryResultRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultDetailModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultModel;
import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class LotteryResultDetailService implements LotteryResultDetailServicePort {

    private final LotteryResultDetailRepositoryPort lotteryResultDetailRepositoryPort;
    private final LotteryResultRepositoryPort lotteryResultRepositoryPort;
    private final PrizeStructureServicePort prizeStructureServicePort;
    private final LotteryResultApplicationMapper lotteryResultApplicationMapper;

    @Override
    @Transactional(readOnly = true)
    public List<LotteryResultDetailResponse> getByLotteryResultId(Long lotteryResultId) {
        getLotteryResultOrThrow(lotteryResultId);
        return lotteryResultApplicationMapper.toDetailResponseList(
                lotteryResultDetailRepositoryPort.findByLotteryResultId(lotteryResultId)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public LotteryResultDetailResponse getById(Long lotteryResultId, Long detailId) {
        getLotteryResultOrThrow(lotteryResultId);
        LotteryResultDetailModel detail = getDetailOrThrow(detailId);
        assertDetailBelongsToResult(detail, lotteryResultId);
        return lotteryResultApplicationMapper.toDetailResponse(detail);
    }

    @Override
    @Transactional
    public LotteryResultDetailResponse create(Long lotteryResultId, CreateLotteryResultDetailRequest request) {
        LotteryResultModel result = getLotteryResultOrThrow(lotteryResultId);
        LotteryResultDetailModel model = lotteryResultApplicationMapper.toDetailModel(request);
        model.setLotteryResultId(lotteryResultId);
        if (model.getWinningNumber() != null) {
            model.setWinningNumber(model.getWinningNumber().trim());
        }
        model.validate();

        PrizeStructureModel prizeStructure = getPrizeStructureOrThrow(model.getPrizeStructureId());
        assertPrizeStructureMatchesResult(result, prizeStructure);
        assertUniqueDetail(lotteryResultId, model.getPrizeStructureId(), model.getWinningNumber(), null);

        LotteryResultDetailModel saved = lotteryResultApplicationMapper.withPrizeStructure(
                lotteryResultDetailRepositoryPort.save(
                        lotteryResultApplicationMapper.withPrizeStructure(model, prizeStructure)
                ),
                prizeStructure
        );
        log.info("Created lottery result detail id={} for result={}", saved.getId(), lotteryResultId);
        return lotteryResultApplicationMapper.toDetailResponse(saved);
    }

    @Override
    @Transactional
    public LotteryResultDetailResponse update(
            Long lotteryResultId,
            Long detailId,
            UpdateLotteryResultDetailRequest request
    ) {
        LotteryResultModel result = getLotteryResultOrThrow(lotteryResultId);
        LotteryResultDetailModel existing = getDetailOrThrow(detailId);
        assertDetailBelongsToResult(existing, lotteryResultId);

        LotteryResultDetailModel merged = lotteryResultApplicationMapper.mergeDetail(existing, request);
        if (merged.getWinningNumber() != null) {
            merged.setWinningNumber(merged.getWinningNumber().trim());
        }
        merged.validate();

        PrizeStructureModel prizeStructure = getPrizeStructureOrThrow(merged.getPrizeStructureId());
        assertPrizeStructureMatchesResult(result, prizeStructure);
        assertUniqueDetail(lotteryResultId, merged.getPrizeStructureId(), merged.getWinningNumber(), detailId);

        LotteryResultDetailModel saved = lotteryResultApplicationMapper.withPrizeStructure(
                lotteryResultDetailRepositoryPort.save(
                        lotteryResultApplicationMapper.withPrizeStructure(merged, prizeStructure)
                ),
                prizeStructure
        );
        log.info("Updated lottery result detail id={} for result={}", saved.getId(), lotteryResultId);
        return lotteryResultApplicationMapper.toDetailResponse(saved);
    }

    @Override
    @Transactional
    public void delete(Long lotteryResultId, Long detailId) {
        getLotteryResultOrThrow(lotteryResultId);
        LotteryResultDetailModel detail = getDetailOrThrow(detailId);
        assertDetailBelongsToResult(detail, lotteryResultId);
        lotteryResultDetailRepositoryPort.deleteById(detailId);
        log.info("Deleted lottery result detail id={} for result={}", detailId, lotteryResultId);
    }

    @Override
    @Transactional
    public void deleteByLotteryResultId(Long lotteryResultId) {
        lotteryResultDetailRepositoryPort.findByLotteryResultId(lotteryResultId)
                .forEach(detail -> lotteryResultDetailRepositoryPort.deleteById(detail.getId()));
    }

    @Override
    @Transactional(readOnly = true)
    public void validateRegionCompatibility(Long lotteryResultId, String regionCode) {
        if (regionCode == null) {
            return;
        }
        List<LotteryResultDetailModel> details = lotteryResultDetailRepositoryPort.findByLotteryResultId(lotteryResultId);
        for (LotteryResultDetailModel detail : details) {
            PrizeStructureModel prizeStructure = getPrizeStructureOrThrow(detail.getPrizeStructureId());
            if (prizeStructure.getRegionCode() == null || !regionCode.equalsIgnoreCase(prizeStructure.getRegionCode())) {
                throw new DomainException(ErrorCode.PRIZE_STRUCTURE_REGION_INVALID);
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<LotteryResultDetailModel> getModelsByLotteryResultId(Long lotteryResultId) {
        getLotteryResultOrThrow(lotteryResultId);
        return lotteryResultDetailRepositoryPort.findByLotteryResultId(lotteryResultId);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public List<LotteryResultDetailResponse> syncFromSource(
            Long lotteryResultId,
            List<LotteryResultSourceItem> sourceItems,
            List<PrizeStructureModel> prizeStructures
    ) {
        if (sourceItems == null || sourceItems.isEmpty()) {
            return getByLotteryResultId(lotteryResultId);
        }

        getLotteryResultOrThrow(lotteryResultId);
        Map<String, PrizeStructureModel> prizeStructureByCode = indexPrizeStructuresByCode(prizeStructures);
        List<LotteryResultDetailModel> existingDetails = lotteryResultDetailRepositoryPort.findByLotteryResultId(lotteryResultId);
        Map<String, LotteryResultDetailModel> existingByKey = indexExistingDetails(existingDetails);

        for (LotteryResultSourceItem sourceItem : sourceItems) {
            PrizeStructureModel prizeStructure = prizeStructureByCode.get(normalizeKey(sourceItem.prizeCode()));
            if (prizeStructure == null || sourceItem.winningNumbers() == null) {
                continue;
            }

            for (String winningNumber : sourceItem.winningNumbers()) {
                String normalizedWinningNumber = winningNumber == null ? "" : winningNumber.trim();
                if (normalizedWinningNumber.isBlank()) {
                    continue;
                }

                String detailKey = buildDetailKey(prizeStructure.getId(), normalizedWinningNumber);
                if (existingByKey.containsKey(detailKey)) {
                    continue;
                }

                LotteryResultDetailModel candidate = LotteryResultDetailModel.builder()
                        .lotteryResultId(lotteryResultId)
                        .prizeStructureId(prizeStructure.getId())
                        .winningNumber(normalizedWinningNumber)
                        .build();
                candidate.validate();

                LotteryResultDetailModel saved = lotteryResultApplicationMapper.withPrizeStructure(
                        lotteryResultDetailRepositoryPort.save(
                                lotteryResultApplicationMapper.withPrizeStructure(candidate, prizeStructure)
                        ),
                        prizeStructure
                );
                existingByKey.put(detailKey, saved);
            }
        }

        return lotteryResultApplicationMapper.toDetailResponseList(
                lotteryResultDetailRepositoryPort.findByLotteryResultId(lotteryResultId)
        );
    }


    @Override
    @Transactional(readOnly = true)
    public Optional<LotteryResultDetailModel> findModelById(Long id) {
        return lotteryResultDetailRepositoryPort.findById(id);
    }

    private LotteryResultModel getLotteryResultOrThrow(Long lotteryResultId) {
        return lotteryResultRepositoryPort.findById(lotteryResultId)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_RESULT_NOT_FOUND));
    }

    private LotteryResultDetailModel getDetailOrThrow(Long id) {
        return lotteryResultDetailRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_RESULT_DETAIL_NOT_FOUND));
    }

    private PrizeStructureModel getPrizeStructureOrThrow(Long prizeStructureId) {
        return prizeStructureServicePort.findModelById(prizeStructureId)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_STRUCTURE_NOT_FOUND));
    }

    private void assertUniqueDetail(
            Long lotteryResultId,
            Long prizeStructureId,
            String winningNumber,
            Long excludeId
    ) {
        boolean existed = excludeId == null
                ? lotteryResultDetailRepositoryPort.existsByLotteryResultIdAndPrizeStructureIdAndWinningNumber(
                        lotteryResultId, prizeStructureId, winningNumber
                )
                : lotteryResultDetailRepositoryPort.existsByLotteryResultIdAndPrizeStructureIdAndWinningNumberExcludingId(
                        lotteryResultId, prizeStructureId, winningNumber, excludeId
                );
        if (existed) {
            throw new DomainException(ErrorCode.LOTTERY_RESULT_DETAIL_DUPLICATE);
        }
    }

    private void assertPrizeStructureMatchesResult(LotteryResultModel result, PrizeStructureModel prizeStructure) {
        String resultRegion = result.getRegionCode();
        String prizeRegion = prizeStructure.getRegionCode();
        if (resultRegion == null || prizeRegion == null || !resultRegion.equalsIgnoreCase(prizeRegion)) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_REGION_INVALID);
        }
    }

    private void assertDetailBelongsToResult(LotteryResultDetailModel detail, Long lotteryResultId) {
        if (!lotteryResultId.equals(detail.getLotteryResultId())) {
            throw new DomainException(ErrorCode.LOTTERY_RESULT_DETAIL_NOT_FOUND);
        }
    }

    private Map<String, PrizeStructureModel> indexPrizeStructuresByCode(List<PrizeStructureModel> prizeStructures) {
        Map<String, PrizeStructureModel> prizeStructureByCode = new LinkedHashMap<>();
        if (prizeStructures == null) {
            return prizeStructureByCode;
        }
        for (PrizeStructureModel prizeStructure : prizeStructures) {
            prizeStructureByCode.put(normalizeKey(prizeStructure.getPrizeCode()), prizeStructure);
        }
        return prizeStructureByCode;
    }

    private Map<String, LotteryResultDetailModel> indexExistingDetails(List<LotteryResultDetailModel> existingDetails) {
        Map<String, LotteryResultDetailModel> existingByKey = new LinkedHashMap<>();
        for (LotteryResultDetailModel detail : existingDetails) {
            existingByKey.put(buildDetailKey(detail.getPrizeStructureId(), detail.getWinningNumber()), detail);
        }
        return existingByKey;
    }

    private String buildDetailKey(Long prizeStructureId, String winningNumber) {
        return prizeStructureId + "::" + normalizeKey(winningNumber);
    }

    private String normalizeKey(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }
}
