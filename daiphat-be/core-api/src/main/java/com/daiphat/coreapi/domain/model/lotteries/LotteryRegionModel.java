package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Locale;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LotteryRegionModel {

    private Long id;
    private String code;
    private String name;
    private LotteryStationType type;
    private Integer minNumber;
    private Integer maxNumber;
    private Integer stationCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static String normalizeCode(String region) {
        if (region == null || region.isBlank()) {
            throw new DomainException(ErrorCode.LOTTERY_STATION_SYNC_REGION_REQUIRED);
        }
        return region.trim().toUpperCase(Locale.ROOT);
    }

    public String region() {
        return code;
    }

    public LotteryStationType type() {
        return type != null ? type : LotteryStationType.TRADITIONAL;
    }

    public int minNumber() {
        return minNumber != null ? minNumber : 0;
    }

    public int maxNumber() {
        return maxNumber != null ? maxNumber : 999_999;
    }

    public Integer stationCount() {
        return stationCount;
    }

    public int numberLength() {
        return maxLength();
    }

    public int minLength() {
        if (minNumber == null || minNumber == 0) {
            return maxLength();
        }
        return String.valueOf(minNumber()).length();
    }

    public int maxLength() {
        return String.valueOf(maxNumber()).length();
    }

    public void increaseStationCount() {
        this.stationCount = (this.stationCount != null ? this.stationCount : 0) + 1;
    }

    public void decreaseStationCount() {
        int current = this.stationCount != null ? this.stationCount : 0;
        this.stationCount = Math.max(0, current - 1);
    }
}
