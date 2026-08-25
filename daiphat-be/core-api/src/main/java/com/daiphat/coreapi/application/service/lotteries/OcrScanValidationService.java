package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.response.lotteries.scan.ExtractedTicketFieldsResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.FieldValidationResult;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrFieldValidationStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrOverallValidationStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ScannedTicketStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.domain.valueobject.LotteryTicketNumber;
import com.daiphat.coreapi.shared.util.LotteryStationNameResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
            Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z0-9]{4,10}$");

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
     */
    public ValidationOutcome validate(
            ExtractedTicketFieldsResponse extracted,
            Map<String, Double> fieldConfidences,
            ScannedTicketStatus layer1Status,
            LotteryStationModel lineStation,
            LocalDate batchDrawDate
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

        StationResolveResult stationResolve = resolveStation(stationName, stationCode, lineStation, businessErrors);
        fields.put("stationName", stationResolve.fieldResult());
        LotteryStationModel contextStation = stationResolve.station() != null
                ? stationResolve.station()
                : lineStation;

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
                    ? FieldValidationResult.unreadable("OCR không đọc được dãy số. " + UNREADABLE_COVERED_HINT)
                    : FieldValidationResult.uncertain("Chưa xác định nhà đài để kiểm tra dãy số."));
            fields.put("serialNumber", serialNumber == null
                    ? FieldValidationResult.unreadable("OCR không đọc được serial. " + UNREADABLE_COVERED_HINT)
                    : FieldValidationResult.uncertain("Chưa xác định nhà đài để kiểm tra serial."));
            fields.put("ticketType", ticketType == null
                    ? FieldValidationResult.unreadable("OCR không đọc được giá vé. " + UNREADABLE_COVERED_HINT)
                    : FieldValidationResult.uncertain("Chưa xác định nhà đài để kiểm tra giá vé."));
            if (numbers == null) {
                businessErrors.add(fields.get("numbers").message());
            }
            if (serialNumber == null) {
                businessErrors.add(fields.get("serialNumber").message());
            }
        }

        fields.put("batchCode", validateProductionBatchCode(batchCode));

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

    private record StationResolveResult(FieldValidationResult fieldResult, LotteryStationModel station) {
    }

    private StationResolveResult resolveStation(
            String stationName,
            String stationCode,
            LotteryStationModel lineStation,
            List<String> businessErrors
    ) {
        if (stationName == null && stationCode == null) {
            FieldValidationResult result = FieldValidationResult.unreadable(
                    "OCR không đọc được nhà đài. " + UNREADABLE_COVERED_HINT
            );
            businessErrors.add(result.message());
            return new StationResolveResult(result, null);
        }

        List<LotteryStationModel> stations = lotteryStationRepositoryPort.findAll();
        List<LotteryStationNameResolver.Candidate> candidates = stations.stream()
                .filter(s -> s.getDeletedAt() == null)
                .map(s -> new LotteryStationNameResolver.Candidate(s.getId(), s.getName()))
                .toList();

        String lookup = stationName != null ? stationName : stationCode;
        LotteryStationNameResolver.Match match =
                stationNameResolver.resolve(lookup, candidates, Map.of());

        LotteryStationNameResolver.Match resolvedMatch = match;

        if (!resolvedMatch.isResolved()) {
            if (stationCode != null) {
                Optional<LotteryStationModel> byCode = stations.stream()
                        .filter(s -> s.getDeletedAt() == null && stationCode.equalsIgnoreCase(s.getCode()))
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
                    "Nhà đài OCR '" + lookup + "' không tìm thấy trong hệ thống."
            );
            businessErrors.add(result.message());
            return new StationResolveResult(result, null);
        }

        final Long resolvedStationId = resolvedMatch.lotteryStationId();
        LotteryStationModel resolved = stations.stream()
                .filter(s -> resolvedStationId.equals(s.getId()))
                .findFirst()
                .orElse(null);

        if (lineStation != null && !lineStation.getId().equals(resolvedStationId)) {
            FieldValidationResult result = FieldValidationResult.mismatched(
                    "Nhà đài OCR '" + resolvedMatch.stationName() + "' không khớp dòng nhập lô ("
                            + lineStation.getName() + ").",
                    lineStation.getName()
            );
            businessErrors.add(result.message());
            return new StationResolveResult(result, resolved);
        }

        String expectedName = lineStation != null ? lineStation.getName() : resolvedMatch.stationName();
        return new StationResolveResult(FieldValidationResult.matched(expectedName), resolved);
    }

    private FieldValidationResult validateDrawDate(
            LocalDate drawDate,
            LocalDate batchDrawDate,
            LotteryStationModel contextStation,
            List<String> businessErrors
    ) {
        if (drawDate == null) {
            FieldValidationResult result = FieldValidationResult.unreadable(
                    "OCR không đọc được ngày xổ. " + UNREADABLE_COVERED_HINT
            );
            businessErrors.add(result.message());
            return result;
        }

        if (batchDrawDate != null && !drawDate.equals(batchDrawDate)) {
            FieldValidationResult result = FieldValidationResult.mismatched(
                    "Ngày xổ OCR (" + drawDate + ") không khớp phiếu nhập lô (" + batchDrawDate + ").",
                    batchDrawDate.toString()
            );
            businessErrors.add(result.message());
            return result;
        }

        if (contextStation == null) {
            return FieldValidationResult.uncertain("Chưa xác định nhà đài để đối chiếu lịch quay.");
        }

        List<DayOfWeek> drawDays = contextStation.getDrawDays();
        if (drawDays == null || drawDays.isEmpty()) {
            FieldValidationResult result = FieldValidationResult.uncertain(
                    "Nhà đài chưa cấu hình lịch quay để đối chiếu ngày xổ."
            );
            businessErrors.add(result.message());
            return result;
        }

        DayOfWeek day = drawDate.getDayOfWeek();
        if (!drawDays.contains(day)) {
            FieldValidationResult result = FieldValidationResult.mismatched(
                    "Nhà đài " + contextStation.getName() + " không xổ vào " + day
                            + " (ngày OCR " + drawDate + ").",
                    "drawDays=" + drawDays
            );
            businessErrors.add(result.message());
            return result;
        }

        return FieldValidationResult.matched(drawDate.toString());
    }

    private FieldValidationResult validateNumbers(
            String numbers,
            LotteryStationModel lineStation,
            List<String> businessErrors
    ) {
        if (numbers == null) {
            FieldValidationResult result = FieldValidationResult.unreadable(
                    "OCR không đọc được dãy số. " + UNREADABLE_COVERED_HINT
            );
            businessErrors.add(result.message());
            return result;
        }
        if (lineStation.getRegion() == null) {
            FieldValidationResult result = FieldValidationResult.uncertain(
                    "Nhà đài chưa gắn vùng để kiểm tra độ dài dãy số."
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
                    e.getMessage() != null ? e.getMessage() : "Dãy số không hợp lệ.",
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
                    "OCR không đọc được serial. " + UNREADABLE_COVERED_HINT
            );
            businessErrors.add(result.message());
            return result;
        }
        if (!SERIAL_PATTERN.matcher(serialNumber).matches()) {
            FieldValidationResult result = FieldValidationResult.mismatched(
                    "Serial không đúng định dạng (chữ và số, 4-10 ký tự).",
                    "A-Za-z0-9 4-10"
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
                        "Sê-ri " + serialNumber + " đã tồn tại trong hệ thống.",
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
                    "OCR không đọc được giá vé. " + UNREADABLE_COVERED_HINT
            );
        }
        BigDecimal ocrPrice = parseMoney(ticketType);
        BigDecimal stationPrice = lineStation.getPrice();
        if (ocrPrice == null) {
            FieldValidationResult result = FieldValidationResult.uncertain(
                    "Không parse được giá vé OCR: " + ticketType
            );
            return result;
        }
        if (stationPrice == null) {
            return FieldValidationResult.uncertain("Nhà đài chưa cấu hình giá vé.");
        }
        BigDecimal expected = stationPrice.setScale(0, RoundingMode.HALF_UP);
        BigDecimal actual = ocrPrice.setScale(0, RoundingMode.HALF_UP);
        if (expected.compareTo(actual) != 0) {
            FieldValidationResult result = FieldValidationResult.mismatched(
                    "Giá OCR (" + formatVnd(actual) + ") khác giá nhà đài (" + formatVnd(expected) + ").",
                    formatVnd(expected)
            );
            businessErrors.add(result.message());
            return result;
        }
        return FieldValidationResult.matched(formatVnd(expected));
    }

    /**
     * Production batch code printed by the lottery issuer. Not validated against
     * system import-batch codes — missing/unread → UNREADABLE only.
     */
    private FieldValidationResult validateProductionBatchCode(String ocrBatchCode) {
        if (ocrBatchCode == null) {
            return FieldValidationResult.unreadable(
                    "OCR không đọc được mã sản xuất (batch code) trên vé. " + UNREADABLE_COVERED_HINT
            );
        }
        return FieldValidationResult.of(OcrFieldValidationStatus.MATCHED, null, null);
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
}
