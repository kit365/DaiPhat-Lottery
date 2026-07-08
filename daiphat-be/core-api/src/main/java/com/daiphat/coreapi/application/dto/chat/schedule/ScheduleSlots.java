package com.daiphat.coreapi.application.dto.chat.schedule;

import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.*;

public record ScheduleSlots(
        String stationId,
        String stationIds,
        String region,
        String scope,
        String drawDate,
        String dateMode
) {
    public static ScheduleSlots from(ConversationModel conversation) {
        return new ScheduleSlots(
                conversation.collectedSlot(SLOT_STATION_ID),
                conversation.collectedSlot(SLOT_STATION_IDS),
                conversation.collectedSlot(SLOT_REGION),
                conversation.collectedSlot(SLOT_SCOPE),
                conversation.collectedSlot(SLOT_DRAW_DATE),
                conversation.collectedSlot(SLOT_DATE_MODE)
        );
    }

    public boolean hasStation() {
        return stationId != null || (stationIds != null && !stationIds.isBlank());
    }

    public boolean hasLocation() {
        return hasStation() || region != null || SCOPE_NATION_ALL.equals(scope);
    }

    public boolean hasDate() {
        return (drawDate != null && !drawDate.isBlank())
                || (dateMode != null && !dateMode.isBlank());
    }
}
