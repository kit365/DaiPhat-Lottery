package com.daiphat.coreapi.application.service.contract;

import com.daiphat.coreapi.application.dto.document.ContractPdfDocument;
import com.daiphat.coreapi.application.dto.request.contract.UpsertContractRequest;
import com.daiphat.coreapi.application.dto.response.contract.ContractResponse;
import com.daiphat.coreapi.application.port.out.contract.ContractRepositoryPort;
import com.daiphat.coreapi.application.port.out.document.ContractPdfRendererPort;
import com.daiphat.coreapi.application.port.out.document.PrizePayoutConfirmationContractHtmlRendererPort;
import com.daiphat.coreapi.application.port.out.document.StreetAgentContractHtmlRendererPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.contract.ContractArticle;
import com.daiphat.coreapi.domain.model.contract.ContractModel;
import com.daiphat.coreapi.domain.model.enums.contract.ContractArticleKind;
import com.daiphat.coreapi.domain.model.enums.contract.ContractType;
import com.daiphat.coreapi.shared.time.VietnamClock;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ContractService")
class ContractServiceTest {

    @Mock
    private ContractRepositoryPort contractRepositoryPort;
    @Mock
    private SystemConfigRepositoryPort systemConfigRepositoryPort;
    @Mock
    private StreetAgentContractHtmlRendererPort streetAgentHtmlRendererPort;
    @Mock
    private PrizePayoutConfirmationContractHtmlRendererPort prizePayoutHtmlRendererPort;
    @Mock
    private ContractPdfRendererPort contractPdfRendererPort;

    private ContractService service;

    @BeforeEach
    void setUp() {
        service = new ContractService(
                contractRepositoryPort,
                systemConfigRepositoryPort,
                streetAgentHtmlRendererPort,
                prizePayoutHtmlRendererPort,
                contractPdfRendererPort,
                new VietnamClock(Clock.fixed(Instant.parse("2026-08-15T03:00:00Z"), ZoneOffset.UTC))
        );
    }

    @Test
    @DisplayName("tạo mới tự đặt default khi type chưa có bản nào")
    void create_setsDefaultWhenFirstOfType() {
        when(contractRepositoryPort.countByType(ContractType.STREET_AGENT_SALES)).thenReturn(0L);
        when(contractRepositoryPort.nextCodeSequence("TPL-SALES-")).thenReturn(2);
        when(contractRepositoryPort.findByCode("TPL-SALES-002")).thenReturn(Optional.empty());
        when(contractRepositoryPort.save(any())).thenAnswer(invocation -> {
            ContractModel model = invocation.getArgument(0);
            model.setId(11L);
            return model;
        });

        ContractResponse response = service.create(request(ContractType.STREET_AGENT_SALES, false));

        ArgumentCaptor<ContractModel> captor = ArgumentCaptor.forClass(ContractModel.class);
        verify(contractRepositoryPort).clearDefaultForType(eq(ContractType.STREET_AGENT_SALES), isNull());
        verify(contractRepositoryPort).save(captor.capture());
        assertThat(captor.getValue().getIsDefault()).isTrue();
        assertThat(captor.getValue().getStaffName()).isEqualTo("Mẫu NV");
        assertThat(response.code()).isEqualTo("TPL-SALES-002");
    }

    @Test
    @DisplayName("không xóa bản đang default")
    void delete_rejectsDefault() {
        when(contractRepositoryPort.findById(5L)).thenReturn(Optional.of(ContractModel.builder()
                .id(5L)
                .type(ContractType.STREET_AGENT_SALES)
                .isDefault(true)
                .build()));

        assertThatThrownBy(() -> service.delete(5L))
                .isInstanceOf(DomainException.class)
                .satisfies(error -> assertThat(((DomainException) error).getErrorCode())
                        .isEqualTo(ErrorCode.CONTRACT_DEFAULT_REQUIRED));
    }

    @Test
    @DisplayName("xem trước PDF giữ placeholder")
    void previewPdf_keepsPlaceholders() {
        when(contractRepositoryPort.findById(9L)).thenReturn(Optional.of(ContractModel.builder()
                .id(9L)
                .code("TPL-SALES-001")
                .type(ContractType.STREET_AGENT_SALES)
                .title("Hợp đồng cộng tác bán vé số")
                .staffName("CTV mặc định")
                .partyARoleLabel("Bên A")
                .partyBRoleLabel("Bên B")
                .partyASignatureLabel("A")
                .partyBSignatureLabel("B")
                .articles(List.of(ContractArticle.builder()
                        .code("SCOPE")
                        .ordinal(1)
                        .title("Điều 1")
                        .kind(ContractArticleKind.TEXT)
                        .body("<p>Từ {{contractStartDate}}</p>")
                        .build()))
                .isDefault(true)
                .active(true)
                .build()));
        when(systemConfigRepositoryPort.findActiveByConfigKey(any())).thenReturn(Optional.empty());
        when(streetAgentHtmlRendererPort.render(any())).thenReturn("<html>{{contractStartDate}}</html>");
        when(contractPdfRendererPort.renderPdf(any())).thenReturn("%PDF".getBytes());

        ContractPdfDocument pdf = service.previewPdf(9L);

        assertThat(pdf.fileName()).contains("TPL-SALES-001");
        verify(streetAgentHtmlRendererPort).render(any());
        verify(contractPdfRendererPort).renderPdf("<html>{{contractStartDate}}</html>");
    }

    private UpsertContractRequest request(ContractType type, boolean isDefault) {
        return new UpsertContractRequest(
                type,
                "Hợp đồng khách",
                "Mẫu NV",
                "Phụ đề",
                "Bên A",
                "Bên B",
                "Đại diện A",
                "Bên B ký",
                "Ghi chú",
                isDefault,
                List.of(new UpsertContractRequest.ArticleRequest(
                        "SCOPE", 1, "Điều 1", ContractArticleKind.TEXT, "<p>Nội dung</p>"))
        );
    }
}
