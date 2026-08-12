package com.daiphat.coreapi.domain.service.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.VendorLateReturnPolicy;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class VendorSettlementCalculatorTest {

    @Test
    void settles_eighty_sold_twenty_returned() {
        var result = VendorSettlementCalculator.calculate(
                100, 20,
                new BigDecimal("10000"),
                new BigDecimal("9000"),
                new BigDecimal("90000"),
                false,
                VendorLateReturnPolicy.FORFEIT_DEPOSIT
        );

        assertThat(result.soldQuantity()).isEqualTo(80);
        assertThat(result.grossCashRemitted()).isEqualByComparingTo("800000");
        assertThat(result.commissionPayable()).isEqualByComparingTo("80000");
        assertThat(result.depositRefundAmount()).isEqualByComparingTo("90000");
        assertThat(result.depositForfeitedAmount()).isZero();
        assertThat(result.agencyNetSalesAmount()).isEqualByComparingTo("720000");
        var cash = VendorSettlementCalculator.counterCashMovement(result);
        assertThat(cash.dueFromVendor()).isEqualByComparingTo("630000");
        assertThat(cash.payableToVendor()).isZero();
    }

    @Test
    void late_forfeit_deposit() {
        var result = VendorSettlementCalculator.calculate(
                100, 20,
                new BigDecimal("10000"),
                new BigDecimal("9000"),
                new BigDecimal("90000"),
                true,
                VendorLateReturnPolicy.FORFEIT_DEPOSIT
        );

        assertThat(result.soldQuantity()).isEqualTo(80);
        assertThat(result.commissionPayable()).isEqualByComparingTo("80000");
        assertThat(result.depositRefundAmount()).isZero();
        assertThat(result.depositForfeitedAmount()).isEqualByComparingTo("90000");
        assertThat(result.additionalAmountDue()).isZero();
        var cash = VendorSettlementCalculator.counterCashMovement(result);
        assertThat(cash.dueFromVendor()).isEqualByComparingTo("720000");
        assertThat(cash.payableToVendor()).isZero();
    }

    @Test
    void late_force_purchase_all() {
        var result = VendorSettlementCalculator.calculate(
                100, 20,
                new BigDecimal("10000"),
                new BigDecimal("9000"),
                new BigDecimal("90000"),
                true,
                VendorLateReturnPolicy.FORCE_PURCHASE_ALL
        );

        assertThat(result.soldQuantity()).isEqualTo(80);
        assertThat(result.grossCashRemitted()).isEqualByComparingTo("900000");
        assertThat(result.forcedPurchaseAmount()).isEqualByComparingTo("900000");
        assertThat(result.additionalAmountDue()).isEqualByComparingTo("810000");
        assertThat(result.commissionPayable()).isZero();
        assertThat(result.depositRefundAmount()).isZero();
        var cash = VendorSettlementCalculator.counterCashMovement(result);
        assertThat(cash.dueFromVendor()).isEqualByComparingTo("810000");
        assertThat(cash.payableToVendor()).isZero();
    }

    @Test
    void returns_a_net_payout_when_no_ticket_was_sold() {
        var result = VendorSettlementCalculator.calculate(
                10, 10,
                new BigDecimal("10000"),
                new BigDecimal("9000"),
                new BigDecimal("9000"),
                false,
                VendorLateReturnPolicy.FORFEIT_DEPOSIT
        );

        var cash = VendorSettlementCalculator.counterCashMovement(result);
        assertThat(cash.dueFromVendor()).isZero();
        assertThat(cash.payableToVendor()).isEqualByComparingTo("9000");
    }
}
