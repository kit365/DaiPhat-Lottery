package com.daiphat.coreapi.shared.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

class VietnameseTextNormalizerTest {

    @ParameterizedTest
    @CsvSource({
            "'Tiền Giang', 'tien giang'",
            "'TIỀN GIANG', 'tien giang'",
            "'  Vĩnh   Long ', 'vinh long'",
            "'Đà Lạt', 'da lat'",
            "'Đồng Tháp', 'dong thap'"
    })
    @DisplayName("normalize lowercases, strips diacritics and collapses whitespace")
    void normalize_stripsDiacriticsAndWhitespace(String raw, String expected) {
        assertThat(VietnameseTextNormalizer.normalize(raw)).isEqualTo(expected);
    }

    @Test
    @DisplayName("normalize handles null and blank without throwing")
    void normalize_handlesNullAndBlank() {
        assertThat(VietnameseTextNormalizer.normalize(null)).isEmpty();
        assertThat(VietnameseTextNormalizer.normalize("   ")).isEmpty();
    }

    @Test
    @DisplayName("normalize strips non-breaking spaces pasted from Excel")
    void normalize_stripsNonBreakingSpace() {
        assertThat(VietnameseTextNormalizer.normalize(" Tiền Giang ")).isEqualTo("tien giang");
    }

    @ParameterizedTest
    @CsvSource({
            "'XSKT Tiền Giang'",
            "'Xổ số kiến thiết Tiền Giang'",
            "'Đài Tiền Giang'",
            "'XS Tiền Giang'",
            "'XSKT - Tiền Giang'"
    })
    @DisplayName("stationNameForms exposes the prefix-free form of a prefixed name")
    void stationNameForms_exposesStrippedForm(String raw) {
        assertThat(VietnameseTextNormalizer.stationNameForms(raw)).contains("tien giang");
    }

    @Test
    @DisplayName("stationNameForms returns a single form when there is no prefix")
    void stationNameForms_withoutPrefix() {
        assertThat(VietnameseTextNormalizer.stationNameForms("Tiền Giang"))
                .containsExactly("tien giang");
    }

    @Test
    @DisplayName("stationNameForms keeps a name that merely starts with the same letters")
    void stationNameForms_keepsFullNameForDaiLoc() {
        assertThat(VietnameseTextNormalizer.stationNameForms("Đại Lộc"))
                .contains("dai loc");
    }

    @Test
    @DisplayName("normalizeStationName flattens punctuation but keeps every word")
    void normalizeStationName_flattensPunctuation() {
        assertThat(VietnameseTextNormalizer.normalizeStationName("XSKT - Tiền Giang"))
                .isEqualTo("xskt tien giang");
    }

    @ParameterizedTest
    @CsvSource({
            "'Số lượng', 'soluong'",
            "'so_luong', 'soluong'",
            "'SỐ LƯỢNG', 'soluong'",
            "'Ngày quay', 'ngayquay'",
            "'Nhà đài', 'nhadai'"
    })
    @DisplayName("normalizeHeader drops separators so header variants collapse")
    void normalizeHeader_dropsSeparators(String raw, String expected) {
        assertThat(VietnameseTextNormalizer.normalizeHeader(raw)).isEqualTo(expected);
    }
}
