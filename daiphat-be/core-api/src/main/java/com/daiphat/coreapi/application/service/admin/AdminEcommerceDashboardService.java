package com.daiphat.coreapi.application.service.admin;

import com.daiphat.coreapi.application.dto.response.admin.AdminEcommerceSummaryResponse;
import com.daiphat.coreapi.application.port.in.admin.AdminEcommerceDashboardServicePort;
import com.daiphat.coreapi.application.port.out.admin.AdminEcommerceDashboardQueryPort;
import com.daiphat.coreapi.shared.time.VietnamClock;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.YearMonth;

@Service
@RequiredArgsConstructor
public class AdminEcommerceDashboardService implements AdminEcommerceDashboardServicePort {

    private static final BigDecimal ONE_HUNDRED = BigDecimal.valueOf(100);
    private static final int PERCENT_SCALE = 2;

    private final AdminEcommerceDashboardQueryPort queryPort;
    private final VietnamClock vietnamClock;

    @Override
    @Transactional(readOnly = true)
    public AdminEcommerceSummaryResponse getSummary() {
        YearMonth currentMonth = YearMonth.from(vietnamClock.today());
        YearMonth previousMonth = currentMonth.minusMonths(1);

        LocalDateTime currentFrom = currentMonth.atDay(1).atStartOfDay();
        LocalDateTime currentTo = currentMonth.plusMonths(1).atDay(1).atStartOfDay();
        LocalDateTime previousFrom = previousMonth.atDay(1).atStartOfDay();
        LocalDateTime previousTo = currentFrom;

        BigDecimal currentRevenue = safeAmount(
                queryPort.sumCompletedOrderPayments(currentFrom, currentTo));
        BigDecimal previousRevenue = safeAmount(
                queryPort.sumCompletedOrderPayments(previousFrom, previousTo));

        return new AdminEcommerceSummaryResponse(
                queryPort.countActiveTicketProducts(),
                queryPort.countOrders(),
                currentRevenue,
                calculateMonthOverMonthPercent(currentRevenue, previousRevenue)
        );
    }

    private BigDecimal calculateMonthOverMonthPercent(BigDecimal current, BigDecimal previous) {
        if (previous.signum() == 0) {
            return BigDecimal.ZERO.setScale(PERCENT_SCALE, RoundingMode.HALF_UP);
        }
        return current.subtract(previous)
                .multiply(ONE_HUNDRED)
                .divide(previous, PERCENT_SCALE, RoundingMode.HALF_UP);
    }

    private BigDecimal safeAmount(BigDecimal amount) {
        return amount != null ? amount : BigDecimal.ZERO;
    }
}
