package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.port.out.lotteries.LotteryRegionRepositoryPort;
import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;
import com.daiphat.coreapi.shared.util.LotteryRegionDrawScheduleDefaults;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class LotteryRegionDrawTimeResolver {

    private final LotteryRegionRepositoryPort lotteryRegionRepositoryPort;

    public String resolveFormattedDrawTime(String regionCode) {
        String normalized = LotteryRegionModel.normalizeCode(regionCode);
        return lotteryRegionRepositoryPort.findByCode(normalized)
                .map(LotteryRegionModel::formattedDefaultDrawTime)
                .orElseGet(() -> LotteryRegionDrawScheduleDefaults.fallbackFormatted(normalized));
    }
}
