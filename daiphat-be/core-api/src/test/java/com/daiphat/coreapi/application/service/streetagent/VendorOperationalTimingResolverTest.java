package com.daiphat.coreapi.application.service.streetagent;

import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import com.daiphat.coreapi.domain.model.streetagent.VendorAllocationSerialModel;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class VendorOperationalTimingResolverTest {

    @Test
    void uses_the_earlier_of_vendor_cutoff_and_supplier_cutoff_minus_buffer() {
        VendorOperationalTimingResolver resolver = resolver("15:30", "45");
        LocalDate date = LocalDate.of(2026, 8, 12);
        LocalDateTime at = date.atTime(14, 0);

        VendorOperationalTimingResolver.OperationalTiming timing = resolver.resolveForHandover(
                date, List.of(serial(LocalTime.of(16, 0)), serial(LocalTime.of(17, 0))), at);

        assertThat(timing.effectiveDeadline()).isEqualTo(date.atTime(15, 15));
        assertThat(resolver.isDraftExpired(date.atTime(16, 0), timing, date.atTime(15, 15))).isTrue();
        assertThat(resolver.isDraftExpired(date.atTime(15, 10), timing, date.atTime(15, 9))).isFalse();
    }

    @Test
    void rejects_quote_and_confirm_when_any_serial_has_no_supplier_return_cutoff() {
        VendorOperationalTimingResolver resolver = resolver("15:30", "45");
        LocalDate date = LocalDate.of(2026, 8, 12);

        assertThatThrownBy(() -> resolver.resolveForHandover(
                date, List.of(serial(LocalTime.of(17, 0)), serial(null)), date.atTime(14, 0)))
                .isInstanceOf(DomainException.class)
                .extracting(error -> ((DomainException) error).getErrorCode())
                .isEqualTo(ErrorCode.VENDOR_ALLOCATION_SUPPLIER_RETURN_CUTOFF_MISSING);
    }

    @Test
    void treats_the_exact_deadline_as_closed() {
        VendorOperationalTimingResolver resolver = resolver("15:00", "0");
        LocalDate date = LocalDate.of(2026, 8, 12);
        VendorOperationalTimingResolver.OperationalTiming timing = resolver.resolveForHandover(
                date, List.of(serial(LocalTime.of(17, 0))), date.atTime(14, 59));

        assertThatThrownBy(() -> resolver.requireHandoverDeadlineOpen(timing, date.atTime(15, 0)))
                .isInstanceOf(DomainException.class)
                .extracting(error -> ((DomainException) error).getErrorCode())
                .isEqualTo(ErrorCode.VENDOR_ALLOCATION_OPERATIONAL_DEADLINE_REACHED);
    }

    private VendorOperationalTimingResolver resolver(String vendorCutoff, String bufferMinutes) {
        SystemConfigRepositoryPort configs = mock(SystemConfigRepositoryPort.class);
        when(configs.findActiveByConfigKey(SystemConfigEnum.VENDOR_RETURN_CUTOFF.name()))
                .thenReturn(Optional.of(SystemConfigModel.builder().configValue(vendorCutoff).build()));
        when(configs.findActiveByConfigKey(SystemConfigEnum.RETURN_BUFFER_TIME.name()))
                .thenReturn(Optional.of(SystemConfigModel.builder().configValue(bufferMinutes).build()));
        return new VendorOperationalTimingResolver(configs);
    }

    private VendorAllocationSerialModel serial(LocalTime supplierReturnCutoff) {
        return VendorAllocationSerialModel.builder().supplierReturnCutoffTime(supplierReturnCutoff).build();
    }
}
