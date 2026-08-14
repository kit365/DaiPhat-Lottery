package com.daiphat.coreapi.adapter.in.web.controller.streetagent;

import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.streetagent.ConfirmVendorAllocationRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ReturnVendorAllocationSerialsRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ReplaceVendorAllocationReturnsRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.SettleVendorAllocationRequest;
import com.daiphat.coreapi.application.port.in.streetagent.VendorAllocationServicePort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.prepost.PreAuthorize;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class VendorAllocationControllerTest {

    private static final Long BATCH_ID = 99L;
    private static final UUID OPERATOR_ID = UUID.fromString("4a7a4e38-dfbb-4c3e-a49f-2db38e11bc01");

    @Mock
    private VendorAllocationServicePort vendorAllocationServicePort;

    private VendorAllocationController controller;
    private AuthenticatedUserPrincipal principal;

    @BeforeEach
    void setUp() {
        controller = new VendorAllocationController(vendorAllocationServicePort);
        principal = new AuthenticatedUserPrincipal(OPERATOR_ID, "operator");
    }

    @Test
    void confirm_forwards_actual_received_deposit_and_operator() {
        ConfirmVendorAllocationRequest request = new ConfirmVendorAllocationRequest(new BigDecimal("90000"));

        var response = controller.confirm(BATCH_ID, request, principal);

        assertThat(response.isSuccess()).isTrue();
        verify(vendorAllocationServicePort).confirm(BATCH_ID, request, OPERATOR_ID);
    }

    @Test
    void return_session_and_serial_scan_delegate_to_service() {
        ReturnVendorAllocationSerialsRequest request = new ReturnVendorAllocationSerialsRequest(List.of(101L, 102L));

        assertThat(controller.openReturnSession(BATCH_ID).isSuccess()).isTrue();
        assertThat(controller.recordReturns(BATCH_ID, request).isSuccess()).isTrue();
        ReplaceVendorAllocationReturnsRequest replaceRequest = new ReplaceVendorAllocationReturnsRequest(List.of(102L));
        assertThat(controller.replaceReturns(BATCH_ID, replaceRequest).isSuccess()).isTrue();
        assertThat(controller.removeReturn(BATCH_ID, 101L).isSuccess()).isTrue();
        assertThat(controller.reopenReturnInspection(BATCH_ID).isSuccess()).isTrue();

        verify(vendorAllocationServicePort).openReturnSession(BATCH_ID);
        verify(vendorAllocationServicePort).recordReturns(BATCH_ID, request);
        verify(vendorAllocationServicePort).replaceReturns(BATCH_ID, replaceRequest);
        verify(vendorAllocationServicePort).removeReturn(BATCH_ID, 101L);
        verify(vendorAllocationServicePort).reopenReturnInspection(BATCH_ID);
    }

    @Test
    void preview_and_settle_delegate_to_service_with_operator() {
        SettleVendorAllocationRequest request = new SettleVendorAllocationRequest("settlement-preview", true);
        assertThat(controller.previewSettlement(BATCH_ID).isSuccess()).isTrue();
        assertThat(controller.settle(BATCH_ID, request, principal).isSuccess()).isTrue();

        verify(vendorAllocationServicePort).previewSettlement(BATCH_ID);
        verify(vendorAllocationServicePort).settle(BATCH_ID, request, OPERATOR_ID);
    }

    @Test
    void mutation_endpoints_follow_vendor_action_permissions() throws NoSuchMethodException {
        for (var method : List.of(
                VendorAllocationController.class.getMethod("confirm", Long.class, ConfirmVendorAllocationRequest.class, AuthenticatedUserPrincipal.class),
                VendorAllocationController.class.getMethod("openReturnSession", Long.class),
                VendorAllocationController.class.getMethod("recordReturns", Long.class, ReturnVendorAllocationSerialsRequest.class),
                VendorAllocationController.class.getMethod("replaceReturns", Long.class, ReplaceVendorAllocationReturnsRequest.class),
                VendorAllocationController.class.getMethod("removeReturn", Long.class, Long.class),
                VendorAllocationController.class.getMethod("reopenReturnInspection", Long.class),
                VendorAllocationController.class.getMethod("settle", Long.class, SettleVendorAllocationRequest.class, AuthenticatedUserPrincipal.class))) {
            PreAuthorize authorization = method.getAnnotation(PreAuthorize.class);
            assertThat(authorization).isNotNull();
            String expected = method.getName().equals("confirm") || method.getName().equals("settle")
                    ? "hasAuthority('streetAgent:manage')"
                    : "hasAuthority('streetAgent:edit')";
            assertThat(authorization.value()).isEqualTo(expected);
        }
    }
}
