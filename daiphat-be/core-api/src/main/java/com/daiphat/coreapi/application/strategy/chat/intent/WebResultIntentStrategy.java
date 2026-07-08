package com.daiphat.coreapi.application.strategy.chat.intent;

import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentContext;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultBoardSummaryResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultResponse;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryResultServicePort;
import com.daiphat.coreapi.application.service.chat.flow.schedule.ChatScheduleParser;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryRegionCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Component("WEB_RESULT")
@RequiredArgsConstructor
public class WebResultIntentStrategy implements ChatIntentHandlerStrategy {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final LotteryResultServicePort lotteryResultServicePort;
    private final ChatScheduleParser chatScheduleParser;

    @Override
    public ChatIntent supportedIntent() {
        return ChatIntent.WEB_RESULT;
    }

    @Override
    public ChatIntentOutcome resolve(ChatIntentContext ctx) {
        String reply = buildReply(ctx);
        return new ChatIntentOutcome.BotReply(reply, ChatIntent.WEB_RESULT.name());
    }

    private String buildReply(ChatIntentContext ctx) {
        Map<String, String> entities = ctx.getClassification().getEntities();
        String ticketNumber = entities != null ? entities.get("ticket_number") : null;
        String message = ctx.getCustomerMessage().getContent() == null ? "" : ctx.getCustomerMessage().getContent();
        String region = entities != null ? entities.get("region") : null;
        if (region == null || region.isBlank()) {
            region = chatScheduleParser.findRegionCode(message);
        }
        if (region == null || region.isBlank()) {
            region = LotteryRegionCode.DEFAULT_VALUE;
        }
        region = LotteryRegionCode.normalize(region);

        try {
            LotteryResultBoardSummaryResponse summary = lotteryResultServicePort.getBoardSummary(
                    region,
                    LocalDate.now()
            );
            return formatSummary(summary, ticketNumber);
        } catch (DomainException ex) {
            log.warn("Unable to fetch lottery board summary for region {}", region, ex);
            return helpfulFallback(ticketNumber);
        } catch (Exception ex) {
            log.warn("Unexpected error fetching lottery results", ex);
            return helpfulFallback(ticketNumber);
        }
    }

    private String formatSummary(LotteryResultBoardSummaryResponse summary, String ticketNumber) {
        if (summary.results() == null || summary.results().isEmpty()) {
            return helpfulFallback(ticketNumber);
        }

        String stations = summary.results().stream()
                .map(LotteryResultResponse::stationName)
                .filter(name -> name != null && !name.isBlank())
                .collect(Collectors.joining(", "));

        StringBuilder reply = new StringBuilder();
        reply.append("Kết quả xổ số ")
                .append(formatRegionLabel(summary.region()))
                .append(" ngày ")
                .append(summary.drawDate().format(DATE_FORMAT))
                .append(" đã có dữ liệu");
        if (!stations.isBlank()) {
            reply.append(" (").append(stations).append(")");
        }
        reply.append(".");

        if (ticketNumber != null && !ticketNumber.isBlank()) {
            reply.append(" Vé ").append(ticketNumber)
                    .append(" — bạn có thể dò chi tiết trên trang Kết quả xổ số.");
        } else {
            reply.append(" Bạn có thể xem chi tiết giải trên trang Kết quả xổ số hoặc gửi số vé để được hướng dẫn dò.");
        }
        return reply.toString();
    }

    private String helpfulFallback(String ticketNumber) {
        if (ticketNumber != null && !ticketNumber.isBlank()) {
            return "Đại Phát đã ghi nhận vé " + ticketNumber
                    + ". Bạn vui lòng vào mục Kết quả xổ số trên website để dò vé, hoặc nhắn thêm miền (Nam/Trung/Bắc) để được hỗ trợ cụ thể hơn.";
        }
        return "Bạn có thể xem kết quả xổ số trên trang Kết quả của Đại Phát. Gửi số vé (5–6 chữ số) hoặc miền (Nam/Trung/Bắc) để được hỗ trợ dò vé.";
    }

    private String formatRegionLabel(String regionCode) {
        return LotteryRegionCode.fromCode(regionCode)
                .map(LotteryRegionCode::displayName)
                .orElse(regionCode != null ? regionCode : "");
    }
}
