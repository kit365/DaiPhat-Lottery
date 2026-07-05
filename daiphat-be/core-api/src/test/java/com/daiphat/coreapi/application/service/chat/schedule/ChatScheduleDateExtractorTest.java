package com.daiphat.coreapi.application.service.chat.schedule;

import com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleDateExtraction;
import com.daiphat.coreapi.application.config.ChatScheduleProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
@DisplayName("ChatScheduleParser — date")
class ChatScheduleDateExtractorTest {

    @Mock
    private ChatScheduleStationResolver stationResolver;

    private ChatScheduleParser parser;

    @BeforeEach
    void setUp() {
        ChatScheduleProperties properties = ChatScheduleTestFixtures.minimalProperties();
        properties.getWeekdays().put("SATURDAY", List.of("thu 7", "thu 7"));
        properties.getRelativeDays().put("TODAY", List.of("hom nay", "hnay"));
        properties.getRelativeDays().put("TOMORROW", List.of("ngay mai"));
        parser = ChatScheduleTestFixtures.parser(properties, stationResolver);
    }

    @Test
    void extract_relativeToday() {
        assertThat(parser.extractDate("lịch quay hôm nay")).contains(LocalDate.now());
    }

    @Test
    void extract_relativeTomorrow() {
        assertThat(parser.extractDate("ngày mai")).contains(LocalDate.now().plusDays(1));
    }

    @Test
    void extract_weekday() {
        LocalDate saturday = ChatScheduleParser.nextOrSame(LocalDate.now(), DayOfWeek.SATURDAY);
        assertThat(parser.extractDate("thứ 7")).contains(saturday);
    }

    @Test
    void extract_explicitDate() {
        assertThat(parser.extractDate("lịch 04/07/2026")).contains(LocalDate.of(2026, 7, 4));
    }

    @Test
    void extract_unknown_returnsEmpty() {
        assertThat(parser.extractDate("xin chào")).isEmpty();
    }

    @Test
    void extractExtraction_tatCaNgay() {
        ChatScheduleDateExtraction extraction = parser.extractExtraction("Tất cả ngày");
        assertThat(extraction.mode()).isEqualTo(com.daiphat.coreapi.domain.model.enums.chat.ChatScheduleDateMode.ALL_DAYS);
        assertThat(extraction.resolvedDate()).isEmpty();
    }

    @Test
    void extractExtraction_allDays() {
        ChatScheduleDateExtraction extraction = parser.extractExtraction("lịch tất cả ngày trong tuần");
        assertThat(extraction.mode()).isEqualTo(com.daiphat.coreapi.domain.model.enums.chat.ChatScheduleDateMode.ALL_DAYS);
        assertThat(extraction.resolvedDate()).isEmpty();
    }

    @Test
    void extractExtraction_bareScheduleIntent_returnsEmpty() {
        ChatScheduleDateExtraction extraction = parser.extractExtraction("lịch mở thưởng");
        assertThat(extraction.mode()).isNull();
        assertThat(extraction.invalidDateAttempt()).isFalse();
        assertThat(extraction.resolvedDate()).isEmpty();
    }

    @Test
    void extractExtraction_uppercaseShortDateAfterNormalization() {
        ChatScheduleDateExtraction extraction = parser.extractExtraction("XEM LỊCH QUAY NGÀY 20/2");
        assertThat(extraction.mode()).isEqualTo(com.daiphat.coreapi.domain.model.enums.chat.ChatScheduleDateMode.SPECIFIC_DATE);
        assertThat(extraction.resolvedDate()).isPresent();
        assertThat(extraction.resolvedDate().get().getMonthValue()).isEqualTo(2);
        assertThat(extraction.resolvedDate().get().getDayOfMonth()).isEqualTo(20);
    }

    @Test
    void extractExtraction_scheduleIntentWithWeekday_stillExtracts() {
        LocalDate saturday = ChatScheduleParser.nextOrSame(LocalDate.now(), DayOfWeek.SATURDAY);
        ChatScheduleDateExtraction extraction = parser.extractExtraction("lịch quay thứ 7");
        assertThat(extraction.resolvedDate()).contains(saturday);
    }

    @Test
    void extractExtraction_invalidDate() {
        ChatScheduleDateExtraction extraction = parser.extractExtraction("lịch 30/2");
        assertThat(extraction.invalidDateAttempt()).isTrue();
    }
}
