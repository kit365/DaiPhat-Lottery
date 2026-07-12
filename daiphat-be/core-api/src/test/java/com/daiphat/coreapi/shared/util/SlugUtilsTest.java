package com.daiphat.coreapi.shared.util;

import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class SlugUtilsTest {

    @Test
    void generateUnique_usesFallbackAndRemovesVietnameseDiacritics() {
        String slug = SlugUtils.generateUnique(null, "Kết quả xổ số Đồng Nai", value -> false);

        assertThat(slug).isEqualTo("ket-qua-xo-so-dong-nai");
    }

    @Test
    void generateUnique_appendsIncrementingSuffixWhenSlugExists() {
        Set<String> existing = Set.of("tin-tuc", "tin-tuc-2");

        String slug = SlugUtils.generateUnique(null, "Tin tức", existing::contains);

        assertThat(slug).isEqualTo("tin-tuc-3");
    }

    @Test
    void generateUnique_keepsSlugWithinMaximumLength() {
        Set<String> existing = Set.of("abcdefghij");

        String slug = SlugUtils.generateUnique(null, "abcdefghijk", 10, existing::contains);

        assertThat(slug).isEqualTo("abcdefgh-2");
    }
}
