package com.daiphat.coreapi.application.service.fortune;

import com.daiphat.coreapi.application.dto.request.fortune.FortuneProseAiRequest;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class FortuneProseTemplatesTest {

    @Test
    void render_includesLuckyTailInVietnamese() {
        String prose = FortuneProseTemplates.render(new FortuneProseAiRequest(
                "68",
                "WOOD",
                "FIRE",
                1998,
                null,
                true,
                "Primary lucky tail 12 sold out; chose similar element tail 68"
        ));
        assertThat(prose).isNotBlank();
        assertThat(prose).contains("68");
        assertThat(prose).contains("Mộc");
        assertThat(prose).contains("Hỏa");
        assertThat(prose).contains("hết hàng");
        assertThat(prose).doesNotContain("Today your destiny");
        assertThat(prose).doesNotContain("Hôm nay bản mệnh của bạn thuộc hành");
    }

    @Test
    void render_variesBySeed() {
        String a = FortuneProseTemplates.render(new FortuneProseAiRequest(
                "22", "WATER", "METAL", 1990, null, false, null
        ));
        String b = FortuneProseTemplates.render(new FortuneProseAiRequest(
                "07", "FIRE", "EARTH", 2001, null, false, null
        ));
        assertThat(a).isNotEqualTo(b);
        assertThat(a).contains("22");
        assertThat(b).contains("07");
    }
}
