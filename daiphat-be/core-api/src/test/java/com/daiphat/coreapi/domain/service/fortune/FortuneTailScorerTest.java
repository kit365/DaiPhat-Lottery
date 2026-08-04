package com.daiphat.coreapi.domain.service.fortune;

import com.daiphat.coreapi.domain.model.enums.fortune.FiveElement;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FortuneTailScorerTest {

    @Test
    void sameUserAndDay_producesStablePick() {
        UUID userId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        List<String> tails = List.of("12", "34", "56", "78", "90", "01", "23");
        FortuneTailScorer.PickResult first = FortuneTailScorer.pick(
                userId, "2026-08-03", FiveElement.WOOD, FiveElement.FIRE, tails);
        FortuneTailScorer.PickResult second = FortuneTailScorer.pick(
                userId, "2026-08-03", FiveElement.WOOD, FiveElement.FIRE, tails);
        assertThat(first.finalTail()).isEqualTo(second.finalTail());
        assertThat(first.primaryTail()).isEqualTo(second.primaryTail());
    }

    @Test
    void differentSeed_isDeterministicPerDay() {
        UUID userId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        List<String> tails = List.of("12", "34", "56", "78", "90", "01", "23", "45", "67", "89");
        String a = FortuneTailScorer.pick(
                userId, "2026-08-03", FiveElement.WOOD, FiveElement.FIRE, tails).finalTail();
        String b = FortuneTailScorer.pick(
                userId, "2026-08-04", FiveElement.WOOD, FiveElement.FIRE, tails).finalTail();
        String aAgain = FortuneTailScorer.pick(
                userId, "2026-08-03", FiveElement.WOOD, FiveElement.FIRE, tails).finalTail();
        assertThat(a).isEqualTo(aAgain);
        assertThat(a).isIn(tails);
        assertThat(b).isIn(tails);
    }

    @Test
    void fallback_replacesSoldOutPrimary() {
        UUID userId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        List<String> tails = List.of("12", "34", "56");
        FortuneTailScorer.PickResult primary = FortuneTailScorer.pick(
                userId, "2026-08-03", FiveElement.METAL, FiveElement.EARTH, tails);
        List<String> remaining = tails.stream().filter(t -> !t.equals(primary.primaryTail())).toList();
        FortuneTailScorer.PickResult fallback = FortuneTailScorer.applyFallback(primary, remaining);
        assertThat(fallback.fallbackUsed()).isTrue();
        assertThat(fallback.finalTail()).isIn(remaining);
        assertThat(fallback.primaryTail()).isEqualTo(primary.primaryTail());
        assertThat(fallback.fallbackReason()).contains("sold out");
    }

    @Test
    void emptyInventory_throws() {
        assertThatThrownBy(() -> FortuneTailScorer.pick(
                UUID.randomUUID(), "2026-08-03", FiveElement.WOOD, FiveElement.FIRE, List.of()))
                .isInstanceOf(IllegalStateException.class);
    }
}

class FiveElementCatalogTest {

    @Test
    void birthYear_mapsHeavenlyStemElement() {
        // 1984 = Wood (Jia Zi)
        assertThat(FiveElementCatalog.elementForBirthYear(1984)).isEqualTo(FiveElement.WOOD);
        assertThat(FiveElementCatalog.elementForBirthYear(1990)).isEqualTo(FiveElement.METAL);
    }

    @Test
    void tail_mapsByLastDigit() {
        assertThat(FiveElementCatalog.elementForTail("01")).isEqualTo(FiveElement.METAL);
        assertThat(FiveElementCatalog.elementForTail("23")).isEqualTo(FiveElement.WOOD);
        assertThat(FiveElementCatalog.elementForTail("45")).isEqualTo(FiveElement.WATER);
        assertThat(FiveElementCatalog.elementForTail("67")).isEqualTo(FiveElement.FIRE);
        assertThat(FiveElementCatalog.elementForTail("89")).isEqualTo(FiveElement.EARTH);
    }

    @Test
    void solarDate_resolvesDayElementViaLunarLib() {
        FiveElement element = FiveElementCatalog.elementForSolarDate(LocalDate.of(2026, 8, 3));
        assertThat(element).isNotNull();
    }
}
