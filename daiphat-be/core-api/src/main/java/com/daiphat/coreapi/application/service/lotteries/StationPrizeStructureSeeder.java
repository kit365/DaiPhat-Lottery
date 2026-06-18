package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.port.out.lotteries.PrizeStructureRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.RegionPrizeStructureRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;
import com.daiphat.coreapi.domain.model.lotteries.RegionPrizeStructureModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class StationPrizeStructureSeeder {

    private final RegionPrizeStructureRepositoryPort regionPrizeStructureRepositoryPort;
    private final PrizeStructureRepositoryPort prizeStructureRepositoryPort;

    public void requireRegionHasPrizeStructures(LotteryRegionModel region) {
        if (region == null) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_REGION_REQUIRED);
        }
        if (regionPrizeStructureRepositoryPort.findByRegion(region.region()).isEmpty()) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_NOT_FOUND);
        }
    }

    public List<PrizeStructureModel> seedFromRegion(LotteryStationModel station) {
        LotteryRegionModel region = station.getRegion();
        if (region == null) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_REGION_REQUIRED);
        }

        List<RegionPrizeStructureModel> regionPrizes = regionPrizeStructureRepositoryPort.findByRegion(region.region());
        if (regionPrizes.isEmpty()) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_NOT_FOUND);
        }

        List<PrizeStructureModel> prizeStructures = regionPrizes.stream()
                .map(regionPrize -> regionPrize.toStationPrizeStructure(station.getId(), region.region()))
                .toList();

        return prizeStructureRepositoryPort.saveAll(station.getId(), prizeStructures);
    }

    public List<PrizeStructureModel> reseedFromRegion(LotteryStationModel station) {
        prizeStructureRepositoryPort.deleteByProductId(station.getId());
        return seedFromRegion(station);
    }
}
