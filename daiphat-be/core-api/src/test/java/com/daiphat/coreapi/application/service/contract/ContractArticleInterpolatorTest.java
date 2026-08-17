package com.daiphat.coreapi.application.service.contract;

import com.daiphat.coreapi.application.dto.document.ContractArticleView;
import com.daiphat.coreapi.domain.model.contract.ContractArticle;
import com.daiphat.coreapi.domain.model.contract.ContractModel;
import com.daiphat.coreapi.domain.model.enums.contract.ContractArticleKind;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ContractArticleInterpolator")
class ContractArticleInterpolatorTest {

    @Test
    @DisplayName("thay placeholder và bỏ điều khoản bổ sung khi trống")
    void interpolate_replacesPlaceholdersAndSkipsBlankOptional() {
        ContractModel template = ContractModel.builder()
                .articles(List.of(
                        article(1, "SCOPE", ContractArticleKind.TEXT, "<p>Từ {{start}} đến {{end}}</p>"),
                        article(2, "EXTRA", ContractArticleKind.OPTIONAL_TEXT, "<p>{{additionalTerms}}</p>")
                ))
                .build();

        List<ContractArticleView> views = ContractArticleInterpolator.interpolate(template, Map.of(
                "start", "01/01/2026",
                "end", "31/12/2026",
                "additionalTerms", "  "
        ));

        assertThat(views).hasSize(1);
        assertThat(views.get(0).code()).isEqualTo("SCOPE");
        assertThat(views.get(0).body()).contains("01/01/2026").contains("31/12/2026");
    }

    private static ContractArticle article(int ordinal, String code, ContractArticleKind kind, String body) {
        return ContractArticle.builder()
                .ordinal(ordinal)
                .code(code)
                .title("Điều " + ordinal)
                .kind(kind)
                .body(body)
                .build();
    }
}
