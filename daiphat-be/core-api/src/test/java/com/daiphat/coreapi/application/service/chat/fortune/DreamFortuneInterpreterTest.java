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
    }

    @Test
    void interpret_withoutAnimal_asksForClarify() {
        DreamFortuneInterpreter.Interpretation result = interpreter.interpret("hỏi phong thủy giúp tôi");

        assertThat(result.symbol()).isNull();
        assertThat(result.luckyNumbers()).isEmpty();
        assertThat(result.reply()).contains("mô tả rõ hơn");
    }
}
