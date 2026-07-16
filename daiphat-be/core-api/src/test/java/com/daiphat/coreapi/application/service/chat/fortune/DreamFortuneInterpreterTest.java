package com.daiphat.coreapi.application.service.chat.fortune;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("DreamFortuneInterpreter")
class DreamFortuneInterpreterTest {

    private final DreamFortuneInterpreter interpreter = new DreamFortuneInterpreter();

    @Test
    void interpret_namMoThayConHeo_returnsLuckyNumbers() {
        DreamFortuneInterpreter.Interpretation result = interpreter.interpret("tôi nằm mơ thấy con heo");

        assertThat(result.symbol()).isEqualTo("heo");
        assertThat(result.luckyNumbers()).contains("02", "12", "22");
        assertThat(result.reply()).contains("heo");
        assertThat(result.reply()).contains("02");
        assertThat(result.reply()).contains("chỉ mang tính tham khảo");
        assertThat(result.reply()).contains("quý khách");
        assertThat(result.reply()).doesNotContain("Mình sẽ");
        assertThat(result.reply()).doesNotContain("tham khảo vui");
        assertThat(result.reply()).doesNotContain("hệ thống");
    }

    @Test
    void interpret_namMoThayConBo_usesBoNotTrau() {
        DreamFortuneInterpreter.Interpretation result = interpreter.interpret("tôi nằm mơ thấy con bò");

        assertThat(result.symbol()).isEqualTo("bò");
        assertThat(result.reply()).contains("bò");
        assertThat(result.reply()).doesNotContain("trâu");
        assertThat(result.luckyNumbers()).contains("09", "19", "49");
    }

    @Test
    void interpret_namMoThayConGian_returnsNumbersNotClarify() {
        DreamFortuneInterpreter.Interpretation result = interpreter.interpret("tôi nằm mơ thấy con gián");

        assertThat(result.symbol()).isEqualTo("gián");
        assertThat(result.luckyNumbers()).isNotEmpty();
        assertThat(result.reply()).contains("gián");
        assertThat(result.reply()).doesNotContain("mô tả rõ hơn");
        assertThat(result.reply()).doesNotContain("cho biết đã mơ thấy gì");
    }

    @Test
    void interpret_namMoThayTien_returnsCatalogNumbers() {
        DreamFortuneInterpreter.Interpretation result = interpreter.interpret("nằm mơ thấy tiền");

        assertThat(result.symbol()).isEqualTo("tiền");
        assertThat(result.luckyNumbers()).contains("08", "18", "68");
        assertThat(result.reply()).contains("tiền");
    }

    @Test
    void interpret_namMoThayMayBay_usesUniversalFallback() {
        DreamFortuneInterpreter.Interpretation result = interpreter.interpret("tôi nằm mơ thấy máy bay");

        assertThat(result.symbol()).isEqualTo("máy bay");
        assertThat(result.luckyNumbers()).hasSize(3);
        assertThat(result.luckyNumbers()).allMatch(n -> n.matches("\\d{2}"));
        assertThat(result.reply()).contains("máy bay");
        assertThat(result.reply()).contains("chỉ mang tính tham khảo");
        assertThat(result.reply()).doesNotContain("cho biết đã mơ thấy gì");
    }

    @Test
    void interpret_unknownSubject_isStableAcrossCalls() {
        DreamFortuneInterpreter.Interpretation first = interpreter.interpret("mơ thấy khủng long bạo chúa");
        DreamFortuneInterpreter.Interpretation second = interpreter.interpret("tôi nằm mơ thấy khủng long bạo chúa");

        assertThat(first.luckyNumbers()).isEqualTo(second.luckyNumbers());
        assertThat(first.symbol()).contains("khủng long");
    }

    @Test
    void interpret_withoutDreamSubject_asksForClarify() {
        DreamFortuneInterpreter.Interpretation result = interpreter.interpret("hỏi phong thủy giúp tôi");

        assertThat(result.symbol()).isNull();
        assertThat(result.luckyNumbers()).isEmpty();
        assertThat(result.reply()).contains("cho biết đã mơ thấy gì");
        assertThat(result.reply()).contains("quý khách");
        assertThat(result.reply()).doesNotContain("hệ thống");
    }

    @Test
    void extractDreamSubject_stripsClassifierAndNoise() {
        assertThat(DreamFortuneInterpreter.extractDreamSubject("Tôi nằm mơ thấy con gián nhé"))
                .contains("gián");
        assertThat(DreamFortuneInterpreter.extractDreamSubject("chiêm bao thấy chiếc xe máy"))
                .contains("xe máy");
    }
}
