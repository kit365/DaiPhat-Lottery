package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.response.lotteries.scan.ExtractedTicketFieldsResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.FieldValidationResult;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrFieldValidationStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrOverallValidationStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrValidationRuleSeverity;
import com.daiphat.coreapi.domain.model.enums.lottery.ScannedTicketStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.domain.model.lotteries.OcrFieldValidationFailure;
import com.daiphat.coreapi.domain.model.lotteries.OcrFieldValidationRuleModel;
import com.daiphat.coreapi.domain.valueobject.LotteryTicketNumber;
import com.daiphat.coreapi.shared.util.LotteryStationNameResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Layer-2 OCR validation against DaiPhat master data (station, schedule, price,
 * numbers, serial) plus adjusted confidence from field OCR scores.
 * Production batchCode on the ticket is extracted only — never matched to import-batch.
 */
@Service
@RequiredArgsConstructor
public class OcrScanValidationService {

    private static final Pattern SERIAL_PATTERN =
            Pattern.compile("^(?:[A-Za-z]\\d{4,19}|\\d{4,19}[A-Za-z])$");

    private static final Pattern BATCH_CODE_PATTERN =
            Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z0-9\\-]{2,24}$");

    private static final List<String> REQUIRED_FIELDS =
            List.of("stationName", "serialNumber", "numbers", "drawDate");

    private static final double MATCHED_FACTOR = 1.0;
    private static final double UNCERTAIN_FACTOR = 0.85;
    private static final double UNREADABLE_FACTOR = 0.55;
    private static final double MISMATCH_FACTOR = 0.4;

    private static final String UNREADABLE_COVERED_HINT =
            "Thông tin có thể bị che bởi vé khác hoặc không rõ trên ảnh.";

    private final LotteryStationRepositoryPort lotteryStationRepositoryPort;
    private final LotteryTicketRepositoryPort lotteryTicketRepositoryPort;
    private final LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;
    private final LotteryStationNameResolver stationNameResolver;
    private final OcrTicketScanValidationRulesConfigService validationRulesConfigService;
    private final OcrConfigurableRuleEvaluator configurableRuleEvaluator;

    public record ValidationOutcome(
            Map<String, FieldValidationResult> fieldValidations,
            OcrOverallValidationStatus overallValidationStatus,
            double adjustedConfidence,
            ScannedTicketStatus status,
            List<String> businessValidationErrors,
            boolean duplicate,
            Long resolvedStationId,
            LocalDate resolvedDrawDate
    ) {
    }

    /**
     * @param lineStation    optional import-line station; when null, skip line-match checks
     * @param batchDrawDate  optional batch draw date; when null, use OCR draw date for duplicates
     * @param templateId     unused; retained for call-site compatibility (rules come from system_config)
     */
    public ValidationOutcome validate(
            ExtractedTicketFieldsResponse extracted,
            Map<String, Double> fieldConfidences,
            ScannedTicketStatus layer1Status,
            LotteryStationModel lineStation,
            LocalDate batchDrawDate
    ) {
        return validate(extracted, fieldConfidences, layer1Status, lineStation, batchDrawDate, null);
    }

    public ValidationOutcome validate(
            ExtractedTicketFieldsResponse extracted,
            Map<String, Double> fieldConfidences,
            ScannedTicketStatus layer1Status,
            LotteryStationModel lineStation,
            LocalDate batchDrawDate,
            Long templateId
    ) {
        Map<String, FieldValidationResult> fields = new LinkedHashMap<>();
        List<String> businessErrors = new ArrayList<>();
        boolean duplicate = false;

        String stationName = trimToNull(extracted != null ? extracted.stationName() : null);
        String stationCode = trimToNull(extracted != null ? extracted.stationCode() : null);
        String numbers = trimToNull(extracted != null ? extracted.numbers() : null);
        String serialNumber = trimToNull(extracted != null ? extracted.serialNumber() : null);
        LocalDate drawDate = extracted != null ? extracted.drawDate() : null;
        String ticketType = trimToNull(extracted != null ? extracted.ticketType() : null);
        String batchCode = trimToNull(extracted != null ? extracted.batchCode() : null);

        SerialBatchPair reconciled = reconcileSerialAndBatchCode(serialNumber, batchCode);
        serialNumber = reconciled.serialNumber();
        batchCode = reconciled.batchCode();
        if (extracted != null
                && (!Objects.equals(serialNumber, trimToNull(extracted.serialNumber()))
                || !Objects.equals(batchCode, trimToNull(extracted.batchCode())))) {
            extracted = new ExtractedTicketFieldsResponse(
                    extracted.stationName(),
                    extracted.stationCode(),
                    serialNumber,
                    extracted.numbers(),
                    extracted.drawDate(),
                    extracted.ticketType(),
                    batchCode
            );
        }

        StationResolveResult stationResolve = resolveStation(
                stationName, stationCode, lineStation, batchDrawDate, businessErrors
        );
        fields.put("stationName", stationResolve.fieldResult());
        // Use OCR-resolved station only — never fall back to import-batch/line station
        // (that would silently replace what OCR read from the ticket).
        LotteryStationModel contextStation = stationResolve.station();

        LocalDate effectiveDrawDate = batchDrawDate != null ? batchDrawDate : drawDate;
        fields.put("drawDate", validateDrawDate(drawDate, batchDrawDate, contextStation, businessErrors));

        if (contextStation != null) {
            fields.put("numbers", validateNumbers(numbers, contextStation, businessErrors));
            FieldValidationResult serialResult = validateSerial(
                    serialNumber, numbers, contextStation, effectiveDrawDate, businessErrors
            );
            fields.put("serialNumber", serialResult);
            if (serialResult.status() == OcrFieldValidationStatus.MISMATCHED
                    && serialResult.message() != null
                    && serialResult.message().contains("đã tồn tại")) {
                duplicate = true;
            }
            fields.put("ticketType", validatePrice(ticketType, contextStation, businessErrors));
        } else {
            fields.put("numbers", numbers == null
                    ? FieldValidationResult.unreadable("Không nhận diện được dãy số dự thưởng. " + UNREADABLE_COVERED_HINT)
                    : FieldValidationResult.uncertain("Chưa xác định nhà đài để kiểm tra dãy số."));
            fields.put("serialNumber", serialNumber == null
                    ? FieldValidationResult.unreadable("Không nhận diện được số sê-ri. " + UNREADABLE_COVERED_HINT)
                    : FieldValidationResult.uncertain("Chưa xác định nhà đài để kiểm tra số sê-ri."));
            fields.put("ticketType", ticketType == null
                    ? FieldValidationResult.unreadable("Không nhận diện được mệnh giá trên vé. " + UNREADABLE_COVERED_HINT)
                    : FieldValidationResult.uncertain("Chưa xác định nhà đài để kiểm tra mệnh giá vé."));
            if (numbers == null) {
                businessErrors.add(fields.get("numbers").message());
            }
            if (serialNumber == null) {
                businessErrors.add(fields.get("serialNumber").message());
            }
        }

        fields.put("batchCode", validateProductionBatchCode(batchCode));

        applyConfigurableRules(
                fields,
                businessErrors,
                contextStation,
                Map.of(
                        OcrTemplateFieldName.stationName, stationName != null ? stationName : "",
                        OcrTemplateFieldName.numbers, numbers != null ? numbers : "",
                        OcrTemplateFieldName.serialNumber, serialNumber != null ? serialNumber : "",
                        OcrTemplateFieldName.drawDate, drawDate != null ? drawDate.toString() : "",
                        OcrTemplateFieldName.ticketType, ticketType != null ? ticketType : "",
                        OcrTemplateFieldName.batchCode, batchCode != null ? batchCode : "",
                        OcrTemplateFieldName.price, ticketType != null ? ticketType : ""
                )
        );

        double adjusted = adjustConfidence(fieldConfidences, fields);
        OcrOverallValidationStatus overall = deriveOverall(fields, layer1Status);
        ScannedTicketStatus status = downgradeStatus(layer1Status, overall, fields, businessErrors);

        return new ValidationOutcome(
                fields,
                overall,
                adjusted,
                status,
                List.copyOf(businessErrors),
                duplicate,
                stationResolve.station() != null ? stationResolve.station().getId() : null,
                drawDate
        );
    }

    private void applyConfigurableRules(
            Map<String, FieldValidationResult> fields,
            List<String> businessErrors,
            LotteryStationModel contextStation,
            Map<OcrTemplateFieldName, String> values
    ) {
        List<OcrFieldValidationRuleModel> rules = validationRulesConfigService.listActiveRules();
        if (rules.isEmpty()) {
            return;
        }
        LocalDate today = LocalDate.now();
        for (OcrTemplateFieldName fieldName : OcrTemplateFieldName.values()) {
            String mapKey = fieldName.name();
            String raw = values.get(fieldName);
            OcrConfigurableRuleEvaluator.RuleEvaluation evaluation = configurableRuleEvaluator.evaluateField(
                    rules,
                    fieldName,
                    StringUtils.hasText(raw) ? raw : null,
                    contextStation,
                    today
            );
            if (evaluation.failures().isEmpty()) {
                continue;
            }
            FieldValidationResult current = fields.get(mapKey);
            FieldValidationResult merged = mergeRuleFailures(current, evaluation);
            fields.put(mapKey, merged);
            for (OcrFieldValidationFailure failure : evaluation.failures()) {
                if (failure.getSeverity() == OcrValidationRuleSeverity.HARD_FAIL
                        && failure.getMessage() != null
                        && !businessErrors.contains(failure.getMessage())) {
                    businessErrors.add(failure.getMessage());
                }
            }
        }
    }

    private FieldValidationResult mergeRuleFailures(
            FieldValidationResult current,
            OcrConfigurableRuleEvaluator.RuleEvaluation evaluation
    ) {
        List<OcrFieldValidationFailure> failures = evaluation.failures();
        if (current == null) {
            if (evaluation.anyHardFail()) {
                return FieldValidationResult.of(
                        OcrFieldValidationStatus.MISMATCHED,
                        failures.get(0).getMessage(),
                        null,
                        failures
                );
            }
            return FieldValidationResult.of(
                    OcrFieldValidationStatus.UNCERTAIN,
                    failures.get(0).getMessage(),
                    null,
                    failures
            );
        }

        OcrFieldValidationStatus status = current.status();
        String message = current.message();
        if (evaluation.anyHardFail()) {
            status = OcrFieldValidationStatus.MISMATCHED;
            message = failures.stream()
                    .filter(f -> f.getSeverity() == OcrValidationRuleSeverity.HARD_FAIL)
                    .map(OcrFieldValidationFailure::getMessage)
                    .findFirst()
                    .orElse(message);
        } else if (evaluation.anySoftWarning()
                && (status == OcrFieldValidationStatus.MATCHED || status == null)) {
            status = OcrFieldValidationStatus.UNCERTAIN;
            message = failures.get(0).getMessage();
        }

        List<OcrFieldValidationFailure> allFailures = new ArrayList<>();
        if (current.ruleFailures() != null) {
            allFailures.addAll(current.ruleFailures());
        }
        allFailures.addAll(failures);
        return FieldValidationResult.of(status, message, current.expectedValue(), allFailures);
    }

    private record StationResolveResult(FieldValidationResult fieldResult, LotteryStationModel station) {
    }

    public static String formatVietnameseDayOfWeek(DayOfWeek day) {
        if (day == null) return "";
        return switch (day) {
            case MONDAY -> "Thứ Hai";
            case TUESDAY -> "Thứ Ba";
            case WEDNESDAY -> "Thứ Tư";
            case THURSDAY -> "Thứ Năm";
            case FRIDAY -> "Thứ Sáu";
            case SATURDAY -> "Thứ Bảy";
            case SUNDAY -> "Chủ Nhật";
        };
    }

    public static String formatVietnameseDate(LocalDate date) {
        if (date == null) return "";
        return date.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }

    private StationResolveResult resolveStation(
            String stationName,
            String stationCode,
            LotteryStationModel lineStation,
            LocalDate batchDrawDate,
            List<String> businessErrors
    ) {
        if (stationName == null && stationCode == null) {
            FieldValidationResult result = FieldValidationResult.unreadable(
                    "Không nhận diện được nhà đài trên vé. " + UNREADABLE_COVERED_HINT
            );
            businessErrors.add(result.message());
            return new StationResolveResult(result, null);
        }

        // Match against ALL active stations — never restrict the OCR name to the
        // import-batch draw schedule (that would silently replace/hide OCR results).
        List<LotteryStationModel> stations = lotteryStationRepositoryPort.findAll().stream()
                .filter(s -> s.getDeletedAt() == null)
                .toList();

        List<LotteryStationNameResolver.Candidate> candidates = stations.stream()
                .map(s -> new LotteryStationNameResolver.Candidate(s.getId(), s.getName()))
                .toList();

        String lookup = stationName != null ? stationName : stationCode;
        LotteryStationNameResolver.Match match =
                stationNameResolver.resolve(lookup, candidates, Map.of());

        LotteryStationNameResolver.Match resolvedMatch = match;

        if (!resolvedMatch.isResolved()) {
            if (stationCode != null) {
                Optional<LotteryStationModel> byCode = stations.stream()
                        .filter(s -> stationCode.equalsIgnoreCase(s.getCode()))
                        .findFirst();
                if (byCode.isPresent()) {
                    resolvedMatch = new LotteryStationNameResolver.Match(
                            byCode.get().getId(),
                            byCode.get().getName(),
                            LotteryStationNameResolver.MatchKind.EXACT,
                            List.of()
                    );
                }
            }
        }

        if (!resolvedMatch.isResolved()) {
            FieldValidationResult result = FieldValidationResult.notFound(
                    "Nhà đài nhận diện '" + lookup + "' không tìm thấy trong hệ thống."
            );
            businessErrors.add(result.message());
            return new StationResolveResult(result, null);
        }

        final Long resolvedStationId = resolvedMatch.lotteryStationId();
        LotteryStationModel resolved = stations.stream()
                .filter(s -> resolvedStationId.equals(s.getId()))
                .findFirst()
                .orElse(null);

        // Keep OCR-resolved station; surface batch/schedule disagreements as review warnings.
        if (lineStation != null && !lineStation.getId().equals(resolvedStationId)) {
            FieldValidationResult result = FieldValidationResult.mismatched(
                    "Nhà đài OCR '" + resolvedMatch.stationName() + "' khác đài gắn với phiếu/dòng lô ("
                            + lineStation.getName() + "). Vui lòng kiểm tra lại.",
                    lineStation.getName()
            );
            businessErrors.add(result.message());
            return new StationResolveResult(result, resolved);
        }

        if (batchDrawDate != null && resolved != null) {
            List<DayOfWeek> drawDays = resolved.getDrawDays();
            DayOfWeek day = batchDrawDate.getDayOfWeek();
            if (drawDays == null || drawDays.isEmpty()) {
                FieldValidationResult result = FieldValidationResult.uncertain(
                        "Nhà đài OCR '" + resolvedMatch.stationName()
                                + "' chưa cấu hình lịch quay để đối chiếu ngày phiếu nhập."
                );
                return new StationResolveResult(result, resolved);
            }
            if (!drawDays.contains(day)) {
                FieldValidationResult result = FieldValidationResult.mismatched(
                        "Nhà đài OCR '" + resolvedMatch.stationName() + "' không mở thưởng vào "
                                + formatVietnameseDayOfWeek(day)
                                + " (ngày phiếu " + formatVietnameseDate(batchDrawDate) + "). "
                                + "Giữ kết quả OCR để bạn kiểm tra.",
                        formatVietnameseDate(batchDrawDate)
                );
                businessErrors.add(result.message());
                return new StationResolveResult(result, resolved);
            }
        }

        // Always keep the OCR-matched station name — never substitute the import-batch station label.
        return new StationResolveResult(
                FieldValidationResult.matched(resolvedMatch.stationName()),
                resolved
        );
    }

    private FieldValidationResult validateDrawDate(
            LocalDate drawDate,
            LocalDate batchDrawDate,
            LotteryStationModel contextStation,
            List<String> businessErrors
    ) {
        if (drawDate == null) {
            FieldValidationResult result = FieldValidationResult.unreadable(
                    "Không nhận diện được ngày mở thưởng trên vé. " + UNREADABLE_COVERED_HINT
            );
            businessErrors.add(result.message());
            return result;
        }

        if (batchDrawDate != null && !drawDate.equals(batchDrawDate)) {
            FieldValidationResult result = FieldValidationResult.mismatched(
                    "Ngày mở thưởng nhận diện (" + formatVietnameseDate(drawDate) + ") không khớp phiếu nhập lô (" + formatVietnameseDate(batchDrawDate) + ").",
                    formatVietnameseDate(batchDrawDate)
            );
            businessErrors.add(result.message());
            return result;
        }

        if (contextStation == null) {
            return FieldValidationResult.uncertain("Chưa xác định nhà đài để đối chiếu lịch mở thưởng.");
        }

        List<DayOfWeek> drawDays = contextStation.getDrawDays();
        if (drawDays == null || drawDays.isEmpty()) {
            FieldValidationResult result = FieldValidationResult.uncertain(
                    "Nhà đài chưa cấu hình lịch quay để đối chiếu ngày mở thưởng."
            );
            businessErrors.add(result.message());
            return result;
        }

        DayOfWeek day = drawDate.getDayOfWeek();
        if (!drawDays.contains(day)) {
            FieldValidationResult result = FieldValidationResult.mismatched(
                    "Nhà đài " + contextStation.getName() + " không mở thưởng vào " + formatVietnameseDayOfWeek(day)
                            + " (" + formatVietnameseDate(drawDate) + ").",
                    "drawDays=" + drawDays
            );
            businessErrors.add(result.message());
            return result;
        }

        return FieldValidationResult.matched(formatVietnameseDate(drawDate));
    }

    private FieldValidationResult validateNumbers(
            String numbers,
            LotteryStationModel lineStation,
            List<String> businessErrors
    ) {
        if (numbers == null) {
            FieldValidationResult result = FieldValidationResult.unreadable(
                    "Không nhận diện được dãy số dự thưởng trên vé. " + UNREADABLE_COVERED_HINT
            );
            businessErrors.add(result.message());
            return result;
        }
        if (lineStation.getRegion() == null) {
            FieldValidationResult result = FieldValidationResult.uncertain(
                    "Nhà đài chưa gắn vùng miền để kiểm tra độ dài dãy số."
            );
            businessErrors.add(result.message());
            return result;
        }
        try {
            LotteryTicketNumber.from(
                    numbers,
                    lineStation.getRegion().minLength(),
                    lineStation.getRegion().maxLength()
            );
            return FieldValidationResult.matched(numbers);
        } catch (DomainException e) {
            FieldValidationResult result = FieldValidationResult.mismatched(
                    e.getMessage() != null ? e.getMessage() : "Dãy số dự thưởng không hợp lệ (" + lineStation.getRegion().minLength() + "-" + lineStation.getRegion().maxLength() + " chữ số).",
                    lineStation.getRegion().minLength() + "-" + lineStation.getRegion().maxLength() + " chữ số"
            );
            businessErrors.add(result.message());
            return result;
        }
    }

    private FieldValidationResult validateSerial(
            String serialNumber,
            String numbers,
            LotteryStationModel lineStation,
            LocalDate batchDrawDate,
            List<String> businessErrors
    ) {
        if (serialNumber == null) {
            FieldValidationResult result = FieldValidationResult.unreadable(
                    "Không nhận diện được số sê-ri trên vé. " + UNREADABLE_COVERED_HINT
            );
            businessErrors.add(result.message());
            return result;
        }
        if (!SERIAL_PATTERN.matcher(serialNumber).matches()) {
            FieldValidationResult result = FieldValidationResult.mismatched(
                    "Số sê-ri không đúng định dạng: chủ yếu là chữ số, đúng 1 chữ cái ở đầu hoặc cuối "
                            + "(ví dụ A123456, 123456B). Không chấp nhận chữ cái ở giữa.",
                    "A123456 | 123456B"
            );
            businessErrors.add(result.message());
            return result;
        }

        if (numbers != null && batchDrawDate != null) {
            Optional<Long> existingTicketId = lotteryTicketRepositoryPort
                    .findByUniqueFields(lineStation.getId(), numbers, batchDrawDate)
                    .map(LotteryTicketModel::getId);
            if (existingTicketId.isPresent()
                    && lotteryTicketSerialRepositoryPort.existsByTicketIdAndSerialNumber(
                    existingTicketId.get(), serialNumber)) {
                FieldValidationResult result = FieldValidationResult.mismatched(
                        "Số sê-ri " + serialNumber + " đã tồn tại trong hệ thống (trùng vé).",
                        null
                );
                businessErrors.add(result.message());
                return result;
            }
        }

        return FieldValidationResult.matched(serialNumber);
    }

    private FieldValidationResult validatePrice(
            String ticketType,
            LotteryStationModel lineStation,
            List<String> businessErrors
    ) {
        if (ticketType == null) {
            return FieldValidationResult.unreadable(
                    "Không nhận diện được mệnh giá trên vé. " + UNREADABLE_COVERED_HINT
            );
        }
        BigDecimal ocrPrice = parseMoney(ticketType);
        BigDecimal stationPrice = lineStation.getPrice();
        if (ocrPrice == null) {
            FieldValidationResult result = FieldValidationResult.uncertain(
                    "Không nhận diện được mệnh giá: " + ticketType
            );
            return result;
        }
        if (stationPrice == null) {
            return FieldValidationResult.uncertain("Nhà đài chưa cấu hình mệnh giá vé.");
        }
        BigDecimal expected = stationPrice.setScale(0, RoundingMode.HALF_UP);
        BigDecimal actual = ocrPrice.setScale(0, RoundingMode.HALF_UP);
        if (expected.compareTo(actual) != 0) {
            FieldValidationResult result = FieldValidationResult.mismatched(
                    "Mệnh giá nhận diện (" + formatVnd(actual) + ") không khớp với mệnh giá nhà đài (" + formatVnd(expected) + ").",
                    formatVnd(expected)
            );
            businessErrors.add(result.message());
            return result;
        }
        return FieldValidationResult.matched(formatVnd(expected));
    }

    /**
     * Production batch code printed by the lottery issuer. Optional field.
     * Missing/unread is recorded as UNREADABLE with friendly notice, but excluded from triggering hard error.
     */
    private FieldValidationResult validateProductionBatchCode(String ocrBatchCode) {
        if (ocrBatchCode == null || ocrBatchCode.isBlank()) {
            return FieldValidationResult.unreadable(
                    "Không nhận diện được ký hiệu / mã lô trên vé (tùy chọn). " + UNREADABLE_COVERED_HINT
            );
        }
        if (isSerialShape(ocrBatchCode) || !BATCH_CODE_PATTERN.matcher(ocrBatchCode).matches()) {
            return FieldValidationResult.mismatched(
                    "Ký hiệu / mã lô phải gồm cả chữ và số (ví dụ 08D, 8K4, 4E2) — không nhầm với số sê-ri.",
                    ocrBatchCode
            );
        }
        return FieldValidationResult.of(OcrFieldValidationStatus.MATCHED, null, ocrBatchCode);
    }

    private double adjustConfidence(
            Map<String, Double> fieldConfidences,
            Map<String, FieldValidationResult> fieldValidations
    ) {
        Map<String, Double> confidences = fieldConfidences != null ? fieldConfidences : Map.of();
        double min = 1.0;
        boolean any = false;
        for (String field : REQUIRED_FIELDS) {
            double ocr = confidences.getOrDefault(field, 0.0);
            FieldValidationResult validation = fieldValidations.get(field);
            double factor = MATCHED_FACTOR;
            if (validation != null) {
                factor = switch (validation.status()) {
                    case MATCHED -> MATCHED_FACTOR;
                    case UNCERTAIN -> UNCERTAIN_FACTOR;
                    case UNREADABLE -> UNREADABLE_FACTOR;
                    case MISMATCHED, NOT_FOUND -> MISMATCH_FACTOR;
                };
            }
            min = Math.min(min, ocr * factor);
            any = true;
        }
        return any ? clamp(min) : 0.0;
    }

    private OcrOverallValidationStatus deriveOverall(
            Map<String, FieldValidationResult> fields,
            ScannedTicketStatus layer1Status
    ) {
        boolean hasCriticalFail = fields.entrySet().stream()
                .filter(e -> REQUIRED_FIELDS.contains(e.getKey()) || "ticketType".equals(e.getKey()))
                .anyMatch(e -> e.getValue().status() == OcrFieldValidationStatus.MISMATCHED
                        || e.getValue().status() == OcrFieldValidationStatus.NOT_FOUND);

        boolean hasReviewNeeded = fields.entrySet().stream()
                .filter(e -> !"batchCode".equals(e.getKey()))
                .anyMatch(e -> e.getValue().status() == OcrFieldValidationStatus.UNCERTAIN
                        || e.getValue().status() == OcrFieldValidationStatus.UNREADABLE);

        if (hasCriticalFail) {
            return OcrOverallValidationStatus.INVALID;
        }
        if (hasReviewNeeded
                || layer1Status == ScannedTicketStatus.NEEDS_REVIEW
                || layer1Status == ScannedTicketStatus.INCOMPLETE
                || layer1Status == ScannedTicketStatus.PARTIAL
                || layer1Status == ScannedTicketStatus.FAILED) {
            return OcrOverallValidationStatus.NEEDS_REVIEW;
        }
        return OcrOverallValidationStatus.VALID;
    }

    private ScannedTicketStatus downgradeStatus(
            ScannedTicketStatus layer1Status,
            OcrOverallValidationStatus overall,
            Map<String, FieldValidationResult> fields,
            List<String> businessErrors
    ) {
        if (layer1Status == ScannedTicketStatus.FAILED) {
            return ScannedTicketStatus.FAILED;
        }

        boolean hasUnreadableRequired = fields.entrySet().stream()
                .filter(e -> REQUIRED_FIELDS.contains(e.getKey()))
                .anyMatch(e -> e.getValue().status() == OcrFieldValidationStatus.UNREADABLE);

        boolean hasCriticalFail = fields.entrySet().stream()
                .filter(e -> REQUIRED_FIELDS.contains(e.getKey()) || "ticketType".equals(e.getKey()))
                .anyMatch(e -> e.getValue().status() == OcrFieldValidationStatus.MISMATCHED
                        || e.getValue().status() == OcrFieldValidationStatus.NOT_FOUND);

        if (hasCriticalFail || overall == OcrOverallValidationStatus.INVALID) {
            return ScannedTicketStatus.INCOMPLETE;
        }
        if (hasUnreadableRequired) {
            return ScannedTicketStatus.PARTIAL;
        }
        if (overall == OcrOverallValidationStatus.NEEDS_REVIEW) {
            if (layer1Status == ScannedTicketStatus.COMPLETE) {
                return ScannedTicketStatus.NEEDS_REVIEW;
            }
            if (layer1Status == ScannedTicketStatus.PARTIAL) {
                return ScannedTicketStatus.PARTIAL;
            }
        }
        // Incomplete Layer-1 with only soft business notes stays PARTIAL when any field was read.
        if (layer1Status == ScannedTicketStatus.INCOMPLETE && !businessErrors.isEmpty() && hasAnyMatched(fields)) {
            return ScannedTicketStatus.PARTIAL;
        }
        return layer1Status != null ? layer1Status : ScannedTicketStatus.INCOMPLETE;
    }

    private static boolean hasAnyMatched(Map<String, FieldValidationResult> fields) {
        return fields.values().stream().anyMatch(v -> v.status() == OcrFieldValidationStatus.MATCHED);
    }

    static BigDecimal parseMoney(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String digits = raw.replaceAll("[^0-9]", "");
        if (digits.isEmpty()) {
            return null;
        }
        try {
            return new BigDecimal(digits);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    /** Human-readable VND, e.g. 10000 → "10.000 VND". */
    static String formatVnd(BigDecimal amount) {
        if (amount == null) {
            return null;
        }
        String plain = amount.setScale(0, RoundingMode.HALF_UP).toPlainString();
        StringBuilder grouped = new StringBuilder();
        int count = 0;
        for (int i = plain.length() - 1; i >= 0; i--) {
            if (count > 0 && count % 3 == 0) {
                grouped.insert(0, '.');
            }
            grouped.insert(0, plain.charAt(i));
            count++;
        }
        return grouped + " VND";
    }

    private static double clamp(double value) {
        return Math.max(0.0, Math.min(1.0, value));
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public record SerialBatchPair(String serialNumber, String batchCode) {
    }

    /**
     * Move production lot codes out of serialNumber (and vice versa) so
     * values like {@code 4E2}/{@code XSCMG997} are not treated as serials.
     */
    public static SerialBatchPair reconcileSerialAndBatchCode(String serialNumber, String batchCode) {
        String serial = trimToNull(serialNumber);
        String batch = trimToNull(batchCode);
        boolean serialOk = isSerialShape(serial);
        boolean batchOk = isBatchCodeShape(batch);

        if (serial != null && !serialOk && isBatchCodeShape(serial)) {
            if (!batchOk) {
                batch = serial;
            }
            serial = null;
            serialOk = false;
        }

        if (batch != null && isSerialShape(batch) && !serialOk) {
            serial = batch;
            batch = null;
        }

        return new SerialBatchPair(serial, batch);
    }

    public static ExtractedTicketFieldsResponse reconcileExtractedFields(
            ExtractedTicketFieldsResponse extracted
    ) {
        if (extracted == null) {
            return null;
        }
        SerialBatchPair pair = reconcileSerialAndBatchCode(
                extracted.serialNumber(), extracted.batchCode()
        );
        if (Objects.equals(pair.serialNumber(), trimToNull(extracted.serialNumber()))
                && Objects.equals(pair.batchCode(), trimToNull(extracted.batchCode()))) {
            return extracted;
        }
        return new ExtractedTicketFieldsResponse(
                extracted.stationName(),
                extracted.stationCode(),
                pair.serialNumber(),
                extracted.numbers(),
                extracted.drawDate(),
                extracted.ticketType(),
                pair.batchCode()
        );
    }

    private static boolean isSerialShape(String value) {
        return value != null && SERIAL_PATTERN.matcher(value).matches();
    }

    private static boolean isBatchCodeShape(String value) {
        return value != null
                && !isSerialShape(value)
                && BATCH_CODE_PATTERN.matcher(value).matches();
    }
}
