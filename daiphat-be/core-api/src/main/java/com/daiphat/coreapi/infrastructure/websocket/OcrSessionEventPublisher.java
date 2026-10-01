package com.daiphat.coreapi.infrastructure.websocket;

import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrSessionSocketEvent;
import com.daiphat.coreapi.application.port.out.lotteries.OcrSessionEventPublisherPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class OcrSessionEventPublisher implements OcrSessionEventPublisherPort {

    private final SimpMessagingTemplate simpMessagingTemplate;

    @Override
    public void publishToSession(String sessionCode, OcrSessionSocketEvent event) {
        String topic = WebSocketDestinationConstants.ocrSessionTopic(sessionCode);
        log.info("Broadcasting OCR session event type={} to topic={}", event.eventType(), topic);
        simpMessagingTemplate.convertAndSend(topic, event);
    }
}
