package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchResponse;
import com.daiphat.coreapi.application.port.in.lotteries.ImportBatchServicePort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ImportBatchController active-draft tests")
class ImportBatchControllerTest {

    private static final UUID OPERATOR_ID = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

    @Mock
    private ImportBatchServicePort importBatchServicePort;

    @InjectMocks
    private ImportBatchController importBatchController;

    @Test
    @DisplayName("GET /active-draft returns 200 with draft when present")
    void getActiveDraft_whenDraftExists_returnsOkWithData() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(OPERATOR_ID, "operator");
        ImportBatchResponse draft = ImportBatchResponse.builder()
                .id(10L)
                .drawDate(LocalDate.now())
                .status(ImportBatchStatus.DRAFT)
                .lines(List.of())
                .build();

        when(importBatchServicePort.getActiveDraft(OPERATOR_ID)).thenReturn(Optional.of(draft));

        ResponseEntity<ApiResponse<ImportBatchResponse>> response =
                importBatchController.getActiveDraft(principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(response.getBody().getData()).isEqualTo(draft);
        verify(importBatchServicePort).getActiveDraft(OPERATOR_ID);
    }

    @Test
    @DisplayName("GET /active-draft returns 200 with null data when no draft exists")
    void getActiveDraft_whenNoDraft_returnsOkWithNullData() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(OPERATOR_ID, "operator");
        when(importBatchServicePort.getActiveDraft(OPERATOR_ID)).thenReturn(Optional.empty());

        ResponseEntity<ApiResponse<ImportBatchResponse>> response =
                importBatchController.getActiveDraft(principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(response.getBody().getData()).isNull();
        assertThat(response.getBody().getMessage()).isEqualTo("No active draft import batch found.");
    }

    @Test
    @DisplayName("GET /active-draft rejects unauthenticated requests")
    void getActiveDraft_whenPrincipalMissing_throwsUnauthorized() {
        assertThatThrownBy(() -> importBatchController.getActiveDraft(null))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.UNAUTHORIZED);
    }
}
