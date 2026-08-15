package com.daiphat.coreapi.shared.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ImportBatchFileCellParserTest {

    @Test
    @DisplayName("A serial list is split and trimmed")
    void splitList_trimsEntries() {
        assertThat(ImportBatchFileCellParser.splitList("TG001; TG002 ;TG003", ";"))
                .containsExactly("TG001", "TG002", "TG003");
    }

    @Test
    @DisplayName("A trailing separator does not produce an empty serial")
    void splitList_dropsBlanks() {
        assertThat(ImportBatchFileCellParser.splitList("TG001;TG002;", ";"))
                .containsExactly("TG001", "TG002");
    }

    @Test
    @DisplayName("A custom separator is honoured")
    void splitList_customSeparator() {
        assertThat(ImportBatchFileCellParser.splitList("TG001|TG002", "|"))
                .containsExactly("TG001", "TG002");
    }

    @Test
    @DisplayName("Null and blank cells yield nothing")
    void splitList_handlesEmpty() {
        assertThat(ImportBatchFileCellParser.splitList(null, ";")).isEmpty();
        assertThat(ImportBatchFileCellParser.splitList("   ", ";")).isEmpty();
    }

    @Test
    @DisplayName("Only absolute http(s) links are accepted as ticket images")
    void isValidImageUrl_requiresAbsoluteHttpLink() {
        assertThat(ImportBatchFileCellParser.isValidImageUrl("https://cdn.example.com/a.jpg")).isTrue();
        assertThat(ImportBatchFileCellParser.isValidImageUrl("http://cdn.example.com/a.jpg")).isTrue();
        assertThat(ImportBatchFileCellParser.isValidImageUrl("cdn.example.com/a.jpg")).isFalse();
        assertThat(ImportBatchFileCellParser.isValidImageUrl("C:\\anh\\ve.jpg")).isFalse();
        assertThat(ImportBatchFileCellParser.isValidImageUrl("")).isFalse();
        assertThat(ImportBatchFileCellParser.isValidImageUrl(null)).isFalse();
    }

    @Test
    @DisplayName("An over-long URL is rejected because the column cannot hold it")
    void isValidImageUrl_rejectsOverlongUrl() {
        String url = "https://cdn.example.com/" + "a".repeat(500);

        assertThat(ImportBatchFileCellParser.isValidImageUrl(url)).isFalse();
    }

    @Test
    @DisplayName("A single image is shared by every serial of the row")
    void alignImages_singleImageIsShared() {
        List<String> aligned = ImportBatchFileCellParser.alignImagesToSerials(
                List.of("https://cdn.example.com/a.jpg"), 3);

        assertThat(aligned).containsExactly(
                "https://cdn.example.com/a.jpg",
                "https://cdn.example.com/a.jpg",
                "https://cdn.example.com/a.jpg"
        );
    }

    @Test
    @DisplayName("One image per serial is paired by position")
    void alignImages_pairsByPosition() {
        List<String> aligned = ImportBatchFileCellParser.alignImagesToSerials(
                List.of("https://cdn.example.com/a.jpg", "https://cdn.example.com/b.jpg"), 2);

        assertThat(aligned).containsExactly(
                "https://cdn.example.com/a.jpg",
                "https://cdn.example.com/b.jpg"
        );
    }

    @Test
    @DisplayName("An ambiguous image count pairs nothing rather than guessing")
    void alignImages_rejectsAmbiguousCount() {
        List<String> aligned = ImportBatchFileCellParser.alignImagesToSerials(
                List.of("https://cdn.example.com/a.jpg", "https://cdn.example.com/b.jpg"), 3);

        assertThat(aligned).isEmpty();
    }

    @Test
    @DisplayName("No image column still yields one slot per serial")
    void alignImages_withoutImages() {
        assertThat(ImportBatchFileCellParser.alignImagesToSerials(List.of(), 2))
                .hasSize(2)
                .containsOnlyNulls();
    }

    @Test
    @DisplayName("An unusable URL becomes an empty slot, not a failure")
    void alignImages_dropsInvalidUrl() {
        assertThat(ImportBatchFileCellParser.alignImagesToSerials(List.of("anh-ve.jpg"), 2))
                .hasSize(2)
                .containsOnlyNulls();
    }
}
