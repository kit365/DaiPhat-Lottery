package com.daiphat.coreapi.application.service.chat.intent;

import com.daiphat.coreapi.application.config.ChatScheduleProperties;
import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponseDto;
import com.daiphat.coreapi.application.port.in.chat.AiServiceConfigPort;
import com.daiphat.coreapi.application.port.in.chat.ChatAiPort;
import com.daiphat.coreapi.application.service.chat.intent.ChatIntentTestFixtures;
import com.daiphat.coreapi.application.service.chat.intent.JavaKeywordIntentClassifier;
import com.daiphat.coreapi.application.service.chat.intent.ChatIntentClassifier;
import com.daiphat.coreapi.application.service.chat.flow.schedule.ChatScheduleParser;
import com.daiphat.coreapi.application.service.chat.flow.schedule.ChatScheduleStationResolver;
import com.daiphat.coreapi.application.service.chat.flow.schedule.ChatScheduleTestFixtures;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryRegionCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ChatIntentClassifier")
class ChatIntentClassifierTest {

    @Mock
    private ChatAiPort chatAiPort;
    @Mock
    private ChatScheduleStationResolver chatScheduleStationResolver;
    @Mock
    private AiServiceConfigPort aiServiceConfigPort;

    private ChatIntentClassifier classifier;

    @BeforeEach
    void setUp() {
        ChatScheduleProperties properties = ChatScheduleTestFixtures.minimalProperties();
        properties.setIntentKeywords(List.of("lịch quay", "lich quay"));
        properties.getRegions().put(LotteryRegionCode.MIEN_NAM.code(), List.of("miền nam", "mien nam"));

        ChatScheduleStationResolver stationResolver = org.mockito.Mockito.mock(ChatScheduleStationResolver.class);
        ChatScheduleParser scheduleParser = ChatScheduleTestFixtures.parser(properties, stationResolver);
        org.mockito.Mockito.lenient()
                .when(aiServiceConfigPort.isIntentEnabled(org.mockito.ArgumentMatchers.any()))
                .thenReturn(true);
        when(aiServiceConfigPort.confidence(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenAnswer(invocation -> switch ((ChatIntent) invocation.getArgument(0)) {
                    case WEB_ACCOUNT -> 0.92;
                    case WEB_SCHEDULE -> 0.88;
                    case WEB_RESULT -> 0.85;
                    case ESCALATE_REQUEST -> 0.95;
                    case TRASH_TALK -> 0.90;
                    case OTHER_KNOWLEDGE -> 0.82;
                    default -> 0.30;
                });
        JavaKeywordIntentClassifier javaClassifier = new JavaKeywordIntentClassifier(
                ChatIntentTestFixtures.minimalProperties(),
                aiServiceConfigPort,
                scheduleParser,
                stationResolver
        );

        classifier = new ChatIntentClassifier(javaClassifier, chatAiPort, aiServiceConfigPort, 0.7);
    }

    @Test
    void classify_whenJavaConfident_doesNotCallRemote() {
        ChatClassifyResponseDto result = classifier.classify("lịch quay", 1L);

        assertThat(result.getIntent()).isEqualTo(ChatIntent.WEB_SCHEDULE.name());
        assertThat(result.getConfidence()).isGreaterThanOrEqualTo(0.7);
        verify(chatAiPort, never()).classifyMessage(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void classify_whenJavaUnknown_fallsBackToRemote() {
        ChatClassifyResponseDto remoteResult = ChatClassifyResponseDto.builder()
                .intent("WEB_RESULT")
                .confidence(0.8)
                .build();
        when(chatAiPort.isEnabled()).thenReturn(true);
        when(chatAiPort.classifyMessage("xyz random", 2L)).thenReturn(remoteResult);

        ChatClassifyResponseDto result = classifier.classify("xyz random", 2L);

        assertThat(result).isSameAs(remoteResult);
        verify(chatAiPort).classifyMessage("xyz random", 2L);
    }

    @Test
    void classify_whenAiDisabled_stillUsesJavaKeywordWithoutPython() {
        when(chatAiPort.isEnabled()).thenReturn(false);

        ChatClassifyResponseDto confident = classifier.classify("lịch quay", 1L);
        ChatClassifyResponseDto uncertain = classifier.classify("???", 6L);

        assertThat(confident.getIntent()).isEqualTo(ChatIntent.WEB_SCHEDULE.name());
        assertThat(uncertain.getIntent()).isEqualTo(ChatIntent.UNKNOWN.name());
        verify(chatAiPort, never()).classifyMessage(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void classify_traCuuDai_mapsToWebScheduleWithoutEscalation() {
        ChatClassifyResponseDto result = classifier.classify("tra cứu đài", 4L);

        assertThat(result.getIntent()).isEqualTo(ChatIntent.WEB_SCHEDULE.name());
        assertThat(result.getConfidence()).isGreaterThanOrEqualTo(0.7);
        verify(chatAiPort, never()).classifyMessage(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void classify_traCuuDonHang_staysAccountNotSchedule() {
        ChatClassifyResponseDto result = classifier.classify("tra cứu đơn hàng", 5L);

        assertThat(result.getIntent()).isEqualTo(ChatIntent.WEB_ACCOUNT.name());
    }

    @Test
    void classify_slotAnswerTatCa_mapsToWebScheduleRegardlessOfCase() {
        ChatClassifyResponseDto lower = classifier.classify("Tất cả", 7L);
        ChatClassifyResponseDto upper = classifier.classify("TẤT CẢ", 8L);

        assertThat(lower.getIntent()).isEqualTo(ChatIntent.WEB_SCHEDULE.name());
        assertThat(upper.getIntent()).isEqualTo(ChatIntent.WEB_SCHEDULE.name());
    }

    @Test
    void classify_uppercaseScheduleWithDate_mapsToWebSchedule() {
        ChatClassifyResponseDto result = classifier.classify("XEM LỊCH QUAY NGÀY 20/2", 9L);

        assertThat(result.getIntent()).isEqualTo(ChatIntent.WEB_SCHEDULE.name());
        assertThat(result.getEntities()).containsKey("drawDate");
    }

    @Test
    void classify_whenJavaAndRemoteFail_returnsNull() {
        when(chatAiPort.isEnabled()).thenReturn(true);
        when(chatAiPort.classifyMessage("???", 3L)).thenReturn(null);

        ChatClassifyResponseDto result = classifier.classify("???", 3L);

        assertThat(result).isNull();
    }
}
