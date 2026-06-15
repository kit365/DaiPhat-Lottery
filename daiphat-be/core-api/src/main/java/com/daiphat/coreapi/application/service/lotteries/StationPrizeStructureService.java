package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.response.lotteries.PrizeStructureResponse;
import com.daiphat.coreapi.application.mapper.lotteries.PrizeStructureApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.StationPrizeStructureServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.PrizeStructureRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class StationPrizeStructureService implements StationPrizeStructureServicePort {

    private final LotteryStationRepositoryPort lotteryStationRepositoryPort;
    private final PrizeStructureRepositoryPort prizeStructureRepositoryPort;
    private final PrizeStructureApplicationMapper prizeStructureApplicationMapper;

    @Override
    @Transactional(readOnly = true)
    public List<PrizeStructureResponse> getByProductId(Long productId) {
        log.info("Fetching prize structures for lottery station: {}", productId);

        getProductOrThrow(productId);
        List<PrizeStructureModel> models = prizeStructureRepositoryPort.findByProductId(productId);
        return prizeStructureApplicationMapper.toResponseList(models);
    }

    @Override
    @Transactional(readOnly = true)
    public PrizeStructureResponse getById(Long productId, Long id) {
        log.info("Fetching prize structure id={} for lottery station: {}", id, productId);

        getProductOrThrow(productId);
        PrizeStructureModel model = getPrizeStructureOrThrow(id);
        assertBelongsToProduct(model, productId);
        return prizeStructureApplicationMapper.toResponse(model);
    }

    private void assertBelongsToProduct(PrizeStructureModel model, Long productId) {
        if (!productId.equals(model.getProductId())) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_PRODUCT_MISMATCH);
        }
    }

    private PrizeStructureModel getPrizeStructureOrThrow(Long id) {
        return prizeStructureRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_STRUCTURE_NOT_FOUND));
    }

    private LotteryStationModel getProductOrThrow(Long productId) {
        return lotteryStationRepositoryPort.findById(productId)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_STATION_NOT_FOUND));
    }
}
