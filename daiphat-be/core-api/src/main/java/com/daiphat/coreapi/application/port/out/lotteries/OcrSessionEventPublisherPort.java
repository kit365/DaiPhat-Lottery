package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrSessionSocketEvent;

public interface OcrSessionEventPublisherPort {
    void publishToSession(String sessionCode, OcrSessionSocketEvent event);
}
