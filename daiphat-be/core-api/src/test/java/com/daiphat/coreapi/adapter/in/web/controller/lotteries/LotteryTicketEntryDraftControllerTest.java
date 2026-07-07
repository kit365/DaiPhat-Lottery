package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.lotteries.SaveLotteryTicketEntryDraftRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.TicketEntryDraftSectionPayload;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketEntryDraftResponse;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketEntryDraftServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("LotteryTicketController entry-draft tests")
class LotteryTicketEntryDraftControllerTest {

    private static final UUID OPERATOR_ID = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

    @Mock
    private LotteryTicketServicePort lotteryTicketServicePort;
    @Mock
    private LotteryTicketEntryDraftServicePort lotteryTicketEntryDraftServicePort;

    @InjectMocks
    private LotteryTicketController lotteryTicketController;

    @Test
    @DisplayName("PUT /entry-drafts delegates to service")
    void saveEntryDraft_delegatesToService() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(OPERATOR_ID, "operator");
        var request = new SaveLotteryTicketEntryDraftRequest(
                1L,
                List.of(new TicketEntryDraftSectionPayload("123456", List.of()))
        );
        var response = new LotteryTicketEntryDraftResponse(1L, request.ticketSections(), LocalDateTime.now());
        when(lotteryTicketEntryDraftServicePort.upsert(request, OPERATOR_ID)).thenReturn(response);

        ApiResponse<LotteryTicketEntryDraftResponse> apiResponse =
                lotteryTicketController.saveEntryDraft(request, principal);

        assertThat(apiResponse.isSuccess()).isTrue();
        assertThat(apiResponse.getData()).isEqualTo(response);
        verify(lotteryTicketEntryDraftServicePort).upsert(request, OPERATOR_ID);
    }

    @Test
    @DisplayName("GET /entry-drafts returns drafts for batch")
    void getEntryDrafts_returnsDrafts() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(OPERATOR_ID, "operator");
        var drafts = List.of(new LotteryTicketEntryDraftResponse(
                1L,
                List.of(new TicketEntryDraftSectionPayload("123456", List.of())),
                LocalDateTime.now()
        ));
        when(lotteryTicketEntryDraftServicePort.getByImportBatchId(10L, OPERATOR_ID)).thenReturn(drafts);

        ApiResponse<List<LotteryTicketEntryDraftResponse>> apiResponse =
                lotteryTicketController.getEntryDrafts(10L, principal);

        assertThat(apiResponse.getData()).isEqualTo(drafts);
    }

    @Test
    @DisplayName("GET /by-import-batch-line delegates to service")
    void getImportedByImportBatchLine_delegatesToService() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(OPERATOR_ID, "operator");
        when(lotteryTicketServicePort.getImportedByImportBatchLineId(1L, OPERATOR_ID)).thenReturn(List.of());

        var apiResponse = lotteryTicketController.getImportedByImportBatchLine(1L, principal);

        assertThat(apiResponse.getValue()).isNotNull();
        verify(lotteryTicketServicePort).getImportedByImportBatchLineId(1L, OPERATOR_ID);
    }
}
