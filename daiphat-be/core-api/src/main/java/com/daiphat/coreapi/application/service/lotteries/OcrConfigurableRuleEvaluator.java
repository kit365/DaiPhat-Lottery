package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrValidationRuleSeverity;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrValidationRuleType;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.OcrFieldValidationFailure;
import com.daiphat.coreapi.domain.model.lotteries.OcrFieldValidationRuleModel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

/**
 * Evaluates system-config OCR ticket-scan validation rules
 * ({@code OCR_TICKET_SCAN_VALIDATION_RULES}).
 */
@Component
@Slf4j
public class OcrConfigurableRuleEvaluator {

    public record RuleEvaluation(
            List<OcrFieldValidationFailure> failures,
            boolean anyHardFail,
            boolean anySoftWarning
    ) {
        public static RuleEvaluation empty() {
            return new RuleEvaluation(List.of(), false, false);
        }
    }

    public RuleEvaluation evaluateField(
            List<OcrFieldValidationRuleModel> rules,
            OcrTemplateFieldName fieldName,
            String rawValue,
            LotteryStationModel contextStation,
            LocalDate scanDate
    ) {
        if (rules == null || rules.isEmpty()) {
            return RuleEvaluation.empty();
        }
        List<OcrFieldValidationFailure> failures = new ArrayList<>();
        boolean hard = false;
        boolean soft = false;
        LocalDate today = scanDate != null ? scanDate : LocalDate.now();

        for (OcrFieldValidationRuleModel rule : rules) {
            if (rule == null || !rule.isActive() || rule.getFieldName() != fieldName) {
                continue;
            }
            String message = evaluateOne(rule, rawValue, contextStation, today);
            if (message == null) {
                continue;
            }
            OcrValidationRuleSeverity severity =
                    rule.getSeverity() != null ? rule.getSeverity() : OcrValidationRuleSeverity.HARD_FAIL;
            failures.add(OcrFieldValidationFailure.builder()
                    .ruleId(rule.getId())
                    .ruleType(rule.getRuleType())
                    .severity(severity)
                    .message(message)
                    .configSnapshot(snapshotConfig(rule.getRuleConfig()))
                    .build());
            if (severity == OcrValidationRuleSeverity.HARD_FAIL) {
                hard = true;
            } else {
                soft = true;
            }
        }
        return new RuleEvaluation(List.copyOf(failures), hard, soft);
    }

    private String evaluateOne(
            OcrFieldValidationRuleModel rule,
            String rawValue,
            LotteryStationModel contextStation,
            LocalDate today
    ) {
        OcrValidationRuleType type = rule.getRuleType();
        if (type == null) {
            return null;
        }
        Map<String, Object> config = rule.getRuleConfig() != null ? rule.getRuleConfig() : Map.of();
        return switch (type) {
            case REGEX -> evalRegex(rawValue, config);
            case VALUE_LIST -> evalValueList(rawValue, config);
            case DATE_RANGE -> evalDateRange(rawValue, config, today);
            case NUMBER_RANGE -> evalNumberRange(rawValue, config);
            case REFERENCE_LOOKUP -> evalReferenceLookup(rawValue, config, contextStation);
        };
    }

    private String evalRegex(String rawValue, Map<String, Object> config) {
        String pattern = asString(config.get("pattern"));
        if (!StringUtils.hasText(pattern)) {
            return null;
        }
        if (!StringUtils.hasText(rawValue)) {
            return "Giá trị trống — không khớp mẫu: " + pattern;
        }
        try {
            if (!Pattern.compile(pattern).matcher(rawValue.trim()).matches()) {
                return "Giá trị '" + rawValue + "' không khớp mẫu: " + pattern;
            }
        } catch (PatternSyntaxException e) {
            log.warn("Invalid OCR validation regex pattern: {}", pattern);
            return null;
        }
        return null;
    }

    private String evalValueList(String rawValue, Map<String, Object> config) {
        Object allowed = config.get("allowedValues");
        if (!(allowed instanceof List<?> list) || list.isEmpty()) {
            return null;
        }
        if (!StringUtils.hasText(rawValue)) {
            return "Giá trị trống — không thuộc danh sách cho phép.";
        }
        String normalized = normalizeMoneyLike(rawValue.trim());
        for (Object item : list) {
            if (item == null) {
                continue;
            }
            if (normalizeMoneyLike(String.valueOf(item)).equalsIgnoreCase(normalized)) {
                return null;
            }
            try {
                BigDecimal a = new BigDecimal(normalized.replace(",", ""));
                BigDecimal b = new BigDecimal(String.valueOf(item).replaceAll("[^0-9.]", ""));
                if (a.compareTo(b) == 0) {
                    return null;
                }
            } catch (NumberFormatException ignored) {
                // continue
            }
        }
        return "Giá trị '" + rawValue + "' không nằm trong danh sách cho phép: " + list;
    }

    private String evalDateRange(String rawValue, Map<String, Object> config, LocalDate today) {
        if (!StringUtils.hasText(rawValue)) {
            return "Ngày trống — không thỏa khoảng ngày cho phép.";
        }
        LocalDate date;
        try {
            date = LocalDate.parse(rawValue.trim().substring(0, Math.min(10, rawValue.trim().length())));
        } catch (DateTimeParseException | StringIndexOutOfBoundsException e) {
            return "Ngày '" + rawValue + "' không hợp lệ.";
        }
        int minOffset = asInt(config.get("minOffsetDays"), -3650);
        int maxOffset = asInt(config.get("maxOffsetDays"), 365);
        LocalDate min = today.plusDays(minOffset);
        LocalDate max = today.plusDays(maxOffset);
        if (date.isBefore(min) || date.isAfter(max)) {
            return "Ngày OCR (" + date + ") ngoài khoảng cho phép [" + min + " .. " + max + "].";
        }
        return null;
    }

    private String evalNumberRange(String rawValue, Map<String, Object> config) {
        if (!StringUtils.hasText(rawValue)) {
            return "Giá trị số trống — không thỏa khoảng cho phép.";
        }
        String digits = rawValue.trim().replaceAll("[^0-9.-]", "");
        try {
            BigDecimal value = new BigDecimal(digits);
            BigDecimal min = config.get("min") != null ? new BigDecimal(String.valueOf(config.get("min"))) : null;
            BigDecimal max = config.get("max") != null ? new BigDecimal(String.valueOf(config.get("max"))) : null;
            if (min != null && value.compareTo(min) < 0) {
                return "Giá trị " + value + " nhỏ hơn min=" + min + ".";
            }
            if (max != null && value.compareTo(max) > 0) {
                return "Giá trị " + value + " lớn hơn max=" + max + ".";
            }
        } catch (NumberFormatException e) {
            return "Giá trị '" + rawValue + "' không phải số hợp lệ.";
        }
        return null;
    }

    private String evalReferenceLookup(
            String rawValue,
            Map<String, Object> config,
            LotteryStationModel contextStation
    ) {
        String lookup = asString(config.get("lookup"));
        if (!StringUtils.hasText(lookup)) {
            return null;
        }
        if ("draw_schedule".equalsIgnoreCase(lookup)) {
            if (!StringUtils.hasText(rawValue)) {
                return "Ngày trống — không đối chiếu được lịch quay.";
            }
            if (contextStation == null) {
                return "Chưa xác định nhà đài để đối chiếu lịch quay (rule draw_schedule).";
            }
            List<DayOfWeek> drawDays = contextStation.getDrawDays();
            if (drawDays == null || drawDays.isEmpty()) {
                return "Nhà đài chưa cấu hình lịch quay để đối chiếu.";
            }
            LocalDate date;
            try {
                date = LocalDate.parse(rawValue.trim().substring(0, Math.min(10, rawValue.trim().length())));
            } catch (DateTimeParseException | StringIndexOutOfBoundsException e) {
                return "Ngày '" + rawValue + "' không hợp lệ để đối chiếu lịch quay.";
            }
            DayOfWeek day = date.getDayOfWeek();
            if (!drawDays.contains(day)) {
                return "Nhà đài " + contextStation.getName() + " không xổ vào " + day
                        + " (ngày OCR " + date + ").";
            }
            return null;
        }
        log.debug("Unsupported OCR reference lookup: {}", lookup);
        return null;
    }

    private static String asString(Object value) {
        return value == null ? null : String.valueOf(value).trim();
    }

    private static int asInt(Object value, int defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(String.valueOf(value).trim());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    private static String normalizeMoneyLike(String raw) {
        return raw.replace(" ", "")
                .replace(".", "")
                .replace(",", "")
                .replace("₫", "")
                .replace("VND", "")
                .replace("vnd", "")
                .trim();
    }

    private static Map<String, Object> snapshotConfig(Map<String, Object> config) {
        if (config == null || config.isEmpty()) {
            return Map.of();
        }
        return new LinkedHashMap<>(config);
    }
}
