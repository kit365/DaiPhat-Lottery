package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.MatchFrom;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeLevel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("RegionPrizeStructureModel Unit Tests")
class RegionPrizeStructureModelTest {

    private static final Long STATION_ID = 100L;
    private static final String REGION = "MIEN_NAM";

    @Test
    void toStationPrizeStructure_copiesTemplateFieldsToStationPrizeStructure() {
        RegionPrizeStructureModel template = RegionPrizeStructureModel.builder()
                .region(REGION)
                .prizeLevel(PrizeLevel.SPECIAL)
                .prizeCode("DB")
                .prizeValue(BigDecimal.ZERO)
                .quantity(1)
                .matchDigits(6)
                .matchFrom(MatchFrom.LAST)
                .displayOrder(0)
                .build();

        PrizeStructureModel result = template.toStationPrizeStructure(STATION_ID, REGION);

        assertThat(result.getProductId()).isEqualTo(STATION_ID);
        assertThat(result.getRegion()).isEqualTo(REGION);
        assertThat(result.getPrizeLevel()).isEqualTo(PrizeLevel.SPECIAL);
        assertThat(result.getPrizeCode()).isEqualTo("DB");
        assertThat(result.getPrizeValue()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(result.getQuantity()).isEqualTo(1);
        assertThat(result.getMatchDigits()).isEqualTo(6);
        assertThat(result.getMatchFrom()).isEqualTo(MatchFrom.LAST);
        assertThat(result.getDisplayOrder()).isEqualTo(0);
    }

    @Test
    void toStationPrizeStructure_supportsExactMatchTemplateWithoutMatchDigits() {
        RegionPrizeStructureModel template = RegionPrizeStructureModel.builder()
                .region(REGION)
                .prizeLevel(PrizeLevel.SUB_SPECIAL)
                .prizeCode("DB_PHU")
                .prizeValue(BigDecimal.ZERO)
                .quantity(1)
                .matchFrom(MatchFrom.EXACT)
                .displayOrder(9)
                .build();

        PrizeStructureModel result = template.toStationPrizeStructure(STATION_ID, REGION);

        assertThat(result.getMatchFrom()).isEqualTo(MatchFrom.EXACT);
        assertThat(result.getMatchDigits()).isNull();
        assertThat(result.getPrizeLevel()).isEqualTo(PrizeLevel.SUB_SPECIAL);
    }
}
