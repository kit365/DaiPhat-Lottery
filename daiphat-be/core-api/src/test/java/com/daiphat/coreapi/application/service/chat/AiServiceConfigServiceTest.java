package com.daiphat.coreapi.application.service.chat;

import com.daiphat.coreapi.application.port.out.chat.AiServiceConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.model.chat.AiServiceConfigModel;
import com.daiphat.coreapi.domain.model.enums.chat.AiServiceName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiServiceConfigServiceTest {

    @Mock
    private AiServiceConfigRepositoryPort repositoryPort;

    private AiServiceConfigService service;

    @BeforeEach
    void setUp() {
        service = new AiServiceConfigService(repositoryPort);
    }

    @Test
    void updateChatbotEnabledPersistsAndReturnsUpdatedState() {
        AiServiceConfigModel updated = AiServiceConfigModel.builder()
                .serviceName(AiServiceName.CHATBOT)
                .active(true)
                .enabled(false)
                .build();
        when(repositoryPort.updateEnabled(AiServiceName.CHATBOT, false))
                .thenReturn(Optional.of(updated));

        AiServiceConfigModel result = service.updateChatbotEnabled(false);

        assertThat(result.getEnabled()).isFalse();
        assertThat(result.isUsable()).isFalse();
        verify(repositoryPort).updateEnabled(AiServiceName.CHATBOT, false);
    }

    @Test
    void updateChatbotEnabledFailsWhenActiveConfigDoesNotExist() {
        when(repositoryPort.updateEnabled(AiServiceName.CHATBOT, true))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateChatbotEnabled(true))
                .isInstanceOf(DomainException.class);
    }
}
