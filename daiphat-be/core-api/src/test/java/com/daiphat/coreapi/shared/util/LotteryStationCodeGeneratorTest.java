package com.daiphat.coreapi.shared.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class LotteryStationCodeGeneratorTest {

    private final LotteryStationCodeGenerator generator = new LotteryStationCodeGenerator();

    @ParameterizedTest
    @CsvSource({
            "'Tiền Giang', TG",
            "'Kiên Giang', KG",
            "'Vĩnh Long', VL",
            "'Đà Lạt', DL",
            "'TP. Hồ Chí Minh', THCM",
            "'Bà Rịa - Vũng Tàu', BRVT"
    })
    @DisplayName("A station code is the initials of its name")
    void baseCode_usesInitials(String name, String expected) {
        assertThat(generator.baseCode(name)).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource({
            "'XSKT Tiền Giang', TG",
            "'Xổ số kiến thiết Tiền Giang', TG",
            "'Đài Tiền Giang', TG"
    })
    @DisplayName("The supplier prefix is dropped, so codes stay meaningful")
    void baseCode_ignoresPrefix(String name, String expected) {
        assertThat(generator.baseCode(name)).isEqualTo(expected);
    }

    @Test
    @DisplayName("A single-word name falls back to its opening letters")
    void baseCode_singleWord() {
        assertThat(generator.baseCode("Vietlott")).isEqualTo("VIE");
    }

    @Test
    @DisplayName("A name with no letters yields no code")
    void baseCode_rejectsEmpty() {
        assertThat(generator.baseCode("   ")).isNull();
        assertThat(generator.baseCode(null)).isNull();
    }

    @Test
    @DisplayName("A taken code gets a numeric suffix instead of colliding")
    void generate_avoidsCollision() {
        Set<String> taken = Set.of("TG", "TG2");

        assertThat(generator.generate("Tiền Giang", taken::contains)).isEqualTo("TG3");
    }

    @Test
    @DisplayName("A free code is returned unchanged")
    void generate_returnsBaseWhenFree() {
        assertThat(generator.generate("Tiền Giang", code -> false)).isEqualTo("TG");
    }

    @Test
    @DisplayName("Operator-typed codes are upper-cased and stripped of punctuation")
    void normalize_cleansOperatorInput() {
        assertThat(generator.normalize(" tg ")).isEqualTo("TG");
        assertThat(generator.normalize("xs-tg")).isEqualTo("XS-TG");
        assertThat(generator.normalize("tg 01")).isEqualTo("TG01");
        assertThat(generator.normalize("  ")).isNull();
        assertThat(generator.normalize(null)).isNull();
    }

    @Test
    @DisplayName("A code never exceeds the column length")
    void normalize_trimsToColumnLength() {
        String code = generator.normalize("A".repeat(40));

        assertThat(code).hasSize(LotteryStationCodeGenerator.MAX_LENGTH);
    }
}
