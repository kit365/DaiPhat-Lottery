package com.daiphat.coreapi.application.listener;

import com.daiphat.coreapi.application.event.LotteryStationChangedEvent;
import com.daiphat.coreapi.application.service.chat.flow.schedule.ChatScheduleStationResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ChatScheduleStationAliasIndexListener {

    private final ChatScheduleStationResolver stationResolver;

    @EventListener
    public void handleLotteryStationChanged(LotteryStationChangedEvent event) {
        log.debug("Rebuilding chat schedule station index after station change: {}", event.stationId());
        stationResolver.rebuild();
    }
}
