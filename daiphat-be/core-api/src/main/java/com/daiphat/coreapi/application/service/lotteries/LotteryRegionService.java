package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryRegionRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryRegionResponse;
import com.daiphat.coreapi.application.mapper.lotteries.LotteryRegionApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryRegionServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryRegionRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class LotteryRegionService implements LotteryRegionServicePort {

    private final LotteryRegionRepositoryPort lotteryRegionRepositoryPort;
    private final LotteryRegionApplicationMapper lotteryRegionApplicationMapper;

    @Override
    @Transactional(readOnly = true)
    public List<LotteryRegionResponse> getAll() {
        return lotteryRegionRepositoryPort.findAll().stream()
                .map(lotteryRegionApplicationMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public LotteryRegionResponse getByCode(String code) {
        return lotteryRegionApplicationMapper.toResponse(getRegionOrThrow(code));
    }

    @Override
    @Transactional
    public LotteryRegionResponse update(String code, UpdateLotteryRegionRequest request) {
        LotteryRegionModel model = getRegionOrThrow(code);
        validateNumbers(request.minNumber(), request.maxNumber());
        lotteryRegionApplicationMapper.merge(request, model);
        LotteryRegionModel saved = lotteryRegionRepositoryPort.save(model);
        log.info("Updated lottery region code={} minNumber={} maxNumber={}",
                saved.getCode(), saved.getMinNumber(), saved.getMaxNumber());
        return lotteryRegionApplicationMapper.toResponse(saved);
    }

    private LotteryRegionModel getRegionOrThrow(String code) {
        String normalizedCode = LotteryRegionModel.normalizeCode(code);
        return lotteryRegionRepositoryPort.findByCode(normalizedCode)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_REGION_NOT_FOUND));
    }

    private void validateNumbers(Integer minNumber, Integer maxNumber) {
        if (minNumber == null || maxNumber == null || maxNumber < minNumber) {
            throw new DomainException(ErrorCode.LOTTERY_REGION_NUMBER_RANGE_INVALID);
        }
    }
}
