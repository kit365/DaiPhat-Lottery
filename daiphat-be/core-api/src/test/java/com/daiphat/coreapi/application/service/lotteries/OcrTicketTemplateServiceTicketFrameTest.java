package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.scan.CreateOcrFieldLayoutRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.UpdateOcrFieldLayoutRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrFieldLayoutResponse;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.OcrFieldLayoutRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.OcrFieldValidationRuleRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.OcrTicketTemplateRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrFieldDataType;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import com.daiphat.coreapi.domain.model.lotteries.OcrFieldLayoutModel;
import com.daiphat.coreapi.domain.model.lotteries.OcrNormalizedBoundingBox;
import com.daiphat.coreapi.domain.model.lotteries.OcrTicketTemplateModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OcrTicketTemplateServiceTicketFrameTest {

    private static final Long TEMPLATE_ID = 7L;

    @Mock
    private OcrTicketTemplateRepositoryPort templateRepositoryPort;
    @Mock
    private OcrFieldLayoutRepositoryPort fieldLayoutRepositoryPort;
    @Mock
    private OcrFieldValidationRuleRepositoryPort validationRuleRepositoryPort;
    @Mock
    private LotteryStationRepositoryPort lotteryStationRepositoryPort;
    @Mock
    private StoragePort storagePort;

    @InjectMocks
    private OcrTicketTemplateService service;

    @BeforeEach
    void setUp() {
        when(templateRepositoryPort.findById(TEMPLATE_ID))
                .thenReturn(Optional.of(OcrTicketTemplateModel.builder().id(TEMPLATE_ID).build()));
    }

    private static OcrNormalizedBoundingBox box(double x, double y, double w, double h) {
        return new OcrNormalizedBoundingBox(x, y, w, h);
    }

    private static OcrFieldLayoutModel layout(Long id, OcrTemplateFieldName name, OcrNormalizedBoundingBox box) {
        return OcrFieldLayoutModel.builder()
                .id(id)
                .templateId(TEMPLATE_ID)
                .fieldName(name)
                .boundingBox(box)
                .priority(1)
                .required(true)
                .build();
    }

    private static CreateOcrFieldLayoutRequest create(OcrTemplateFieldName name, OcrNormalizedBoundingBox box) {
        return new CreateOcrFieldLayoutRequest(name, box, OcrFieldDataType.STRING, true, null);
    }

    @Test
    void createsFrameAsOptionalPriorityOneLayout() {
        when(fieldLayoutRepositoryPort.findByTemplateId(TEMPLATE_ID)).thenReturn(List.of());
        when(fieldLayoutRepositoryPort.existsByTemplateIdAndFieldNameAndPriority(any(), any(), eq(1)))
                .thenReturn(false);
        when(fieldLayoutRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));

        OcrFieldLayoutResponse saved = service.createFieldLayout(
                TEMPLATE_ID, create(OcrTemplateFieldName.ticketFrame, box(0.2, 0.3, 0.6, 0.4)));

        assertThat(saved.fieldName()).isEqualTo(OcrTemplateFieldName.ticketFrame);
        assertThat(saved.priority()).isEqualTo(1);
        assertThat(saved.isRequired()).isFalse();
    }

    @Test
    void rejectsSecondFrame() {
        when(fieldLayoutRepositoryPort.findByTemplateId(TEMPLATE_ID)).thenReturn(List.of(
                layout(1L, OcrTemplateFieldName.ticketFrame, box(0.2, 0.3, 0.6, 0.4))
        ));

        assertThatThrownBy(() -> service.createFieldLayout(
                TEMPLATE_ID, create(OcrTemplateFieldName.ticketFrame, box(0.1, 0.1, 0.5, 0.5))))
                .isInstanceOf(DomainException.class)
                .extracting(e -> ((DomainException) e).getInternalMessage()).asString().contains("một Khung vé");
        verify(fieldLayoutRepositoryPort, never()).save(any());
    }

    @Test
    void rejectsFieldOutsideFrame() {
        when(fieldLayoutRepositoryPort.findByTemplateId(TEMPLATE_ID)).thenReturn(List.of(
                layout(1L, OcrTemplateFieldName.ticketFrame, box(0.2, 0.3, 0.6, 0.4))
        ));

        assertThatThrownBy(() -> service.createFieldLayout(
                TEMPLATE_ID, create(OcrTemplateFieldName.serialNumber, box(0.02, 0.05, 0.1, 0.05))))
                .isInstanceOf(DomainException.class)
                .extracting(e -> ((DomainException) e).getInternalMessage()).asString().contains("ngoài Khung vé");
        verify(fieldLayoutRepositoryPort, never()).save(any());
    }

    @Test
    void acceptsFieldInsideFrame() {
        when(fieldLayoutRepositoryPort.findByTemplateId(TEMPLATE_ID)).thenReturn(List.of(
                layout(1L, OcrTemplateFieldName.ticketFrame, box(0.2, 0.3, 0.6, 0.4))
        ));
        when(fieldLayoutRepositoryPort.findMaxPriority(TEMPLATE_ID, OcrTemplateFieldName.numbers)).thenReturn(0);
        when(fieldLayoutRepositoryPort.existsByTemplateIdAndFieldNameAndPriority(any(), any(), eq(1)))
                .thenReturn(false);
        when(fieldLayoutRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));

        OcrFieldLayoutResponse saved = service.createFieldLayout(
                TEMPLATE_ID, create(OcrTemplateFieldName.numbers, box(0.26, 0.48, 0.48, 0.08)));

        assertThat(saved.fieldName()).isEqualTo(OcrTemplateFieldName.numbers);
    }

    @Test
    void rejectsShrinkingFrameAwayFromExistingFields() {
        OcrFieldLayoutModel frame = layout(1L, OcrTemplateFieldName.ticketFrame, box(0.2, 0.3, 0.6, 0.4));
        frame.setRequired(false);
        when(fieldLayoutRepositoryPort.findById(1L)).thenReturn(Optional.of(frame));
        when(fieldLayoutRepositoryPort.findByTemplateId(TEMPLATE_ID)).thenReturn(List.of(
                frame,
                layout(2L, OcrTemplateFieldName.numbers, box(0.26, 0.48, 0.48, 0.08))
        ));

        assertThatThrownBy(() -> service.updateFieldLayout(
                TEMPLATE_ID, 1L,
                new UpdateOcrFieldLayoutRequest(null, box(0.2, 0.3, 0.3, 0.1), null, null, null)))
                .isInstanceOf(DomainException.class)
                .extracting(e -> ((DomainException) e).getInternalMessage()).asString().contains("numbers #1");
        verify(fieldLayoutRepositoryPort, never()).save(any());
    }
}
