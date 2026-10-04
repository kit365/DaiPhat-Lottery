package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrSessionSocketEvent;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.lotteries.OcrSessionEventPublisherPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;

import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class OcrSessionServiceTest {
    private final StoragePort storage = mock(StoragePort.class);
    private final OcrSessionEventPublisherPort publisher = mock(OcrSessionEventPublisherPort.class);
    private final OcrSessionService service = new OcrSessionService(storage, publisher);
    private final UUID user = UUID.randomUUID();

    @Test
    void uploadSharesImageWithoutScanResultsAndPollingRecoversBothImages() {
        String code = service.createSession(null, user, "admin").sessionCode();
        when(storage.upload(any())).thenReturn(new StorageResult("photo", "https://images.example/photo.jpg"));
        var file = new MockMultipartFile("file", "ticket.jpg", "image/jpeg", new byte[]{1, 2, 3});

        var first = service.uploadImage(code, file, user);
        var second = service.uploadImage(code, file, user);

        assertThat(first.imageUrl()).isEqualTo("https://images.example/photo.jpg");
        assertThat(first.fileName()).isEqualTo("ticket.jpg");
        assertThat(second.id()).isNotEqualTo(first.id());
        var snapshot = service.getSession(code);
        assertThat(snapshot.images()).containsExactly(first, second);
        assertThat(snapshot.scannedTicketCount()).isEqualTo(2);
        var events = ArgumentCaptor.forClass(OcrSessionSocketEvent.class);
        verify(publisher, times(2)).publishToSession(eq(code), events.capture());
        assertThat(events.getAllValues()).allSatisfy(event -> {
            assertThat(event.eventType()).isEqualTo("IMAGE_UPLOADED");
            assertThat(event.tickets()).isNull();
            assertThat(event.scanId()).isNull();
            assertThat(event.image()).isNotNull();
        });
    }

    @Test
    void rejectsNonImagesWithoutStoringOrPublishing() {
        String code = service.createSession(null, user, "admin").sessionCode();
        var file = new MockMultipartFile("file", "data.txt", "text/plain", new byte[]{1});
        assertThatThrownBy(() -> service.uploadImage(code, file, user)).isInstanceOf(DomainException.class);
        verifyNoInteractions(storage, publisher);
        assertThat(service.getSession(code).images()).isEmpty();
    }

    @Test
    void failedUploadDoesNotAppearInTheQueue() {
        String code = service.createSession(null, user, "admin").sessionCode();
        when(storage.upload(any())).thenThrow(new IllegalStateException("storage unavailable"));
        var file = new MockMultipartFile("file", "ticket.jpg", "image/jpeg", new byte[]{1});
        assertThatThrownBy(() -> service.uploadImage(code, file, user)).isInstanceOf(IllegalStateException.class);
        assertThat(service.getSession(code).images()).isEmpty();
        verifyNoInteractions(publisher);
    }
}
