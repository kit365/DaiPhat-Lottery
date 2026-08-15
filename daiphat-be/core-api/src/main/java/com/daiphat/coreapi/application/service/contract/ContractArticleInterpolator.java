package com.daiphat.coreapi.application.service.contract;

import com.daiphat.coreapi.application.dto.document.ContractArticleView;
import com.daiphat.coreapi.domain.model.contract.ContractArticle;
import com.daiphat.coreapi.domain.model.contract.ContractModel;
import com.daiphat.coreapi.domain.model.enums.contract.ContractArticleKind;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

public final class ContractArticleInterpolator {

    private ContractArticleInterpolator() {
    }

    public static List<ContractArticleView> interpolate(ContractModel template, Map<String, String> values) {
        if (template == null || template.getArticles() == null) {
            return List.of();
        }
        Map<String, String> placeholders = values == null ? Map.of() : values;
        return template.getArticles().stream()
                .sorted(Comparator.comparingInt(article -> article.getOrdinal() == null ? 0 : article.getOrdinal()))
                .map(article -> toView(article, placeholders))
                .filter(view -> keep(articleKind(view.kind()), view.body()))
                .toList();
    }

    private static ContractArticleView toView(ContractArticle article, Map<String, String> values) {
        ContractArticleKind kind = article.getKind() == null ? ContractArticleKind.TEXT : article.getKind();
        return new ContractArticleView(
                article.getCode(),
                article.getOrdinal() == null ? 0 : article.getOrdinal(),
                interpolate(article.getTitle(), values),
                kind.name(),
                interpolate(article.getBody(), values)
        );
    }

    private static boolean keep(ContractArticleKind kind, String body) {
        if (kind != ContractArticleKind.OPTIONAL_TEXT) {
            return true;
        }
        return !blankHtml(body);
    }

    private static ContractArticleKind articleKind(String kind) {
        if (kind == null || kind.isBlank()) {
            return ContractArticleKind.TEXT;
        }
        try {
            return ContractArticleKind.valueOf(kind);
        } catch (IllegalArgumentException ex) {
            return ContractArticleKind.TEXT;
        }
    }

    static String interpolate(String text, Map<String, String> values) {
        if (text == null) {
            return "";
        }
        String result = text;
        for (Map.Entry<String, String> entry : values.entrySet()) {
            result = result.replace("{{" + entry.getKey() + "}}", entry.getValue() == null ? "" : entry.getValue());
        }
        return result;
    }

    private static boolean blankHtml(String html) {
        if (html == null || html.isBlank()) {
            return true;
        }
        return html.replaceAll("<[^>]+>", "").replace("&nbsp;", " ").isBlank();
    }
}
