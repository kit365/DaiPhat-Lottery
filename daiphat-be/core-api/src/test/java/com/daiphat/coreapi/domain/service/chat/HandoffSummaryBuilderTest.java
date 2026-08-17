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

    @Test
    void build_stripsExcludeParamsAndDedupesSuggestAsks() {
        List<MessageModel> messages = List.of(
                MessageModel.builder()
                        .senderType(MessageSenderType.CUSTOMER)
                        .type(MessageType.TEXT)
                        .content("gợi ý vé số cho tôi")
                        .build(),
                MessageModel.builder()
                        .senderType(MessageSenderType.CUSTOMER)
                        .type(MessageType.TEXT)
                        .content("gợi ý vé số cho tôi|exclude=8288,8289,8290")
                        .build(),
                MessageModel.builder()
                        .senderType(MessageSenderType.CUSTOMER)
                        .type(MessageType.TEXT)
                        .content("gợi ý vé số cho tôi|exclude=8288,8289,8290,8291")
                        .build(),
                MessageModel.builder()
                        .senderType(MessageSenderType.AI_SYSTEM)
                        .type(MessageType.TEXT)
                        .content("Dưới đây là 5 vé đang bán cho kỳ quay sắp tới dành cho quý khách:\n\nTICKET_SUGGEST:[{\"id\":1,\"numbers\":\"701001\",\"stationName\":\"Tây Ninh\",\"price\":10000}]")
                        .build()
        );

        String summary = HandoffSummaryBuilder.build(messages, EscalationReason.CUSTOMER_REQUEST);

        assertThat(summary).contains("Hỏi gợi ý vé số (3 lần)");
        assertThat(summary).contains("Đã gợi ý 1 vé số đang bán");
        assertThat(summary).doesNotContain("exclude=");
        assertThat(summary).doesNotContain("TICKET_SUGGEST");
        assertThat(summary).doesNotContain("701001");
    }

    @Test
    void stripInternalParams_removesExcludeSuffix() {
        assertThat(HandoffSummaryBuilder.stripInternalParams("gợi ý vé số cho tôi|exclude=1,2,3"))
                .isEqualTo("gợi ý vé số cho tôi");
    }
}
