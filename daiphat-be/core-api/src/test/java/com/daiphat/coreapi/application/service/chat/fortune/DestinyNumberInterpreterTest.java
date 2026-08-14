package com.daiphat.coreapi.application.service.chat.fortune;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("DestinyNumberInterpreter")
class DestinyNumberInterpreterTest {

    private final DestinyNumberInterpreter interpreter = new DestinyNumberInterpreter();

    @Test
    void interpret_libra_returnsCuratedSuffixes() {
        var result = interpreter.interpret("tôi là cung thiên bình thì nên mua số gì");

        assertThat(result).isPresent();
        assertThat(result.get().symbol()).contains("Thiên Bình");
        assertThat(result.get().luckyNumbers()).containsExactly("07", "16", "25", "34");
        assertThat(result.get().reply()).contains("tham khảo");
    }

    @Test
    void interpret_metalElement_returnsCuratedSuffixes() {
        var result = interpreter.interpret("mệnh Kim hợp số nào");

        assertThat(result).isPresent();
        assertThat(result.get().luckyNumbers()).contains("04", "09");
    }

    @Test
    void interpret_ratZodiacYear_returnsCuratedSuffixes() {
        var result = interpreter.interpret("tuổi Tý nên chọn đuôi số gì");

        assertThat(result).isPresent();
        assertThat(result.get().luckyNumbers()).contains("01", "11");
    }

    @Test
    void interpret_topicWithoutSymbol_asksForDetail() {
        var result = interpreter.interpret("tôi muốn gợi ý theo cung hoàng đạo");

        assertThat(result).isPresent();
        assertThat(result.get().luckyNumbers()).isEmpty();
        assertThat(result.get().reply()).contains("cung Thiên Bình");
    }

    @Test
    void matchesCue_detectsZodiacName() {
        assertThat(interpreter.matchesCue("thien binh nen mua so gi")).isTrue();
        assertThat(interpreter.matchesCue("xem lich quay")).isFalse();
    }
}
