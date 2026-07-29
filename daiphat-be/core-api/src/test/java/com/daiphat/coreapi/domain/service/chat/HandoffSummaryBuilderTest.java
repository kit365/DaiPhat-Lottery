package com.daiphat.coreapi.domain.service.chat;

import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.enums.chat.EscalationReason;
import com.daiphat.coreapi.domain.model.enums.chat.MessageSenderType;
import com.daiphat.coreapi.domain.model.enums.chat.MessageType;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class HandoffSummaryBuilderTest {

    @Test
    void build_mapsScheduleTokensAndKeepsCustomerText() {
        List<MessageModel> messages = List.of(
                MessageModel.builder()
                        .senderType(MessageSenderType.CUSTOMER)
                        .type(MessageType.TEXT)
                        .content("muốn xem lịch quay hồ chí minh")
                        .build(),
                MessageModel.builder()
                        .senderType(MessageSenderType.AI_SYSTEM)
                        .type(MessageType.TEXT)
                        .content("SCHEDULE_STATION_BUNDLE:station=18:region=MIEN_NAM")
                        .build()
        );

        String summary = HandoffSummaryBuilder.build(messages, EscalationReason.CUSTOMER_REQUEST);

        assertThat(summary).contains("Khách yêu cầu gặp nhân viên");
        assertThat(summary).contains("muốn xem lịch quay hồ chí minh");
        assertThat(summary).contains("Đã hiển thị lịch quay + kết quả đài theo yêu cầu");
        assertThat(summary).doesNotContain("SCHEDULE_STATION_BUNDLE");
    }
}
