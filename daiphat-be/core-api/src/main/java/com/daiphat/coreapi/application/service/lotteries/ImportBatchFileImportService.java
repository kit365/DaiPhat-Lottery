package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.BulkCreateLotteryTicketsRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateImportBatchLineRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateImportBatchRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketNumberSectionRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketSerialRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ImportBatchFileImportCommitRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ImportBatchFileMappingRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ImportBatchFilePreviewRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.SaveImportBatchFileMappingProfileRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.SaveLotteryStationAliasRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateImportBatchFileConfigRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileGroupResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileExportResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileFieldRuleResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileImportItemResultResponse;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileConfigResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileImportResultResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileJobResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileMappingProfileResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileInspectResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileIssueResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFilePreviewResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileRowResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileStationSuggestionResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFilePricingMismatchResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileScheduleMismatchResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileSupplierIdentityResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileStationSummaryResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchLineResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchResponse;
import com.daiphat.coreapi.application.port.in.lotteries.ImportBatchFileImportServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.ImportBatchServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotterySupplierServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.application.dto.lotteries.ImportBatchFileConfig;
import com.daiphat.coreapi.application.dto.lotteries.ImportBatchOriginalFileBundle;
import com.daiphat.coreapi.application.dto.response.lotteries.SettlementImportFileCheckFileResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SettlementImportFileCheckTicketResponse;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.port.out.file.RemoteFilePort;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.domain.model.enums.lottery.SettlementImportFileCheckStatus;
import com.daiphat.coreapi.application.port.out.lotteries.LotterySupplierRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchFileGroupStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchFileIssueCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchFileIssueSeverity;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchFileJobStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchFileRowStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.enums.lottery.InputSource;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchFileImportJobEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchFileImportLogEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchFileMappingProfileEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationAliasEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchFileImportJobRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchFileImportLogRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchFileMappingProfileRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryStationAliasRepository;
import com.daiphat.coreapi.application.dto.lotteries.ImportBatchDocument;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.shared.util.BusinessDocumentIssuer;
import com.daiphat.coreapi.shared.util.CsvWriter;
import com.daiphat.coreapi.shared.util.ImportBatchDocumentWriter;
import com.daiphat.coreapi.shared.util.ImportBatchDrawDateWindowPolicy;
import com.daiphat.coreapi.shared.util.ImportBatchFileCellParser;
import com.daiphat.coreapi.shared.util.ImportBatchFileMappingDetector;
import com.daiphat.coreapi.shared.util.ImportBatchStationEligibilityResolver;
import com.daiphat.coreapi.shared.util.LotteryDrawScheduleFormatter;
import com.daiphat.coreapi.shared.util.ImportBatchTypeResolver;
import com.daiphat.coreapi.shared.util.ImportCostCalculator;
import com.daiphat.coreapi.shared.util.LotteryStationCodeGenerator;
import com.daiphat.coreapi.shared.util.LotteryStationNameResolver;
import com.daiphat.coreapi.shared.util.ImportBatchFilePricingComparator;
import com.daiphat.coreapi.shared.util.SupplierIdentityScanner;
import com.daiphat.coreapi.shared.util.SupplierTicketIntakeWindowPolicy;
import com.daiphat.coreapi.shared.util.VietnameseTextNormalizer;
import com.daiphat.coreapi.shared.util.tabular.TabularFileParser;
import com.daiphat.coreapi.shared.util.tabular.TabularNumberStyle;
import com.daiphat.coreapi.shared.util.tabular.TabularParseOptions;
import com.daiphat.coreapi.shared.util.tabular.TabularRow;
import com.daiphat.coreapi.shared.util.tabular.TabularTable;
import com.daiphat.coreapi.shared.util.tabular.TabularValueParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Turns a supplier's .csv / .xlsx delivery note into import batches and, when the
 * file carries them, the tickets themselves.
 *
 * <p>Row shape when tickets are included: one row is one lottery number plus every
 * serial printed with it. That mirrors the data model, where lottery_tickets holds
 * the number and lottery_ticket_serials holds the physical tickets.
 *
 * <p>The file typically covers a whole week while a batch can only be created for
 * today or tomorrow, so the same file is uploaded on successive days and each
 * upload picks up the rows that have come into range. Rows outside that window are
 * reported as skipped, never as errors.
 *
 * <p>Nothing here re-implements a business rule: batches go through
 * {@link ImportBatchServicePort#create} and tickets through
 * {@link LotteryTicketServicePort#createBulk}, exactly as manual entry does.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ImportBatchFileImportService implements ImportBatchFileImportServicePort {

    private static final int MAX_SAMPLE_ROWS = 5;

    /** Where the supplier's uploads are kept as settlement evidence. */
    private static final String IMPORT_EVIDENCE_FOLDER = "import-batch-files";

    private static final DateTimeFormatter DATE_DISPLAY = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private static final DateTimeFormatter DATE_TIME_DISPLAY =
            DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

    private static final DateTimeFormatter TIME_DISPLAY = DateTimeFormatter.ofPattern("HH:mm");

    private final TabularFileParser tabularFileParser;
    private final ImportBatchFileMappingDetector mappingDetector;
    private final LotteryStationNameResolver stationNameResolver;
    private final ImportBatchDrawDateWindowPolicy drawDateWindowPolicy;
    private final SupplierTicketIntakeWindowPolicy intakeWindowPolicy;
    private final ImportBatchFilePricingComparator pricingComparator;
    private final SupplierIdentityScanner supplierIdentityScanner;
    private final LotterySupplierRepositoryPort lotterySupplierRepositoryPort;
    private final ImportBatchDocumentWriter documentWriter;
    private final BusinessDocumentIssuer businessDocumentIssuer;
    private final UserLookupServicePort userLookupServicePort;
    private final ImportBatchTypeResolver importBatchTypeResolver;
    private final ImportBatchStationEligibilityResolver stationEligibilityResolver;
    private final LotteryStationServicePort lotteryStationServicePort;
    private final LotteryStationRepositoryPort lotteryStationRepositoryPort;
    private final LotteryStationCodeGenerator lotteryStationCodeGenerator;
    private final LotterySupplierServicePort lotterySupplierServicePort;
    private final ImportBatchServicePort importBatchServicePort;
    private final LotteryTicketServicePort lotteryTicketServicePort;
    private final ImportBatchRepositoryPort importBatchRepositoryPort;
    private final ImportBatchLineRepositoryPort importBatchLineRepositoryPort;
    private final LotteryTicketRepositoryPort lotteryTicketRepositoryPort;
    private final LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;
    private final LotteryStationAliasRepository lotteryStationAliasRepository;
    private final ImportBatchFileMappingProfileRepository mappingProfileRepository;
    private final ImportBatchFileImportLogRepository importLogRepository;
    private final StoragePort storagePort;
    private final RemoteFilePort remoteFilePort;
    private final ImportBatchFileConfigService importBatchFileConfigService;
    private final ImportBatchFileImportJobRepository importJobRepository;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    // ------------------------------------------------------------ inspect

    @Override
    @Transactional(readOnly = true)
    public ImportBatchFileInspectResponse inspect(byte[] content, String fileName, Long supplierId) {
        ImportBatchFileConfig config = importBatchFileConfigService.get();
        guardFileSize(content, config);
        Map<String, List<String>> aliases = mappingDetector.resolveAliases(config.fieldAliases());

        // A business delivery note opens with a letterhead, so the first row of the
        // file is often a company name rather than the column labels. Parse once to
        // see the whole file, find the row that actually names the columns, then
        // parse again from there so headers and rows line up.
        TabularTable firstPass = tabularFileParser.parse(
                content, fileName, new TabularParseOptions(null, null, null, config.maxRows()));
        final int headerRowIndex = mappingDetector.detectHeaderRowIndex(firstPass, aliases);
        final TabularTable table = headerRowIndex == 0
                ? firstPass
                : tabularFileParser.parse(
                        content, fileName,
                        new TabularParseOptions(headerRowIndex, null, null, config.maxRows()));

        String headerSignature = mappingDetector.headerSignature(table.headers());
        Optional<ImportBatchFileMappingProfileEntity> profile = supplierId == null
                ? Optional.empty()
                : mappingProfileRepository.findBySupplierIdAndHeaderSignatureAndDeletedAtIsNull(
                        supplierId, headerSignature);

        ImportBatchFileMappingRequest suggested = profile
                .flatMap(this::readMapping)
                .orElseGet(() -> mappingDetector.detect(table, aliases, headerRowIndex));

        return ImportBatchFileInspectResponse.builder()
                .detectedHeaders(table.headers())
                .sampleRows(sampleRows(table))
                .totalRows(table.rows().size())
                .fileHash(mappingDetector.sha256(content))
                .headerSignature(headerSignature)
                .profileMatched(profile.isPresent())
                .suggestedMapping(suggested)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ImportBatchOriginalFileBundle loadOriginalFilesForSettlementBatches(
            List<Long> importBatchIds,
            Map<Long, String> batchCodeById,
            Long supplierId,
            LocalDate drawDate
    ) {
        List<Long> ids = importBatchIds == null
                ? List.of()
                : importBatchIds.stream().filter(Objects::nonNull).distinct().toList();
        if (ids.isEmpty() || drawDate == null) {
            return new ImportBatchOriginalFileBundle(List.of(), List.of(), List.of(), false);
        }

        List<ImportBatchFileImportLogEntity> logs =
                importLogRepository.findByImportBatchIdInAndDeletedAtIsNull(ids);
        Map<Long, ImportBatchFileImportLogEntity> logByBatchId = new LinkedHashMap<>();
        for (ImportBatchFileImportLogEntity log : logs) {
            logByBatchId.putIfAbsent(log.getImportBatchId(), log);
        }

        Map<String, EvidenceParse> parsedByUrl = new LinkedHashMap<>();
        Set<String> ticketsEmittedForUrl = new HashSet<>();
        List<SettlementImportFileCheckFileResponse> files = new ArrayList<>();
        List<SettlementImportFileCheckTicketResponse> tickets = new ArrayList<>();
        List<ImportBatchOriginalFileBundle.StationQuantity> declared = new ArrayList<>();
        boolean importsTickets = false;

        for (Long batchId : ids) {
            String batchCode = batchCodeById == null ? null : batchCodeById.get(batchId);
            ImportBatchFileImportLogEntity importLog = logByBatchId.get(batchId);
            if (importLog == null || importLog.getOriginalFileUrl() == null || importLog.getOriginalFileUrl().isBlank()) {
                files.add(fileRow(
                        batchId,
                        batchCode,
                        importLog == null ? null : importLog.getFileName(),
                        importLog == null ? null : importLog.getOriginalFileUrl(),
                        SettlementImportFileCheckStatus.NO_FILE,
                        "Phiếu nhập này không có tệp gốc."));
                continue;
            }

            String url = importLog.getOriginalFileUrl();
            EvidenceParse parsed = parsedByUrl.get(url);
            if (parsed == null) {
                parsed = downloadAndParse(importLog, supplierId, drawDate);
                parsedByUrl.put(url, parsed);
            }

            files.add(fileRow(
                    batchId,
                    batchCode,
                    parsed.fileName(),
                    url,
                    parsed.status(),
                    parsed.errorMessage()));

            if (parsed.status() != SettlementImportFileCheckStatus.PARSED || !ticketsEmittedForUrl.add(url)) {
                continue;
            }
            if (parsed.importsTickets()) {
                importsTickets = true;
            }
            for (SettlementImportFileCheckTicketResponse ticket : parsed.tickets()) {
                tickets.add(SettlementImportFileCheckTicketResponse.builder()
                        .serialNumber(ticket.serialNumber())
                        .numbers(ticket.numbers())
                        .lotteryStationId(ticket.lotteryStationId())
                        .stationName(ticket.stationName())
                        .importBatchId(batchId)
                        .importBatchCode(batchCode)
                        .sourceFileName(parsed.fileName())
                        .build());
            }
            declared.addAll(parsed.declaredStationQuantities());
        }

        return new ImportBatchOriginalFileBundle(files, tickets, declared, importsTickets);
    }

    private SettlementImportFileCheckFileResponse fileRow(
            Long batchId,
            String batchCode,
            String fileName,
            String url,
            SettlementImportFileCheckStatus status,
            String errorMessage
    ) {
        return SettlementImportFileCheckFileResponse.builder()
                .importBatchId(batchId)
                .importBatchCode(batchCode)
                .fileName(fileName)
                .originalFileUrl(url)
                .status(status)
                .errorMessage(errorMessage)
                .build();
    }

    private EvidenceParse downloadAndParse(
            ImportBatchFileImportLogEntity importLog,
            Long supplierId,
            LocalDate drawDate
    ) {
        String fileName = importLog.getFileName() == null || importLog.getFileName().isBlank()
                ? "import-batch-file.csv"
                : importLog.getFileName();
        byte[] content;
        try {
            content = remoteFilePort.download(importLog.getOriginalFileUrl()).data();
        } catch (RuntimeException e) {
            log.warn("Could not download original import file url={} batchId={}",
                    importLog.getOriginalFileUrl(), importLog.getImportBatchId(), e);
            return EvidenceParse.failed(
                    fileName,
                    SettlementImportFileCheckStatus.DOWNLOAD_FAILED,
                    "Không tải được tệp gốc từ lưu trữ.");
        }
        try {
            return parseOriginalFileForDrawDate(content, fileName, supplierId, drawDate);
        } catch (RuntimeException e) {
            log.warn("Could not parse original import file name={} batchId={}",
                    fileName, importLog.getImportBatchId(), e);
            return EvidenceParse.failed(
                    fileName,
                    SettlementImportFileCheckStatus.PARSE_FAILED,
                    e instanceof DomainException de && de.getMessage() != null
                            ? de.getMessage()
                            : "Không đọc được nội dung tệp.");
        }
    }

    private EvidenceParse parseOriginalFileForDrawDate(
            byte[] content,
            String fileName,
            Long supplierId,
            LocalDate drawDate
    ) {
        ImportBatchFileInspectResponse inspected = inspect(content, fileName, supplierId);
        ImportBatchFileMappingRequest mapping = withFallbackDrawDate(inspected.suggestedMapping(), drawDate);
        ImportBatchFileConfig config = importBatchFileConfigService.get();

        TabularTable table = tabularFileParser.parse(
                content, fileName, new TabularParseOptions(
                        mapping.headerRowIndex(), mapping.delimiter(), mapping.charset(), config.maxRows()));
        validateMapping(table, mapping);

        String serialSeparator = mapping.serialSeparator() == null || mapping.serialSeparator().isEmpty()
                ? config.serialSeparator()
                : mapping.serialSeparator();

        List<LotteryStationModel> scheduled = lotteryStationServicePort.getScheduleModelsByDrawDate(drawDate);
        List<LotteryStationNameResolver.Candidate> candidates = scheduled.stream()
                .map(station -> new LotteryStationNameResolver.Candidate(station.getId(), station.getName()))
                .toList();
        Map<Long, LotteryStationModel> stationsById = scheduled.stream()
                .collect(Collectors.toMap(LotteryStationModel::getId, station -> station, (a, b) -> a));
        GroupContext context = new GroupContext(
                drawDate,
                ImportBatchImportMode.IN_DAY,
                candidates,
                stationsById,
                loadAliasIndex(),
                LocalDateTime.now(clock),
                serialSeparator);

        List<SettlementImportFileCheckTicketResponse> tickets = new ArrayList<>();
        Map<Long, ImportBatchOriginalFileBundle.StationQuantity> declaredByStation = new LinkedHashMap<>();
        Set<String> seenSerials = new HashSet<>();

        for (TabularRow row : table.rows()) {
            if (isTrailerRow(row, mapping)) {
                break;
            }
            PendingRow pending = readRow(row, mapping);
            LocalDate rowDate = pending.drawDate() != null ? pending.drawDate() : drawDate;
            if (!drawDate.equals(rowDate)) {
                continue;
            }
            StationResolution station = resolveStationForEvidence(pending, context);
            if (mapping.importsTickets()) {
                String numbers = pending.numbersText() == null ? null : pending.numbersText().trim();
                List<String> serials = ImportBatchFileCellParser.splitList(pending.serialsText(), serialSeparator);
                for (String serial : serials) {
                    String key = (station.stationId() == null ? "" : station.stationId())
                            + "|" + serial.toLowerCase(Locale.ROOT);
                    if (!seenSerials.add(key)) {
                        continue;
                    }
                    tickets.add(SettlementImportFileCheckTicketResponse.builder()
                            .serialNumber(serial)
                            .numbers(numbers)
                            .lotteryStationId(station.stationId())
                            .stationName(station.stationName() != null ? station.stationName() : pending.stationText())
                            .sourceFileName(fileName)
                            .build());
                }
            } else if (station.stationId() != null) {
                Integer quantity = readQuantity(pending, mapping, new ArrayList<>());
                if (quantity != null && quantity > 0) {
                    declaredByStation.merge(
                            station.stationId(),
                            new ImportBatchOriginalFileBundle.StationQuantity(
                                    station.stationId(),
                                    station.stationName(),
                                    quantity),
                            (left, right) -> new ImportBatchOriginalFileBundle.StationQuantity(
                                    left.lotteryStationId(),
                                    left.stationName(),
                                    left.quantity() + right.quantity()));
                }
            }
        }

        return new EvidenceParse(
                fileName,
                SettlementImportFileCheckStatus.PARSED,
                null,
                mapping.importsTickets(),
                tickets,
                List.copyOf(declaredByStation.values())
        );
    }

    private ImportBatchFileMappingRequest withFallbackDrawDate(
            ImportBatchFileMappingRequest mapping,
            LocalDate drawDate
    ) {
        if (mapping == null) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_FILE_DRAW_DATE_SOURCE_REQUIRED);
        }
        return ImportBatchFileMappingRequest.builder()
                .headerRowIndex(mapping.headerRowIndex())
                .delimiter(mapping.delimiter())
                .charset(mapping.charset())
                .numberStyle(mapping.numberStyle())
                .dateFormat(mapping.dateFormat())
                .drawDateColumn(mapping.drawDateColumn())
                .fallbackDrawDate(mapping.fallbackDrawDate() != null ? mapping.fallbackDrawDate() : drawDate)
                .stationCodeColumn(mapping.stationCodeColumn())
                .stationColumn(mapping.stationColumn())
                .quantityColumn(mapping.quantityColumn())
                .numbersColumn(mapping.numbersColumn())
                .serialsColumn(mapping.serialsColumn())
                .ticketImageColumn(mapping.ticketImageColumn())
                .serialSeparator(mapping.serialSeparator())
                .importCostColumn(mapping.importCostColumn())
                .build();
    }

    private StationResolution resolveStationForEvidence(PendingRow row, GroupContext context) {
        Long stationId = null;
        if (row.stationCodeText() != null) {
            String code = lotteryStationCodeGenerator.normalize(row.stationCodeText());
            if (code != null) {
                stationId = lotteryStationRepositoryPort.findByCode(code)
                        .map(LotteryStationModel::getId)
                        .orElse(null);
            }
        }
        if (stationId == null && row.stationText() != null) {
            LotteryStationNameResolver.Match match = stationNameResolver.resolve(
                    row.stationText(), context.candidates(), context.aliasIndex());
            if (match.isResolved()) {
                stationId = match.lotteryStationId();
            }
        }
        if (stationId == null) {
            return StationResolution.unresolved();
        }
        LotteryStationModel station = context.stationsById().get(stationId);
        if (station == null) {
            station = lotteryStationRepositoryPort.findById(stationId).orElse(null);
        }
        String name = station != null ? station.getName() : row.stationText();
        return new StationResolution(stationId, name, null, null, RegionLength.of(station), true);
    }

    private record EvidenceParse(
            String fileName,
            SettlementImportFileCheckStatus status,
            String errorMessage,
            boolean importsTickets,
            List<SettlementImportFileCheckTicketResponse> tickets,
            List<ImportBatchOriginalFileBundle.StationQuantity> declaredStationQuantities
    ) {
        static EvidenceParse failed(String fileName, SettlementImportFileCheckStatus status, String errorMessage) {
            return new EvidenceParse(fileName, status, errorMessage, false, List.of(), List.of());
        }
    }

    // ------------------------------------------------------------ preview

    @Override
    @Transactional(readOnly = true)
    public ImportBatchFilePreviewResponse preview(
            byte[] content,
            String fileName,
            ImportBatchFilePreviewRequest request,
            UUID operatorId
    ) {
        ImportBatchFileConfig config = importBatchFileConfigService.get();
        guardFileSize(content, config);
        LotterySupplierModel supplier = lotterySupplierServicePort.getActiveModelById(request.supplierId());
        LocalDateTime now = LocalDateTime.now(clock);

        ImportBatchFileResolution resolution =
                resolve(content, fileName, request.mapping(), supplier, operatorId, now, config);

        List<ImportBatchFileRowResponse> allRows = resolution.allRows();
        return ImportBatchFilePreviewResponse.builder()
                .appliedMapping(appliedMapping(request.mapping(), resolution.table()))
                .detectedHeaders(resolution.table().headers())
                .fileHash(mappingDetector.sha256(content))
                .windowFrom(drawDateWindowPolicy.fileImportFrom(now))
                .windowTo(drawDateWindowPolicy.fileImportTo(now))
                .importsTickets(request.mapping().importsTickets())
                .totalRows(allRows.size())
                .importableRows((int) allRows.stream().filter(ImportBatchFileRowResponse::isImportable).count())
                .skippedRows((int) allRows.stream()
                        .filter(row -> row.status() == ImportBatchFileRowStatus.SKIPPED).count())
                .errorRows((int) allRows.stream()
                        .filter(row -> row.status() == ImportBatchFileRowStatus.ERROR).count())
                .supplierIdentity(resolution.supplierIdentity())
                .groups(resolution.groups())
                .build();
    }

    // ------------------------------------------------------------- commit

    /**
     * Deliberately not transactional. Each batch is created through
     * {@link ImportBatchServicePort#create} and each station's tickets through
     * {@link LotteryTicketServicePort#createBulk}, every call in its own
     * transaction, so one bad draw date - or one unreadable station - cannot roll
     * back what already succeeded. A batch left short of its declared quantity
     * stays open for the operator to finish by hand.
     */
    @Override
    public ImportBatchFileImportResultResponse commit(
            byte[] content,
            String fileName,
            ImportBatchFileImportCommitRequest request,
            UUID operatorId
    ) {
        ImportBatchFileConfig config = importBatchFileConfigService.get();
        guardFileSize(content, config);
        if (!mappingDetector.sha256(content).equals(request.fileHash())) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_FILE_CHANGED);
        }

        LotterySupplierModel supplier = lotterySupplierServicePort.getActiveModelById(request.supplierId());
        LocalDateTime now = LocalDateTime.now(clock);
        ImportBatchFileResolution resolution =
                resolve(content, fileName, request.mapping(), supplier, operatorId, now, config);

        // Stored before any batch is created, so evidence exists even if some draw
        // date then fails. A failed upload must not block the import itself.
        StorageResult evidence = config.storeOriginalFile()
                ? storeOriginalFile(content, fileName)
                : null;
        ImportBatchFileImportJobEntity job =
                startJob(request, fileName, evidence, operatorId, now);

        List<ImportBatchFileImportItemResultResponse> items = new ArrayList<>();
        for (LocalDate drawDate : request.drawDates()) {
            ImportBatchFileGroupResponse group = resolution.group(drawDate).orElse(null);
            if (group == null || group.status() != ImportBatchFileGroupStatus.IMPORTABLE) {
                items.add(failure(drawDate, ErrorCode.INVALID_INPUT.getCode(),
                        "Ngày quay này không còn hợp lệ để tạo phiếu."));
                continue;
            }
            items.add(createOne(request, fileName, evidence, job, group, supplier, operatorId));
        }

        int created = (int) items.stream().filter(ImportBatchFileImportItemResultResponse::success).count();
        ImportBatchFileImportResultResponse result = ImportBatchFileImportResultResponse.builder()
                .requestedCount(items.size())
                .createdCount(created)
                .failedCount(items.size() - created)
                .jobId(job == null ? null : job.getId())
                .items(items)
                .build();

        finishJob(job, result);
        return result;
    }

    private ImportBatchFileImportItemResultResponse createOne(
            ImportBatchFileImportCommitRequest request,
            String fileName,
            StorageResult evidence,
            ImportBatchFileImportJobEntity job,
            ImportBatchFileGroupResponse group,
            LotterySupplierModel supplier,
            UUID operatorId
    ) {
        LocalDate drawDate = group.drawDate();

        if (importLogRepository.existsByFileHashAndSupplierIdAndDrawDateAndImportedBy(
                request.fileHash(), supplier.getId(), drawDate, operatorId)) {
            return failure(drawDate,
                    ErrorCode.IMPORT_BATCH_FILE_ALREADY_IMPORTED.getCode(),
                    String.format("Tệp này đã được dùng để tạo phiếu nhập cho ngày quay %s.",
                            drawDate.format(DATE_DISPLAY)));
        }

        ImportBatchResponse batch;
        try {
            batch = importBatchServicePort.create(
                    toCreateRequest(request, group, supplier, evidence),
                    operatorId
            );
        } catch (DomainException e) {
            log.warn("File import could not create the batch for drawDate={}: {}", drawDate, e.getMessage());
            return failure(drawDate, e.getErrorCode().getCode(), e.getMessage());
        }

        int importedSerials = request.mapping().importsTickets()
                ? importTickets(batch, group, request.mapping(), operatorId)
                : 0;

        importLogRepository.save(ImportBatchFileImportLogEntity.builder()
                .fileHash(request.fileHash())
                .fileName(fileName)
                .supplierId(supplier.getId())
                .drawDate(drawDate)
                .importedBy(operatorId)
                .importBatchId(batch.id())
                .lineCount(group.stations().size())
                .originalFileUrl(evidence == null ? null : evidence.url())
                .originalFilePublicId(evidence == null ? null : evidence.publicId())
                .jobId(job == null ? null : job.getId())
                .build());

        return ImportBatchFileImportItemResultResponse.builder()
                .drawDate(drawDate)
                .success(true)
                .importBatchId(batch.id())
                .batchCode(batch.batchCode())
                .lineCount(group.stations().size())
                .ticketCount(group.ticketCount())
                .declaredSerialCount(group.totalDeclareQuantity())
                .importedSerialCount(importedSerials)
                .build();
    }

    private CreateImportBatchRequest toCreateRequest(
            ImportBatchFileImportCommitRequest request,
            ImportBatchFileGroupResponse group,
            LotterySupplierModel supplier,
            StorageResult originalFileEvidence
    ) {
        List<CreateImportBatchLineRequest> lines = group.stations().stream()
                .map(station -> CreateImportBatchLineRequest.builder()
                        .lotteryStationId(station.lotteryStationId())
                        .declareQuantity(station.declaredQuantity())
                        .importCost(station.importCost())
                        .build())
                .toList();

        List<String> ticketListUrls = new ArrayList<>();
        if (request.ticketListImageUrls() != null) {
            request.ticketListImageUrls().stream()
                    .filter(url -> url != null && !url.isBlank())
                    .map(String::trim)
                    .forEach(ticketListUrls::add);
        }
        if (request.shouldUseOriginalFileAsTicketListEvidence()
                && originalFileEvidence != null
                && originalFileEvidence.url() != null
                && !originalFileEvidence.url().isBlank()) {
            String originalUrl = originalFileEvidence.url().trim();
            if (!ticketListUrls.contains(originalUrl)) {
                ticketListUrls.add(originalUrl);
            }
        }

        String invoiceUrl = request.invoiceEvidenceUrl() == null || request.invoiceEvidenceUrl().isBlank()
                ? null
                : request.invoiceEvidenceUrl().trim();

        return CreateImportBatchRequest.builder()
                .drawDate(group.drawDate())
                .supplierId(supplier.getId())
                .importMode(group.importMode())
                .totalDeclareQuantity(group.totalDeclareQuantity())
                .forceCreate(request.isForced(group.drawDate()))
                .invoiceEvidenceUrl(invoiceUrl)
                .ticketListImageUrls(ticketListUrls.isEmpty() ? null : ticketListUrls)
                .lines(lines)
                .build();
    }

    /**
     * Creates the tickets of every line of a freshly created batch.
     *
     * @return how many serials were actually created; a shortfall leaves the batch
     *         partially imported rather than failing it
     */
    private int importTickets(
            ImportBatchResponse batch,
            ImportBatchFileGroupResponse group,
            ImportBatchFileMappingRequest mapping,
            UUID operatorId
    ) {
        Map<Long, Long> lineIdByStation = batch.lines().stream()
                .collect(Collectors.toMap(
                        ImportBatchLineResponse::lotteryStationId,
                        ImportBatchLineResponse::id,
                        (first, duplicate) -> first));

        int imported = 0;
        for (ImportBatchFileStationSummaryResponse station : group.stations()) {
            Long lineId = lineIdByStation.get(station.lotteryStationId());
            if (lineId == null) {
                log.warn("No import batch line created for stationId={} in batchId={}",
                        station.lotteryStationId(), batch.id());
                continue;
            }

            List<CreateLotteryTicketNumberSectionRequest> sections =
                    toSections(ImportBatchFileResolution.stationRows(group, station.lotteryStationId()), mapping);
            if (sections.isEmpty()) {
                continue;
            }

            try {
                lotteryTicketServicePort.createBulk(
                        BulkCreateLotteryTicketsRequest.builder()
                                .stationId(station.lotteryStationId())
                                .importBatchLineId(lineId)
                                .drawDate(group.drawDate())
                                .tickets(sections)
                                .isAutoSave(false)
                                .inputSource(InputSource.FILE_IMPORT)
                                .build(),
                        operatorId
                );
                imported += station.serialCount();
            } catch (DomainException e) {
                // The line stays open with whatever was already imported; the
                // operator finishes it from the existing ticket entry screen.
                log.warn("File import could not create tickets for stationId={} lineId={}: {}",
                        station.lotteryStationId(), lineId, e.getMessage());
            }
        }
        return imported;
    }

    private List<CreateLotteryTicketNumberSectionRequest> toSections(
            List<ImportBatchFileRowResponse> rows,
            ImportBatchFileMappingRequest mapping
    ) {
        List<CreateLotteryTicketNumberSectionRequest> sections = new ArrayList<>();
        for (ImportBatchFileRowResponse row : rows) {
            if (row.numbers() == null || row.serialNumbers() == null || row.serialNumbers().isEmpty()) {
                continue;
            }
            List<CreateLotteryTicketSerialRequest> serials = new ArrayList<>();
            for (int index = 0; index < row.serialNumbers().size(); index++) {
                String image = row.ticketImages() != null && index < row.ticketImages().size()
                        ? row.ticketImages().get(index)
                        : null;
                serials.add(new CreateLotteryTicketSerialRequest(image, row.serialNumbers().get(index)));
            }
            sections.add(new CreateLotteryTicketNumberSectionRequest(row.numbers(), serials));
        }
        return sections;
    }

    // -------------------------------------------------------- resolution

    private ImportBatchFileResolution resolve(
            byte[] content,
            String fileName,
            ImportBatchFileMappingRequest mapping,
            LotterySupplierModel supplier,
            UUID operatorId,
            LocalDateTime now,
            ImportBatchFileConfig config
    ) {
        TabularTable table = tabularFileParser.parse(content, fileName, new TabularParseOptions(
                mapping.headerRowIndex(), mapping.delimiter(), mapping.charset(), config.maxRows()));
        validateMapping(table, mapping);

        // Read before any row is: a file belonging to another supplier would import
        // cleanly and only reveal itself at settlement, against the wrong company.
        ImportBatchFileSupplierIdentityResponse supplierIdentity =
                supplierIdentityScanner.scan(table.preamble(), supplier);

        Map<String, Long> aliasIndex = loadAliasIndex();

        Map<LocalDate, List<PendingRow>> byDrawDate = new LinkedHashMap<>();
        List<PendingRow> undated = new ArrayList<>();
        for (TabularRow row : table.rows()) {
            if (isTrailerRow(row, mapping)) {
                break;
            }
            PendingRow pending = readRow(row, mapping);
            if (pending.drawDate() == null) {
                undated.add(pending);
            } else {
                byDrawDate.computeIfAbsent(pending.drawDate(), key -> new ArrayList<>()).add(pending);
            }
        }

        List<ImportBatchFileGroupResponse> groups = byDrawDate.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> buildGroup(
                        entry.getKey(), entry.getValue(), mapping, supplier, aliasIndex, now,
                        operatorId, config, supplierIdentity))
                .collect(Collectors.toCollection(ArrayList::new));
        if (!undated.isEmpty()) {
            groups.add(buildUndatedGroup(undated, mapping));
        }

        return new ImportBatchFileResolution(table, groups, supplierIdentity);
    }

    /**
     * True once the data table has ended.
     *
     * <p>A business delivery note closes with a totals line and a block of
     * signature boxes. Those sit in the same columns as the tickets, so the parser
     * hands them over as ordinary rows; read as data they become errors, and with
     * partial import turned off a single one would hold back the whole draw date.
     *
     * <p>A row naming no station at all cannot be a ticket - the station is what a
     * batch line is keyed by - so the table is treated as finished there.
     */
    private boolean isTrailerRow(TabularRow row, ImportBatchFileMappingRequest mapping) {
        return isBlankColumn(row, mapping.stationColumn())
                && isBlankColumn(row, mapping.stationCodeColumn());
    }

    private boolean isBlankColumn(TabularRow row, String column) {
        if (column == null || column.isBlank()) {
            return true;
        }
        String value = row.get(column);
        return value == null || value.isBlank();
    }

    private PendingRow readRow(TabularRow row, ImportBatchFileMappingRequest mapping) {
        Map<String, String> rawValues = new LinkedHashMap<>();
        putRaw(rawValues, mapping.drawDateColumn(), row);
        putRaw(rawValues, mapping.stationCodeColumn(), row);
        putRaw(rawValues, mapping.stationColumn(), row);
        putRaw(rawValues, mapping.numbersColumn(), row);
        putRaw(rawValues, mapping.serialsColumn(), row);
        putRaw(rawValues, mapping.quantityColumn(), row);
        putRaw(rawValues, mapping.ticketImageColumn(), row);
        putRaw(rawValues, mapping.importCostColumn(), row);
        putRaw(rawValues, mapping.salePriceColumn(), row);
        putRaw(rawValues, mapping.commissionRateColumn(), row);

        LocalDate drawDate = mapping.drawDateColumn() == null || mapping.drawDateColumn().isBlank()
                ? mapping.fallbackDrawDate()
                : TabularValueParser.parseDate(row.get(mapping.drawDateColumn()), mapping.dateFormat())
                        .orElse(null);

        return new PendingRow(
                row.rowNumber(),
                rawValues,
                drawDate,
                mapping.stationCodeColumn() == null ? null : row.get(mapping.stationCodeColumn()),
                row.get(mapping.stationColumn()),
                mapping.numbersColumn() == null ? null : row.get(mapping.numbersColumn()),
                mapping.serialsColumn() == null ? null : row.get(mapping.serialsColumn()),
                mapping.quantityColumn() == null ? null : row.get(mapping.quantityColumn()),
                mapping.ticketImageColumn() == null ? null : row.get(mapping.ticketImageColumn()),
                mapping.importCostColumn() == null ? null : row.get(mapping.importCostColumn()),
                mapping.salePriceColumn() == null ? null : row.get(mapping.salePriceColumn()),
                mapping.commissionRateColumn() == null ? null : row.get(mapping.commissionRateColumn())
        );
    }

    private void putRaw(Map<String, String> target, String column, TabularRow row) {
        if (column != null && !column.isBlank()) {
            target.put(column, Optional.ofNullable(row.get(column)).orElse(""));
        }
    }

    private ImportBatchFileGroupResponse buildUndatedGroup(
            List<PendingRow> rows,
            ImportBatchFileMappingRequest mapping
    ) {
        String column = mapping.drawDateColumn();
        List<ImportBatchFileRowResponse> rowResponses = rows.stream()
                .map(row -> ImportBatchFileRowResponse.builder()
                        .rowNumber(row.rowNumber())
                        .rawValues(row.rawValues())
                        .status(ImportBatchFileRowStatus.ERROR)
                        .issues(List.of(ImportBatchFileIssueResponse.of(
                                ImportBatchFileIssueCode.DRAW_DATE_INVALID, column)))
                        .build())
                .toList();

        return ImportBatchFileGroupResponse.builder()
                .status(ImportBatchFileGroupStatus.BLOCKED)
                .totalDeclareQuantity(0)
                .totalSerialCount(0)
                .totalDeclaredCostValue(BigDecimal.ZERO)
                .ticketCount(0)
                .stations(List.of())
                .groupIssues(List.of(ImportBatchFileIssueResponse.of(ImportBatchFileIssueCode.NO_VALID_ROW)))
                .rows(rowResponses)
                .build();
    }

    private ImportBatchFileGroupResponse buildGroup(
            LocalDate drawDate,
            List<PendingRow> rows,
            ImportBatchFileMappingRequest mapping,
            LotterySupplierModel supplier,
            Map<String, Long> aliasIndex,
            LocalDateTime now,
            UUID operatorId,
            ImportBatchFileConfig config,
            ImportBatchFileSupplierIdentityResponse supplierIdentity
    ) {
        if (!drawDateWindowPolicy.containsForFileImport(drawDate, now)) {
            // The file legitimately covers dates that are not importable yet;
            // resolving stations for them would be wasted work.
            return outOfWindowGroup(drawDate, rows, now);
        }

        ImportBatchImportMode importMode = ImportBatchImportMode.IN_DAY;
        List<LotteryStationModel> scheduled = lotteryStationServicePort.getScheduleModelsByDrawDate(drawDate).stream()
                .filter(station -> stationEligibilityResolver.isScheduledOnDrawDate(station, drawDate))
                .toList();
        List<LotteryStationNameResolver.Candidate> candidates = scheduled.stream()
                .map(station -> new LotteryStationNameResolver.Candidate(station.getId(), station.getName()))
                .toList();
        Map<Long, LotteryStationModel> stationsById = scheduled.stream()
                .collect(Collectors.toMap(LotteryStationModel::getId, station -> station,
                        (first, duplicate) -> first));

        // The mapping wins when the operator set a separator explicitly; otherwise
        // the system-wide default from system_config applies.
        String serialSeparator = mapping.serialSeparator() == null || mapping.serialSeparator().isEmpty()
                ? config.serialSeparator()
                : mapping.serialSeparator();
        GroupContext context = new GroupContext(
                drawDate, importMode, candidates, stationsById, aliasIndex, now, serialSeparator,
                offScheduleStationsByName(stationsById));
        List<ImportBatchFileRowResponse> resolved = new ArrayList<>();
        for (PendingRow row : rows) {
            resolved.add(mapping.importsTickets()
                    ? resolveTicketRow(row, mapping, context, resolved)
                    : resolveDeclarationRow(row, mapping, context, resolved));
        }

        List<ImportBatchFileStationSummaryResponse> stations = summarizeStations(resolved, stationsById);
        List<ImportBatchFileIssueResponse> groupIssues = new ArrayList<>();
        ImportBatchFileGroupStatus status = ImportBatchFileGroupStatus.IMPORTABLE;

        // Checked ahead of the time windows: if the file belongs to someone else,
        // whose intake hours it falls inside is the wrong question to answer.
        if (supplierIdentity.mismatched()) {
            groupIssues.add(ImportBatchFileIssueResponse.of(
                    ImportBatchFileIssueCode.SUPPLIER_IDENTITY_MISMATCH,
                    null,
                    supplierIdentityScanner.mismatchMessage(supplierIdentity, supplier),
                    List.of()));
            status = ImportBatchFileGroupStatus.BLOCKED;
        } else if (!supplierIdentity.declared()) {
            // Only a warning: files from older templates carry no letterhead, and
            // rejecting them would break every supplier still sending one.
            groupIssues.add(ImportBatchFileIssueResponse.of(
                    ImportBatchFileIssueCode.SUPPLIER_IDENTITY_NOT_DECLARED,
                    null,
                    String.format("Tệp không ghi thông tin nhà cung cấp nên không đối chiếu được với %s.",
                            supplier.getName()),
                    List.of()));
        }
        if (intakeWindowPolicy.isBeforeIntakeOpen(supplier, drawDate, now)) {
            groupIssues.add(ImportBatchFileIssueResponse.of(
                    ImportBatchFileIssueCode.SUPPLIER_IMPORT_NOT_ALLOWED,
                    null,
                    intakeWindowPolicy.notOpenMessage(supplier, drawDate),
                    List.of()));
            status = ImportBatchFileGroupStatus.BLOCKED;
        }
        if (intakeWindowPolicy.isIntakeClosed(supplier, drawDate, now)) {
            groupIssues.add(ImportBatchFileIssueResponse.of(
                    ImportBatchFileIssueCode.SUPPLIER_RETURN_CUT_OFF_PASSED,
                    null,
                    intakeWindowPolicy.closedMessage(supplier, drawDate),
                    List.of()));
            status = ImportBatchFileGroupStatus.BLOCKED;
        }
        // Prices are checked before anything else about the rows, because a batch
        // costed from the wrong figures quietly corrupts supplier settlement later.
        List<ImportBatchFilePricingMismatchResponse> pricingMismatches =
                collectPricingMismatches(rows, resolved, stationsById, mapping);
        if (!pricingMismatches.isEmpty()) {
            groupIssues.add(ImportBatchFileIssueResponse.of(
                    ImportBatchFileIssueCode.STATION_PRICING_MISMATCH,
                    null,
                    describePricingMismatches(pricingMismatches),
                    List.of()));
            status = ImportBatchFileGroupStatus.BLOCKED;
        }

        // Rows have been resolved by now, so any off-schedule station has been
        // recorded. Surfaced at group level as well as per row: one banner is
        // actionable, a hundred identical row warnings are not.
        List<ImportBatchFileScheduleMismatchResponse> scheduleMismatches =
                List.copyOf(context.scheduleMismatches().values());
        if (!scheduleMismatches.isEmpty()) {
            groupIssues.add(ImportBatchFileIssueResponse.of(
                    ImportBatchFileIssueCode.STATION_SCHEDULE_MISMATCH,
                    null,
                    describeScheduleMismatches(scheduleMismatches, drawDate),
                    List.of()));
        }

        if (stations.isEmpty()) {
            groupIssues.add(ImportBatchFileIssueResponse.of(ImportBatchFileIssueCode.NO_VALID_ROW));
            status = ImportBatchFileGroupStatus.BLOCKED;
        } else if (!config.allowPartialImport()
                && resolved.stream().anyMatch(row -> row.status() == ImportBatchFileRowStatus.ERROR)) {
            // The operator has turned off partial imports, so a single bad row
            // holds back the whole draw date rather than importing around it.
            groupIssues.add(ImportBatchFileIssueResponse.of(
                    ImportBatchFileIssueCode.PARTIAL_IMPORT_DISABLED));
            status = ImportBatchFileGroupStatus.BLOCKED;
        }

        Long existingBatchId = operatorId == null ? null : importBatchRepositoryPort
                .findEditableBatchByImportedByAndDrawDateAndSupplierAndImportMode(
                        operatorId, drawDate, supplier.getId(), importMode)
                .map(batch -> batch.getId())
                .orElse(null);
        if (existingBatchId != null) {
            groupIssues.add(ImportBatchFileIssueResponse.of(
                    ImportBatchFileIssueCode.DRAFT_ALREADY_EXISTS,
                    null,
                    String.format("Đã có phiếu nhập #%d đang mở cho ngày quay %s của nhà cung cấp %s.",
                            existingBatchId, drawDate.format(DATE_DISPLAY), supplier.getName()),
                    List.of()));
        }

        return ImportBatchFileGroupResponse.builder()
                .drawDate(drawDate)
                .status(status)
                .importMode(importMode)
                .totalDeclareQuantity(stations.stream()
                        .mapToInt(ImportBatchFileStationSummaryResponse::declaredQuantity).sum())
                .totalSerialCount(stations.stream()
                        .mapToInt(ImportBatchFileStationSummaryResponse::serialCount).sum())
                .totalDeclaredCostValue(stations.stream()
                        .map(ImportBatchFileStationSummaryResponse::declaredCostValue)
                        .reduce(BigDecimal.ZERO, BigDecimal::add))
                .ticketCount(stations.stream()
                        .mapToInt(ImportBatchFileStationSummaryResponse::ticketCount).sum())
                .existingEditableBatchId(existingBatchId)
                .stations(stations)
                .groupIssues(groupIssues)
                .rows(resolved)
                .pricingMismatches(pricingMismatches)
                .scheduleMismatches(scheduleMismatches)
                .build();
    }

    /**
     * Every station except the ones already drawing on this date, keyed by
     * canonical name.
     *
     * <p>Only consulted after the day's candidates have failed to match, so the
     * cost is paid once per draw date and never changes which station a good file
     * resolves to. Ambiguous names are dropped rather than guessed: two stations
     * sharing a canonical name would make the diagnosis a coin toss.
     */
    private Map<String, LotteryStationModel> offScheduleStationsByName(
            Map<Long, LotteryStationModel> alreadyScheduled
    ) {
        Map<String, LotteryStationModel> byName = new HashMap<>();
        Set<String> ambiguous = new HashSet<>();

        for (LotteryStationModel station : lotteryStationRepositoryPort.findAll()) {
            if (station.getId() == null || alreadyScheduled.containsKey(station.getId())) {
                continue;
            }
            for (String form : VietnameseTextNormalizer.stationNameForms(station.getName())) {
                if (form.isEmpty() || ambiguous.contains(form)) {
                    continue;
                }
                LotteryStationModel existing = byName.putIfAbsent(form, station);
                if (existing != null && !existing.getId().equals(station.getId())) {
                    byName.remove(form);
                    ambiguous.add(form);
                }
            }
        }
        return byName;
    }

    private ImportBatchFileGroupResponse outOfWindowGroup(
            LocalDate drawDate,
            List<PendingRow> rows,
            LocalDateTime now
    ) {
        ImportBatchFileIssueResponse issue = ImportBatchFileIssueResponse.of(
                ImportBatchFileIssueCode.DRAW_DATE_OUT_OF_WINDOW,
                null,
                outOfWindowMessage(drawDate, now),
                List.of());

        List<ImportBatchFileRowResponse> rowResponses = rows.stream()
                .map(row -> ImportBatchFileRowResponse.builder()
                        .rowNumber(row.rowNumber())
                        .rawValues(row.rawValues())
                        .drawDate(drawDate)
                        .status(ImportBatchFileRowStatus.SKIPPED)
                        .issues(List.of(issue))
                        .build())
                .toList();

        return ImportBatchFileGroupResponse.builder()
                .drawDate(drawDate)
                .status(ImportBatchFileGroupStatus.OUT_OF_WINDOW)
                .totalDeclareQuantity(0)
                .totalSerialCount(0)
                .totalDeclaredCostValue(BigDecimal.ZERO)
                .ticketCount(0)
                .stations(List.of())
                .groupIssues(List.of(issue))
                .rows(rowResponses)
                .build();
    }

    /**
     * Says which side of today the draw date falls on. "Out of window" alone
     * leaves the operator guessing whether to wait, re-export, or give up.
     */
    String outOfWindowMessage(LocalDate drawDate, LocalDateTime now) {
        LocalDate today = now.toLocalDate();
        if (drawDate.isBefore(today)) {
            return String.format(
                    "Ngày quay %s đã qua. Chỉ tạo được phiếu cho hôm nay (%s) hoặc ngày mai (%s). "
                            + "Vé còn sót của ngày đã qua chỉ được bù khi đối soát nhà cung cấp, "
                            + "do quản trị viên tạo phiếu bổ sung từ màn hình đối soát.",
                    drawDate.format(DATE_DISPLAY), today.format(DATE_DISPLAY),
                    today.plusDays(1).format(DATE_DISPLAY));
        }
        return String.format(
                "Ngày quay %s còn xa. Chỉ tạo được phiếu cho hôm nay (%s) hoặc ngày mai (%s); "
                        + "hãy tải lại đúng tệp này khi tới gần ngày %s.",
                drawDate.format(DATE_DISPLAY), today.format(DATE_DISPLAY),
                today.plusDays(1).format(DATE_DISPLAY), drawDate.format(DATE_DISPLAY));
    }

    /** Declaration-only file: one row is a station and the count it delivered. */
    private ImportBatchFileRowResponse resolveDeclarationRow(
            PendingRow row,
            ImportBatchFileMappingRequest mapping,
            GroupContext context,
            List<ImportBatchFileRowResponse> alreadyResolved
    ) {
        List<ImportBatchFileIssueResponse> issues = new ArrayList<>();
        StationResolution station = resolveStation(row, context, issues);

        Integer quantity = readQuantity(row, mapping, issues);

        boolean merged = false;
        if (station.isUsable() && quantity != null && quantity > 0 && noErrors(issues)) {
            // A station may only appear once per batch, so a repeat is merged into
            // the first row - the supplier simply split the delivery note.
            Integer firstRowNumber = context.firstRowByStation().get(station.stationId());
            if (firstRowNumber == null) {
                context.firstRowByStation().put(station.stationId(), row.rowNumber());
            } else {
                merged = true;
                mergeQuantityIntoRow(alreadyResolved, firstRowNumber, quantity);
                issues.add(ImportBatchFileIssueResponse.of(
                        ImportBatchFileIssueCode.DUPLICATE_STATION_IN_GROUP,
                        null,
                        String.format("Đã cộng gộp %d vé vào dòng %d.", quantity, firstRowNumber),
                        List.of()));
            }
        }

        return ImportBatchFileRowResponse.builder()
                .rowNumber(row.rowNumber())
                .rawValues(row.rawValues())
                .drawDate(context.drawDate())
                .lotteryStationId(station.stationId())
                .stationName(station.stationName())
                .resolvedBatchType(station.batchType())
                .declareQuantity(quantity)
                .serialCount(0)
                .importCost(station.importCost())
                .status(merged
                        ? ImportBatchFileRowStatus.SKIPPED
                        : rowStatus(issues, station.stationId() != null && quantity != null && quantity > 0))
                .issues(issues)
                .build();
    }

    /** Ticket file: one row is a lottery number and every serial printed with it. */
    private ImportBatchFileRowResponse resolveTicketRow(
            PendingRow row,
            ImportBatchFileMappingRequest mapping,
            GroupContext context,
            List<ImportBatchFileRowResponse> alreadyResolved
    ) {
        List<ImportBatchFileIssueResponse> issues = new ArrayList<>();
        StationResolution station = resolveStation(row, context, issues);

        String numbers = readNumbers(row, mapping, station, issues);
        List<String> serials = readSerials(row, mapping, station, numbers, context, issues);
        List<String> images = readImages(row, mapping, context, serials.size(), issues);

        int declaredQuantity = readDeclaredQuantity(row, mapping, serials.size(), issues);

        boolean merged = false;
        Integer mergedIntoRowNumber = null;
        if (station.isUsable() && numbers != null && !serials.isEmpty()) {
            // The same number may legitimately be split over several rows; ticket
            // creation rejects a repeated number, so the serials are merged here.
            TicketKey key = new TicketKey(station.stationId(), numbers);
            Integer firstRowNumber = context.firstRowByTicket().get(key);
            if (firstRowNumber == null) {
                context.firstRowByTicket().put(key, row.rowNumber());
            } else {
                merged = true;
                mergedIntoRowNumber = firstRowNumber;
                mergeSerialsIntoRow(alreadyResolved, firstRowNumber, serials, images);
                // Always say where the row went. One serial per line is the shape
                // this system exports, so a four-ticket number produces four lines
                // repeating that number - routine, but a line marked skipped with
                // an empty note reads as if its ticket had been dropped.
                issues.add(ImportBatchFileIssueResponse.of(
                        ImportBatchFileIssueCode.NUMBERS_MERGED_INTO_ROW,
                        null,
                        String.format(
                                "Dãy số %s đã có ở dòng %d. %d sê-ri của dòng này đã gộp vào dòng đó, "
                                        + "không bị bỏ sót.",
                                numbers, firstRowNumber, serials.size()),
                        List.of()));
                // A line carrying several serials at once is a different matter:
                // the supplier split one number across lines in a way worth review.
                if (serials.size() > 1) {
                    issues.add(ImportBatchFileIssueResponse.of(
                            ImportBatchFileIssueCode.NUMBERS_DUPLICATED_IN_GROUP,
                            null,
                            String.format("Đã gộp %d sê-ri vào dòng %d.", serials.size(), firstRowNumber),
                            List.of()));
                }
            }
        }

        boolean usable = station.stationId() != null && numbers != null && !serials.isEmpty();
        return ImportBatchFileRowResponse.builder()
                .rowNumber(row.rowNumber())
                .rawValues(row.rawValues())
                .drawDate(context.drawDate())
                .lotteryStationId(station.stationId())
                .stationName(station.stationName())
                .resolvedBatchType(station.batchType())
                .numbers(numbers)
                .serialNumbers(serials)
                .ticketImages(images)
                .declareQuantity(declaredQuantity)
                .serialCount(serials.size())
                .importCost(station.importCost())
                .status(merged ? ImportBatchFileRowStatus.SKIPPED : rowStatus(issues, usable))
                .issues(issues)
                .mergedIntoRowNumber(mergedIntoRowNumber)
                .build();
    }

    // ------------------------------------------------- per-field reading

    private StationResolution resolveStation(
            PendingRow row,
            GroupContext context,
            List<ImportBatchFileIssueResponse> issues
    ) {
        // A code is exact, so it wins over the name whenever the file carries one.
        // Files this system exported always do, which is why they need no name matching.
        Long stationId = resolveStationIdByCode(row, context, issues);

        if (stationId == null) {
            if (row.stationCodeText() != null) {
                // The code was present but unknown; a name fallback would silently
                // import against a different station than the file names.
                return StationResolution.unresolved();
            }
            if (row.stationText() == null) {
                issues.add(ImportBatchFileIssueResponse.of(
                        ImportBatchFileIssueCode.MISSING_REQUIRED_COLUMN, null,
                        "Thiếu mã và tên nhà đài.", List.of()));
                return StationResolution.unresolved();
            }

            LotteryStationNameResolver.Match match = stationNameResolver.resolve(
                    row.stationText(), context.candidates(), context.aliasIndex());
            if (!match.isResolved()) {
                // Candidates are only the stations drawing that day, so a station
                // that exists but is off-schedule fails to match and would be
                // reported as unknown. Look again across every station before
                // saying the file names something the system has never heard of.
                LotteryStationModel offSchedule = VietnameseTextNormalizer
                        .stationNameForms(row.stationText()).stream()
                        .map(context.offScheduleByName()::get)
                        .filter(Objects::nonNull)
                        .findFirst()
                        .orElse(null);
                if (offSchedule != null) {
                    issues.add(offScheduleIssue(offSchedule, context));
                    return StationResolution.unresolved();
                }
                issues.add(stationIssue(match, context.drawDate()));
                return StationResolution.unresolved();
            }
            stationId = match.lotteryStationId();
        }

        LotteryStationModel station = context.stationsById().get(stationId);
        if (station == null) {
            // Resolved to a real station that is not drawing on this date: say
            // which of the two reasons applies, and hand back enough for the
            // operator to fix the schedule from the preview.
            LotteryStationModel known = lotteryStationRepositoryPort.findById(stationId).orElse(null);
            issues.add(known == null
                    ? ImportBatchFileIssueResponse.of(ImportBatchFileIssueCode.STATION_NOT_ELIGIBLE)
                    : offScheduleIssue(known, context));
            return StationResolution.unresolved();
        }

        if (importBatchLineRepositoryPort.existsDraftLineForStationAndDrawDate(stationId, context.drawDate())) {
            issues.add(ImportBatchFileIssueResponse.of(ImportBatchFileIssueCode.STATION_DRAFT_EXISTS));
            return StationResolution.blocked(stationId, station.getName());
        }
        if (!stationEligibilityResolver.isEligibleForSelection(
                station, context.drawDate(), context.now(), context.importMode())) {
            issues.add(ImportBatchFileIssueResponse.of(ImportBatchFileIssueCode.STATION_NOT_ELIGIBLE));
            return StationResolution.blocked(stationId, station.getName());
        }

        ImportBatchTypeResolver.ClassificationResult classification = importBatchTypeResolver.resolve(
                stationId, context.drawDate(), station, context.importMode());
        if (classification.lateImportWarning()) {
            issues.add(ImportBatchFileIssueResponse.of(ImportBatchFileIssueCode.LATE_IMPORT_WARNING));
        }

        return new StationResolution(
                stationId,
                station.getName(),
                classification.resolvedBatchType(),
                ImportCostCalculator.fromStation(station),
                RegionLength.of(station),
                true
        );
    }

    /**
     * Explains why a station the system does know cannot take this draw date, and
     * records it so the group can offer a repair.
     *
     * <p>Two different faults land here. A switched-off station is an
     * administrative decision and only the administrator should reverse it. A
     * schedule that omits this weekday is usually stale data - the station really
     * does draw that day now - so the weekday the file implies is reported back
     * and the operator corrects the schedule from the preview.
     */
    private ImportBatchFileIssueResponse offScheduleIssue(
            LotteryStationModel station,
            GroupContext context
    ) {
        DayOfWeek requiredDay = context.drawDate().getDayOfWeek();
        String dayLabel = LotteryDrawScheduleFormatter.dayLabel(requiredDay);
        String schedule = LotteryDrawScheduleFormatter.describe(station);
        boolean active = station.isActive() && !station.isDeleted();

        context.scheduleMismatches().putIfAbsent(station.getId(), buildScheduleMismatch(
                station, context.drawDate(), requiredDay, active));

        if (!active) {
            return ImportBatchFileIssueResponse.of(
                    ImportBatchFileIssueCode.STATION_INACTIVE,
                    null,
                    String.format("Nhà đài %s đang ngừng hoạt động nên không nhập vé được.",
                            station.getName()),
                    List.of());
        }

        return ImportBatchFileIssueResponse.of(
                ImportBatchFileIssueCode.STATION_SCHEDULE_MISMATCH,
                null,
                String.format(
                        "Ngày quay %s là %s, nhưng lịch quay của đài %s đang là %s. "
                                + "Hãy sửa lịch quay của đài nếu đài thực sự có quay vào %s.",
                        context.drawDate().format(DATE_DISPLAY),
                        dayLabel,
                        station.getName(),
                        schedule.isBlank() ? "chưa thiết lập" : schedule,
                        dayLabel),
                List.of());
    }

    private ImportBatchFileScheduleMismatchResponse buildScheduleMismatch(
            LotteryStationModel station,
            LocalDate drawDate,
            DayOfWeek requiredDay,
            boolean active
    ) {
        List<DayOfWeek> current = station.getDrawDays() == null
                ? List.of()
                : station.getDrawDays().stream().sorted().toList();
        // Adding rather than replacing: a station that already serves other days
        // must keep them, or fixing one import silently breaks those dates.
        List<DayOfWeek> suggested = Stream.concat(current.stream(), Stream.of(requiredDay))
                .distinct()
                .sorted()
                .toList();

        return ImportBatchFileScheduleMismatchResponse.builder()
                .lotteryStationId(station.getId())
                .stationName(station.getName())
                .stationCode(station.getCode())
                .drawDate(drawDate.format(DATE_DISPLAY))
                .currentDrawDays(current)
                .requiredDrawDays(List.of(requiredDay))
                .suggestedDrawDays(suggested)
                .active(active)
                .build();
    }

    /**
     * @return the station id the code points at, or null when there is no code
     *         column, the cell is blank, or the code is unknown for this draw date
     */
    private Long resolveStationIdByCode(
            PendingRow row,
            GroupContext context,
            List<ImportBatchFileIssueResponse> issues
    ) {
        if (row.stationCodeText() == null) {
            return null;
        }

        String code = lotteryStationCodeGenerator.normalize(row.stationCodeText());
        Long stationId = code == null
                ? null
                : lotteryStationRepositoryPort.findByCode(code)
                        .map(LotteryStationModel::getId)
                        .orElse(null);

        if (stationId == null) {
            issues.add(ImportBatchFileIssueResponse.of(
                    ImportBatchFileIssueCode.STATION_CODE_NOT_FOUND,
                    null,
                    String.format("Mã nhà đài \"%s\" không tồn tại.", row.stationCodeText()),
                    List.of()));
            return null;
        }
        if (!context.stationsById().containsKey(stationId)) {
            LotteryStationModel known = lotteryStationRepositoryPort.findById(stationId).orElse(null);
            issues.add(known == null
                    ? ImportBatchFileIssueResponse.of(ImportBatchFileIssueCode.STATION_NOT_ELIGIBLE)
                    : offScheduleIssue(known, context));
            return null;
        }
        return stationId;
    }

    private Integer readQuantity(
            PendingRow row,
            ImportBatchFileMappingRequest mapping,
            List<ImportBatchFileIssueResponse> issues
    ) {
        if (row.quantityText() == null) {
            issues.add(ImportBatchFileIssueResponse.of(
                    ImportBatchFileIssueCode.MISSING_REQUIRED_COLUMN, mapping.quantityColumn(),
                    "Thiếu số lượng.", List.of()));
            return null;
        }
        Integer quantity = TabularValueParser
                .parseQuantity(row.quantityText(), mapping.numberStyleOrAuto())
                .orElse(null);
        if (quantity == null) {
            issues.add(ImportBatchFileIssueResponse.of(
                    ImportBatchFileIssueCode.QUANTITY_INVALID, mapping.quantityColumn()));
        } else if (quantity <= 0) {
            issues.add(ImportBatchFileIssueResponse.of(
                    ImportBatchFileIssueCode.QUANTITY_NOT_POSITIVE, mapping.quantityColumn()));
        }
        return quantity;
    }

    private String readNumbers(
            PendingRow row,
            ImportBatchFileMappingRequest mapping,
            StationResolution station,
            List<ImportBatchFileIssueResponse> issues
    ) {
        String raw = row.numbersText();
        if (raw == null) {
            issues.add(ImportBatchFileIssueResponse.of(
                    ImportBatchFileIssueCode.NUMBERS_REQUIRED, mapping.numbersColumn()));
            return null;
        }

        String value = raw.trim();
        if (!value.matches("\\d+")) {
            issues.add(ImportBatchFileIssueResponse.of(
                    ImportBatchFileIssueCode.NUMBERS_INVALID, mapping.numbersColumn()));
            return null;
        }
        // Region decides how long a lottery number is; without a resolved station
        // there is nothing to validate against, and the station issue already shows.
        if (station.region() != null) {
            int min = station.region().min();
            int max = station.region().max();
            if (value.length() < min || value.length() > max) {
                issues.add(ImportBatchFileIssueResponse.of(
                        ImportBatchFileIssueCode.NUMBERS_LENGTH_INVALID,
                        mapping.numbersColumn(),
                        String.format("Dãy số phải có %d đến %d chữ số.", min, max),
                        List.of()));
                return null;
            }
        }
        return value;
    }

    private List<String> readSerials(
            PendingRow row,
            ImportBatchFileMappingRequest mapping,
            StationResolution station,
            String numbers,
            GroupContext context,
            List<ImportBatchFileIssueResponse> issues
    ) {
        List<String> parsed = ImportBatchFileCellParser.splitList(
                row.serialsText(), context.serialSeparator());
        if (parsed.isEmpty()) {
            issues.add(ImportBatchFileIssueResponse.of(
                    ImportBatchFileIssueCode.SERIALS_REQUIRED, mapping.serialsColumn()));
            return List.of();
        }

        List<String> accepted = new ArrayList<>();
        List<String> duplicated = new ArrayList<>();
        for (String serial : parsed) {
            // A ticket is identified by station, draw date and lottery number, and
            // a serial belongs to one of those - which is what
            // UNIQUE (ticket_id, serial_number) enforces. The key mirrors that
            // tuple: the draw date is the group's, so only the number is added.
            //
            // Keyed on the station alone before, this rejected the same serial
            // appearing under two different lottery numbers - which the database
            // permits and a supplier's booklet numbering produces.
            //
            // Serials are compared case-insensitively because a supplier writing
            // "tg001" and "TG001" means the same physical ticket.
            String key = serialKey(station.stationId(), numbers, serial);
            if (context.seenSerials().add(key)) {
                accepted.add(serial);
            } else {
                duplicated.add(serial);
            }
        }
        if (!duplicated.isEmpty()) {
            // Kept rather than deferred to the database: the same serial twice
            // under one number breaks UNIQUE (ticket_id, serial_number), and
            // without this the whole station's tickets would fail at commit
            // instead of being named here while the file can still be corrected.
            issues.add(ImportBatchFileIssueResponse.of(
                    ImportBatchFileIssueCode.SERIAL_DUPLICATED_IN_FILE,
                    mapping.serialsColumn(),
                    String.format("Sê-ri lặp lại trong tệp cho dãy số %s: %s",
                            numbers == null ? "—" : numbers, String.join(", ", duplicated)),
                    List.of()));
        }
        if (accepted.isEmpty()) {
            return List.of();
        }

        List<String> existing = findAlreadyImported(station.stationId(), numbers, context.drawDate(), accepted);
        if (!existing.isEmpty()) {
            // Names the whole tuple that makes a ticket unique. "Already in the
            // system" on its own leaves the operator unable to tell whether the
            // clash is with this draw date or another one entirely.
            issues.add(ImportBatchFileIssueResponse.of(
                    ImportBatchFileIssueCode.SERIAL_ALREADY_IMPORTED,
                    mapping.serialsColumn(),
                    String.format(
                            "Đài %s · ngày quay %s · dãy số %s đã có các sê-ri này trong hệ thống: %s.",
                            station.stationName() == null ? "—" : station.stationName(),
                            context.drawDate().format(DATE_DISPLAY),
                            numbers == null ? "—" : numbers,
                            String.join(", ", existing)),
                    List.of()));
            accepted.removeAll(existing);
        }
        return accepted;
    }

    /**
     * What makes two lines of a file the same physical ticket: station, draw date,
     * lottery number and serial.
     *
     * <p>Mirrors {@code UNIQUE (ticket_id, serial_number)} exactly — a ticket is
     * keyed by station, draw date and number, so those three identify the ticket
     * and the serial identifies the row within it. The draw date is not in the key
     * because callers scope it per draw-date group.
     *
     * <p>Serials compare case-insensitively: a supplier writing "tg001" and
     * "TG001" means one ticket, not two.
     */
    static String serialKey(Long stationId, String numbers, String serial) {
        return stationId
                + "|" + (numbers == null ? "" : numbers.trim())
                + "|" + (serial == null ? "" : serial.trim().toLowerCase(Locale.ROOT));
    }

    /**
     * A lottery number can already exist from an earlier batch of the same station
     * and draw date, in which case its serials must not be created twice.
     */
    private List<String> findAlreadyImported(
            Long stationId,
            String numbers,
            LocalDate drawDate,
            List<String> serials
    ) {
        if (stationId == null || numbers == null) {
            return List.of();
        }
        Optional<LotteryTicketModel> ticket =
                lotteryTicketRepositoryPort.findByUniqueFields(stationId, numbers, drawDate);
        if (ticket.isEmpty() || ticket.get().getId() == null) {
            return List.of();
        }

        Long ticketId = ticket.get().getId();
        return serials.stream()
                .filter(serial -> lotteryTicketSerialRepositoryPort
                        .existsByTicketIdAndSerialNumber(ticketId, serial))
                .toList();
    }

    private List<String> readImages(
            PendingRow row,
            ImportBatchFileMappingRequest mapping,
            GroupContext context,
            int serialCount,
            List<ImportBatchFileIssueResponse> issues
    ) {
        if (serialCount <= 0) {
            return List.of();
        }
        List<String> raw = ImportBatchFileCellParser.splitList(
                row.ticketImageText(), context.serialSeparator());
        List<String> aligned = ImportBatchFileCellParser.alignImagesToSerials(raw, serialCount);

        if (aligned.isEmpty()) {
            issues.add(ImportBatchFileIssueResponse.of(
                    ImportBatchFileIssueCode.TICKET_IMAGE_COUNT_MISMATCH,
                    mapping.ticketImageColumn(),
                    String.format("Có %d ảnh cho %d sê-ri.", raw.size(), serialCount),
                    List.of()));
            return nullImages(serialCount);
        }
        if (!raw.isEmpty() && aligned.stream().allMatch(java.util.Objects::isNull)) {
            issues.add(ImportBatchFileIssueResponse.of(
                    ImportBatchFileIssueCode.TICKET_IMAGE_INVALID, mapping.ticketImageColumn()));
        }
        return aligned;
    }

    /**
     * How many tickets the supplier says it delivered.
     *
     * <p>Taken from the quantity column when the file has one, because that is the
     * supplier's own claim. Deriving it from the serial count instead would make
     * declared and actual equal by construction, and a short delivery would become
     * invisible to settlement - which is the whole point of tracking both.
     *
     * @return the declared figure, falling back to the serial count when the file
     *         carries no quantity column
     */
    private int readDeclaredQuantity(
            PendingRow row,
            ImportBatchFileMappingRequest mapping,
            int serialCount,
            List<ImportBatchFileIssueResponse> issues
    ) {
        if (row.quantityText() == null) {
            return serialCount;
        }

        Integer declared = TabularValueParser
                .parseQuantity(row.quantityText(), mapping.numberStyleOrAuto())
                .orElse(null);
        if (declared == null || declared <= 0) {
            issues.add(ImportBatchFileIssueResponse.of(
                    ImportBatchFileIssueCode.QUANTITY_INVALID, mapping.quantityColumn()));
            return serialCount;
        }

        if (declared < serialCount) {
            // More serials than the supplier claims to have delivered is a
            // contradiction, and ticket creation would reject it anyway.
            issues.add(ImportBatchFileIssueResponse.of(
                    ImportBatchFileIssueCode.QUANTITY_BELOW_SERIAL_COUNT,
                    mapping.quantityColumn(),
                    String.format("Tệp khai %d vé nhưng có tới %d sê-ri.", declared, serialCount),
                    List.of()));
            return declared;
        }
        if (declared > serialCount) {
            issues.add(ImportBatchFileIssueResponse.of(
                    ImportBatchFileIssueCode.QUANTITY_ABOVE_SERIAL_COUNT,
                    mapping.quantityColumn(),
                    String.format("Tệp khai %d vé nhưng chỉ có %d sê-ri; thiếu %d vé.",
                            declared, serialCount, declared - serialCount),
                    List.of()));
        }
        return declared;
    }

    // ----------------------------------------------------------- merging

    private void mergeQuantityIntoRow(
            List<ImportBatchFileRowResponse> resolved,
            int firstRowNumber,
            int quantityToAdd
    ) {
        replaceRow(resolved, firstRowNumber, existing -> {
            List<ImportBatchFileIssueResponse> issues = withDuplicateNote(
                    existing.issues(), ImportBatchFileIssueCode.DUPLICATE_STATION_IN_GROUP);
            return rebuild(existing)
                    .declareQuantity(Optional.ofNullable(existing.declareQuantity()).orElse(0) + quantityToAdd)
                    .status(ImportBatchFileRowStatus.WARNING)
                    .issues(issues)
                    .build();
        });
    }

    private void mergeSerialsIntoRow(
            List<ImportBatchFileRowResponse> resolved,
            int firstRowNumber,
            List<String> serials,
            List<String> images
    ) {
        replaceRow(resolved, firstRowNumber, existing -> {
            List<String> mergedSerials = new ArrayList<>(
                    Optional.ofNullable(existing.serialNumbers()).orElse(List.of()));
            mergedSerials.addAll(serials);

            List<String> mergedImages = new ArrayList<>(
                    Optional.ofNullable(existing.ticketImages()).orElse(List.of()));
            for (int index = 0; index < serials.size(); index++) {
                mergedImages.add(images != null && index < images.size() ? images.get(index) : null);
            }

            return rebuild(existing)
                    .serialNumbers(mergedSerials)
                    .ticketImages(mergedImages)
                    .serialCount(mergedSerials.size())
                    .declareQuantity(Optional.ofNullable(existing.declareQuantity()).orElse(0)
                            + serials.size())
                    // Absorbing a one-serial row is the normal shape, so the row it
                    // merges into keeps whatever status it already had.
                    .status(existing.status())
                    .issues(existing.issues())
                    .build();
        });
    }

    private void replaceRow(
            List<ImportBatchFileRowResponse> resolved,
            int rowNumber,
            java.util.function.UnaryOperator<ImportBatchFileRowResponse> update
    ) {
        for (int index = 0; index < resolved.size(); index++) {
            if (resolved.get(index).rowNumber() == rowNumber) {
                resolved.set(index, update.apply(resolved.get(index)));
                return;
            }
        }
    }

    /** Records are immutable, so a merge rebuilds the row with everything else intact. */
    private ImportBatchFileRowResponse.ImportBatchFileRowResponseBuilder rebuild(
            ImportBatchFileRowResponse existing
    ) {
        return ImportBatchFileRowResponse.builder()
                .rowNumber(existing.rowNumber())
                .rawValues(existing.rawValues())
                .drawDate(existing.drawDate())
                .lotteryStationId(existing.lotteryStationId())
                .stationName(existing.stationName())
                .resolvedBatchType(existing.resolvedBatchType())
                .numbers(existing.numbers())
                .serialNumbers(existing.serialNumbers())
                .ticketImages(existing.ticketImages())
                .declareQuantity(existing.declareQuantity())
                .serialCount(existing.serialCount())
                .importCost(existing.importCost());
    }

    private List<ImportBatchFileIssueResponse> withDuplicateNote(
            List<ImportBatchFileIssueResponse> existing,
            ImportBatchFileIssueCode code
    ) {
        List<ImportBatchFileIssueResponse> issues = new ArrayList<>(existing);
        if (issues.stream().noneMatch(issue -> issue.code() == code)) {
            issues.add(ImportBatchFileIssueResponse.of(code));
        }
        return issues;
    }

    // --------------------------------------------------------- summaries

    /**
     * Pairs each resolved row with the raw row it came from so the file's prices
     * can be read back, then compares one representative row per station.
     *
     * <p>A supplier repeats the same prices on every row of a station, so the
     * first importable row is enough; checking all of them would only repeat the
     * same finding hundreds of times in a file with thousands of tickets.
     */
    private List<ImportBatchFilePricingMismatchResponse> collectPricingMismatches(
            List<PendingRow> rawRows,
            List<ImportBatchFileRowResponse> resolved,
            Map<Long, LotteryStationModel> stationsById,
            ImportBatchFileMappingRequest mapping
    ) {
        int size = Math.min(rawRows.size(), resolved.size());
        List<PricingCandidate> candidates = new ArrayList<>(size);
        for (int index = 0; index < size; index++) {
            ImportBatchFileRowResponse row = resolved.get(index);
            PendingRow raw = rawRows.get(index);
            candidates.add(new PricingCandidate(
                    row.rowNumber(),
                    row.lotteryStationId(),
                    raw.salePriceText(),
                    raw.commissionRateText(),
                    raw.importCostText()));
        }
        return scanPricing(candidates, stationsById, mapping);
    }

    /** One line's stated prices, paired with the station it resolved to. */
    record PricingCandidate(
            int rowNumber,
            Long lotteryStationId,
            String salePriceText,
            String commissionRateText,
            String importCostText
    ) {
    }

    /**
     * Finds the first line per station whose prices contradict the station record.
     *
     * <p>Every line naming a station is examined, whatever its row status. A line
     * merged into an earlier one is still a physical ticket the supplier charged
     * for; skipping those meant a price edited on the second line of a lottery
     * number was never compared, and since one number normally occupies four
     * consecutive lines, that was three lines in four going unchecked.
     *
     * <p>Only the first offending line per station is reported: a supplier states
     * the same prices on every line, so repeating the finding hundreds of times
     * would bury it.
     */
    List<ImportBatchFilePricingMismatchResponse> scanPricing(
            List<PricingCandidate> candidates,
            Map<Long, LotteryStationModel> stationsById,
            ImportBatchFileMappingRequest mapping
    ) {
        boolean fileCarriesPrices = hasText(mapping.salePriceColumn())
                || hasText(mapping.commissionRateColumn())
                || hasText(mapping.importCostColumn());
        if (!fileCarriesPrices) {
            return List.of();
        }

        TabularNumberStyle numberStyle = mapping.numberStyleOrAuto();
        Map<Long, ImportBatchFilePricingMismatchResponse> byStation = new LinkedHashMap<>();
        for (PricingCandidate candidate : candidates) {
            Long stationId = candidate.lotteryStationId();
            if (stationId == null || byStation.containsKey(stationId)) {
                continue;
            }
            LotteryStationModel station = stationsById.get(stationId);
            if (station == null) {
                continue;
            }

            ImportBatchFilePricingMismatchResponse comparison = pricingComparator.compare(
                    station,
                    TabularValueParser.parseDecimal(candidate.salePriceText(), numberStyle).orElse(null),
                    TabularValueParser.parseDecimal(candidate.commissionRateText(), numberStyle).orElse(null),
                    TabularValueParser.parseDecimal(candidate.importCostText(), numberStyle).orElse(null)
            );
            if (comparison.hasMismatch()) {
                // Naming the line matters in a file of hundreds: the operator has
                // to find the cell before deciding whose figure is right.
                byStation.put(stationId, comparison.toBuilder()
                        .rowNumber(candidate.rowNumber())
                        .build());
            }
        }
        return List.copyOf(byStation.values());
    }

    /**
     * Names every offending station and field in the group issue, so an operator
     * scanning a long preview sees what to fix without opening each row.
     */
    private String describePricingMismatches(List<ImportBatchFilePricingMismatchResponse> mismatches) {
        StringBuilder message = new StringBuilder("Giá trong tệp lệch với cấu hình đài: ");
        for (int index = 0; index < mismatches.size(); index++) {
            ImportBatchFilePricingMismatchResponse item = mismatches.get(index);
            if (index > 0) {
                message.append("; ");
            }
            message.append(item.stationName());
            if (item.rowNumber() != null) {
                message.append(" dòng ").append(item.rowNumber());
            }
            message.append(" (");
            List<String> parts = new ArrayList<>();
            if (item.salePriceMismatch()) {
                parts.add(String.format("giá bán tệp %s / hệ thống %s",
                        item.salePriceInFile(), item.salePriceInSystem()));
            }
            if (item.commissionRateMismatch()) {
                parts.add(String.format("hoa hồng tệp %s%% / hệ thống %s%%",
                        item.commissionRateInFile(), item.commissionRateInSystem()));
            }
            if (item.importCostMismatch()) {
                parts.add(String.format("giá nhập tệp %s / hệ thống %s",
                        item.importCostInFile(), item.importCostExpected()));
            }
            message.append(String.join(", ", parts)).append(")");
        }
        message.append(". Vui lòng đối chiếu và cập nhật giá đài trước khi tạo phiếu.");
        return message.toString();
    }

    /** Names every station whose schedule blocks this draw date, and the fix. */
    private String describeScheduleMismatches(
            List<ImportBatchFileScheduleMismatchResponse> mismatches,
            LocalDate drawDate
    ) {
        String dayLabel = LotteryDrawScheduleFormatter.dayLabel(drawDate.getDayOfWeek());
        String stations = mismatches.stream()
                .map(item -> item.active()
                        ? String.format("%s (đang quay %s)", item.stationName(),
                        item.currentDrawDays().isEmpty()
                                ? "chưa thiết lập"
                                : LotteryDrawScheduleFormatter.dayLabels(item.currentDrawDays()))
                        : String.format("%s (ngừng hoạt động)", item.stationName()))
                .collect(Collectors.joining("; "));

        return String.format(
                "Ngày quay %s là %s, nhưng %d nhà đài trong tệp không có lịch quay vào thứ này: %s. "
                        + "Nếu các đài này thực sự có quay, hãy sửa lịch quay rồi xem trước lại.",
                drawDate.format(DATE_DISPLAY), dayLabel, mismatches.size(), stations);
    }

    private List<ImportBatchFileStationSummaryResponse> summarizeStations(
            List<ImportBatchFileRowResponse> rows,
            Map<Long, LotteryStationModel> stationsById
    ) {
        Map<Long, List<ImportBatchFileRowResponse>> byStation = rows.stream()
                .filter(ImportBatchFileRowResponse::isImportable)
                .filter(row -> row.lotteryStationId() != null)
                .collect(Collectors.groupingBy(
                        ImportBatchFileRowResponse::lotteryStationId,
                        LinkedHashMap::new,
                        Collectors.toList()));

        List<ImportBatchFileStationSummaryResponse> summaries = new ArrayList<>();
        byStation.forEach((stationId, stationRows) -> {
            LotteryStationModel station = stationsById.get(stationId);
            BigDecimal importCost = station == null
                    ? BigDecimal.ZERO
                    : ImportCostCalculator.fromStation(station);
            int declaredQuantity = stationRows.stream()
                    .mapToInt(row -> Optional.ofNullable(row.declareQuantity()).orElse(0))
                    .sum();
            int serialCount = stationRows.stream()
                    .mapToInt(row -> Optional.ofNullable(row.serialCount()).orElse(0))
                    .sum();
            if (declaredQuantity <= 0) {
                return;
            }
            summaries.add(ImportBatchFileStationSummaryResponse.builder()
                    .lotteryStationId(stationId)
                    .stationName(station == null ? null : station.getName())
                    .ticketCount(stationRows.size())
                    .serialCount(serialCount)
                    .declaredQuantity(declaredQuantity)
                    .importCost(importCost)
                    .declaredCostValue(importCost.multiply(BigDecimal.valueOf(declaredQuantity)))
                    .build());
        });
        return summaries;
    }

    // ------------------------------------------------------------- config

    @Override
    @Transactional(readOnly = true)
    public ImportBatchFileConfigResponse getConfig() {
        ImportBatchFileConfig config = importBatchFileConfigService.get();
        LocalDateTime now = LocalDateTime.now(clock);

        return ImportBatchFileConfigResponse.builder()
                .configKey(SystemConfigEnum.TICKET_IMPORT_FILE_CONFIG.name())
                .readingDirection("ROW")
                .readingDirectionNote("Luôn đọc theo dòng ngang: mỗi dòng là một bản ghi. "
                        + "Hệ thống không đọc bảng chéo (nhà đài nằm trên các cột).")
                .fields(buildFieldRules(config))
                .maxFileSizeMb(config.maxFileSizeMb())
                .maxRows(config.maxRows())
                .serialSeparator(config.serialSeparator())
                .storeOriginalFile(config.storeOriginalFile())
                .allowPartialImport(config.allowPartialImport())
                .allowedExtensions(List.of("csv", "xlsx"))
                .drawDateWindowFrom(drawDateWindowPolicy.fileImportFrom(now))
                .drawDateWindowTo(drawDateWindowPolicy.fileImportTo(now))
                .supportedDateFormats(List.of(
                        "dd/MM/yyyy", "d/M/yyyy", "dd-MM-yyyy", "yyyy-MM-dd", "số serial Excel"))
                // Spelt out because the panel has to explain the whole behaviour,
                // not only the half that happens to be editable in settings.
                .fixedRules(List.of(
                        "Chỉ tạo phiếu cho ngày quay hôm nay hoặc ngày mai.",
                        "Mỗi nhà đài chỉ một dòng phiếu trong một phiếu nhập.",
                        "Bắt buộc có cột nhà đài; ưu tiên khớp theo mã đài nếu tệp có cột mã.",
                        "Phải có cột số lượng, hoặc cặp cột dãy số + danh sách sê-ri.",
                        "Số lượng khai báo lấy từ cột số lượng; số vé thực nhập đếm theo sê-ri.",
                        "Giá vốn luôn lấy theo cấu hình nhà đài, không lấy từ tệp.",
                        "Nhiều dòng cùng dãy số của một nhà đài sẽ gộp thành một vé nhiều sê-ri."
                ))
                .build();
    }

    @Override
    @Transactional
    public ImportBatchFileConfigResponse updateConfig(UpdateImportBatchFileConfigRequest request) {
        importBatchFileConfigService.update(request);
        return getConfig();
    }

    /**
     * Describes every field the importer can read: where it comes from, whether a
     * file must carry it, and whether its cell holds one value or a list.
     *
     * <p>Requirement is CONDITIONAL rather than a plain boolean because it depends
     * on the shape of the file: a declaration file needs a quantity column, a
     * ticket file needs the lottery number and serial columns instead.
     */
    private List<ImportBatchFileFieldRuleResponse> buildFieldRules(ImportBatchFileConfig config) {
        Map<String, List<String>> aliases = mappingDetector.resolveAliases(config.fieldAliases());
        String listNote = "Nhiều giá trị trong một ô, cách nhau bằng \"" + config.serialSeparator() + "\".";

        return List.of(
                fieldRule("drawDateColumn", "Ngày quay", "CONDITIONAL", false, aliases,
                        "Bỏ trống nếu tệp chỉ có một ngày quay; khi đó phải chọn ngày áp dụng cho cả tệp."),
                fieldRule("stationCodeColumn", "Mã đài", "OPTIONAL", false, aliases,
                        "Ưu tiên hơn tên nhà đài. Có mã thì khớp chính xác, không cần dò tên."),
                fieldRule("stationColumn", "Nhà đài", "MANDATORY", false, aliases,
                        "Khớp theo tên sau khi bỏ dấu; tên lạ sẽ được gợi ý để chọn và ghi nhớ."),
                fieldRule("quantityColumn", "Số lượng", "CONDITIONAL", false, aliases,
                        "Bắt buộc nếu tệp không có sê-ri. Đây là số nhà cung cấp khai giao."),
                fieldRule("numbersColumn", "Dãy số", "CONDITIONAL", false, aliases,
                        "Bắt buộc nếu muốn nhập luôn vé. Chỉ chữ số, độ dài theo quy định của miền."),
                fieldRule("serialsColumn", "Số sê-ri", "CONDITIONAL", true, aliases,
                        "Bắt buộc nếu muốn nhập luôn vé. Nên để mỗi dòng một sê-ri để mỗi tờ vé có "
                                + "ảnh riêng; vẫn chấp nhận nhiều sê-ri trong một ô. " + listNote),
                fieldRule("ticketImageColumn", "Ảnh vé", "OPTIONAL", true, aliases,
                        "Mỗi dòng một sê-ri thì đây là ảnh của đúng tờ vé đó. Nếu một ô chứa nhiều "
                                + "sê-ri thì phải có một ảnh dùng chung, hoặc đủ ảnh theo đúng thứ tự. "
                                + listNote),
                fieldRule("importCostColumn", "Giá nhập", "OPTIONAL", false, aliases,
                        "Chỉ để đối chiếu. Hệ thống luôn dùng giá cấu hình của nhà đài."),
                fieldRule("salePriceColumn", "Giá bán", "OPTIONAL", false, aliases,
                        "Chỉ để đối chiếu với giá bán đang cấu hình của nhà đài."),
                fieldRule("commissionRateColumn", "Hoa hồng", "OPTIONAL", false, aliases,
                        "Chỉ để đối chiếu với tỷ lệ hoa hồng đang cấu hình của nhà đài.")
        );
    }

    private ImportBatchFileFieldRuleResponse fieldRule(
            String field,
            String label,
            String requirement,
            boolean list,
            Map<String, List<String>> aliases,
            String note
    ) {
        return ImportBatchFileFieldRuleResponse.builder()
                .field(field)
                .label(label)
                .requirement(requirement)
                .list(list)
                .aliases(aliases.getOrDefault(field, List.of()))
                .note(note)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ImportBatchFileJobResponse> getJobs(int page, int size, Long supplierId) {
        Pageable pageable = PageRequest.of(
                Math.max(0, page - 1), size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<ImportBatchFileImportJobEntity> jobs = supplierId == null
                ? importJobRepository.findByDeletedAtIsNull(pageable)
                : importJobRepository.findBySupplierIdAndDeletedAtIsNull(supplierId, pageable);

        return PageResponse.from(jobs.map(this::toJobResponse), page, size);
    }

    /** A supplier deactivated since the import must not break the history list. */
    private String resolveSupplierName(Long supplierId) {
        try {
            return lotterySupplierServicePort.getActiveModelById(supplierId).getName();
        } catch (RuntimeException e) {
            return null;
        }
    }

    private ImportBatchFileJobResponse toJobResponse(ImportBatchFileImportJobEntity job) {
        return ImportBatchFileJobResponse.builder()
                .id(job.getId())
                .fileName(job.getFileName())
                .fileHash(job.getFileHash())
                .originalFileUrl(job.getOriginalFileUrl())
                .supplierId(job.getSupplierId())
                .supplierName(resolveSupplierName(job.getSupplierId()))
                .status(job.getStatus())
                .statusLabel(job.getStatus() == null ? null : job.getStatus().getLabel())
                .importsTickets(job.isImportsTickets())
                .requestedDrawDates(job.getRequestedDrawDates())
                .requestedCount(job.getRequestedCount())
                .createdCount(job.getCreatedCount())
                .failedCount(job.getFailedCount())
                .declaredQuantity(job.getDeclaredQuantity())
                .importedQuantity(job.getImportedQuantity())
                .errorCode(job.getErrorCode())
                .errorMessage(job.getErrorMessage())
                .startedAt(job.getStartedAt())
                .finishedAt(job.getFinishedAt())
                .build();
    }

    // ---------------------------------------------------------------- job

    /**
     * Opens the history row before anything is created.
     *
     * <p>Recorded even if every draw date then fails, because "someone uploaded
     * this file and got nothing" is exactly the case an operator comes looking for.
     */
    private ImportBatchFileImportJobEntity startJob(
            ImportBatchFileImportCommitRequest request,
            String fileName,
            StorageResult evidence,
            UUID operatorId,
            LocalDateTime now
    ) {
        try {
            return importJobRepository.save(ImportBatchFileImportJobEntity.builder()
                    .fileHash(request.fileHash())
                    .fileName(fileName)
                    .originalFileUrl(evidence == null ? null : evidence.url())
                    .originalFilePublicId(evidence == null ? null : evidence.publicId())
                    .supplierId(request.supplierId())
                    .importedBy(operatorId)
                    .status(ImportBatchFileJobStatus.PROCESSING)
                    .importsTickets(request.mapping().importsTickets())
                    .requestedDrawDates(request.drawDates().stream()
                            .map(LocalDate::toString)
                            .collect(Collectors.joining(",")))
                    .requestedCount(request.drawDates().size())
                    .startedAt(now)
                    .build());
        } catch (RuntimeException e) {
            // History is useful, not essential; never let it block an import.
            log.warn("Could not open an import job record", e);
            return null;
        }
    }

    private void finishJob(
            ImportBatchFileImportJobEntity job,
            ImportBatchFileImportResultResponse result
    ) {
        if (job == null) {
            return;
        }

        try {
            job.setStatus(resolveJobStatus(result));
            job.setCreatedCount(result.createdCount());
            job.setFailedCount(result.failedCount());
            job.setDeclaredQuantity(result.items().stream()
                    .mapToInt(item -> Optional.ofNullable(item.declaredSerialCount()).orElse(0)).sum());
            job.setImportedQuantity(result.items().stream()
                    .mapToInt(item -> Optional.ofNullable(item.importedSerialCount()).orElse(0)).sum());

            result.items().stream()
                    .filter(item -> !item.success())
                    .findFirst()
                    .ifPresent(failure -> {
                        job.setErrorCode(failure.errorCode());
                        job.setErrorMessage(result.items().stream()
                                .filter(item -> !item.success())
                                .map(item -> item.drawDate() + ": " + item.message())
                                .collect(Collectors.joining("; ")));
                    });

            job.setFinishedAt(LocalDateTime.now(clock));
            importJobRepository.save(job);
        } catch (RuntimeException e) {
            log.warn("Could not close import job id={}", job.getId(), e);
        }
    }

    private ImportBatchFileJobStatus resolveJobStatus(ImportBatchFileImportResultResponse result) {
        if (result.createdCount() == 0) {
            return ImportBatchFileJobStatus.FAILED;
        }
        // A shortfall in tickets counts as partial too: the batch exists but is not
        // finished, and the operator needs to know without opening it.
        boolean shortfall = result.items().stream().anyMatch(item ->
                item.success()
                        && Optional.ofNullable(item.importedSerialCount()).orElse(0)
                        < Optional.ofNullable(item.declaredSerialCount()).orElse(0));
        return result.failedCount() > 0 || shortfall
                ? ImportBatchFileJobStatus.PARTIAL_SUCCESS
                : ImportBatchFileJobStatus.COMPLETED;
    }

    // ------------------------------------------------------------- export

    /** Header of an exported ticket file; also what the importer auto-detects. */
    /**
     * One row per physical ticket rather than one row per lottery number.
     *
     * <p>Every serial carries its own photo, and a joined cell cannot hold a
     * distinct image per ticket without the two lists silently drifting apart.
     */
    private static final List<String> TICKET_EXPORT_HEADERS =
            List.of("Mã đài", "Nhà đài", "Ngày quay", "Dãy số", "Số sê-ri", "Ảnh vé");

    private static final List<String> DECLARATION_EXPORT_HEADERS =
            List.of("Mã đài", "Nhà đài", "Ngày quay", "Số lượng");

    @Override
    @Transactional(readOnly = true)
    public ImportBatchFileExportResponse export(Long importBatchId) {
        ImportBatchResponse batch = importBatchServicePort.getById(importBatchId);
        ImportBatchDocument document = assembleDocument(batch);

        return ImportBatchFileExportResponse.builder()
                .fileName(exportFileName(batch))
                .content(documentWriter.write(document))
                .carriesTickets(!document.tickets().isEmpty())
                .build();
    }

    /**
     * Gathers everything the exported document names, resolving each reference
     * once.
     *
     * <p>A delivery note is only worth filing if it says who handed the tickets
     * over, who received them, and who booked them in - so the supplier record and
     * the operator's user record are read here rather than left as ids.
     */
    private ImportBatchDocument assembleDocument(ImportBatchResponse batch) {
        String drawDate = batch.drawDate().format(DATE_DISPLAY);

        List<ImportBatchDocument.StationLine> stations = new ArrayList<>();
        List<ImportBatchDocument.TicketLine> tickets = new ArrayList<>();

        for (ImportBatchLineResponse line : batch.lines()) {
            LotteryStationModel station =
                    lotteryStationServicePort.findModelById(line.lotteryStationId()).orElse(null);
            String code = station == null ? "" : Optional.ofNullable(station.getCode()).orElse("");
            String name = station == null ? "" : station.getName();
            BigDecimal salePrice = station == null ? null : station.getPrice();
            BigDecimal commissionPercent = station == null || station.getCommissionRate() == null
                    ? null
                    : station.getCommissionRate().multiply(BigDecimal.valueOf(100));

            int declared = Optional.ofNullable(line.declareQuantity()).orElse(0);
            int imported = Optional.ofNullable(line.totalQuantity()).orElse(0);

            stations.add(new ImportBatchDocument.StationLine(
                    code,
                    name,
                    drawDate,
                    LotteryDrawScheduleFormatter.describe(station),
                    line.batchType() == null ? "" : line.batchType().getLabel(),
                    line.status() == null ? "" : line.status().getLabel(),
                    describeProgress(imported, declared),
                    declared,
                    imported,
                    salePrice,
                    commissionPercent,
                    line.importCost(),
                    line.totalCostValue() != null ? line.totalCostValue() : line.declaredCostValue()
            ));

            lotteryTicketServicePort.listEntryTicketsByImportBatchLine(line.id()).tickets()
                    .forEach(ticket -> ticket.serials().forEach(serial -> tickets.add(
                            new ImportBatchDocument.TicketLine(
                                    code,
                                    name,
                                    drawDate,
                                    ticket.numbers(),
                                    serial.serialNumber(),
                                    Optional.ofNullable(serial.ticketImg()).orElse(""),
                                    line.importCost(),
                                    salePrice,
                                    commissionPercent
                            ))));
        }

        return new ImportBatchDocument(
                new ImportBatchDocument.Header(
                        batch.batchCode(),
                        drawDate,
                        describeBatchType(batch),
                        batch.status() == null ? "" : batch.status().getLabel(),
                        batch.importMode() == null ? "" : batch.importMode().getLabel(),
                        formatMoment(batch.importedAt()),
                        formatMoment(batch.createdAt()),
                        formatMoment(batch.completedAt()),
                        batch.note()
                ),
                issuerParty(),
                supplierParty(batch.supplierId(), batch.supplierName()),
                importingOperator(batch.importedBy()),
                new ImportBatchDocument.Totals(
                        Optional.ofNullable(batch.totalDeclareQuantity()).orElse(0),
                        Optional.ofNullable(batch.totalImportedQuantity()).orElse(0),
                        Optional.ofNullable(batch.totalDeclaredCostValue()).orElse(BigDecimal.ZERO),
                        Optional.ofNullable(batch.totalImportedCostValue()).orElse(BigDecimal.ZERO),
                        stations.size()
                ),
                List.copyOf(stations),
                List.copyOf(tickets)
        );
    }

    /**
     * The batch as a whole has no type - each line carries its own. They almost
     * always agree, so the shared value is named and a mixed batch says so rather
     * than silently reporting the first line's type as the batch's.
     */
    private String describeBatchType(ImportBatchResponse batch) {
        List<String> distinct = batch.lines().stream()
                .map(ImportBatchLineResponse::batchType)
                .filter(Objects::nonNull)
                .map(ImportBatchType::getLabel)
                .distinct()
                .toList();
        if (distinct.isEmpty()) {
            return "";
        }
        return distinct.size() == 1 ? distinct.getFirst() : String.join(" + ", distinct);
    }

    private String describeProgress(int imported, int declared) {
        if (declared <= 0) {
            return imported > 0 ? String.valueOf(imported) : "—";
        }
        return String.format("%d/%d (%d%%)", imported, declared,
                Math.round(imported * 100.0 / declared));
    }

    private ImportBatchDocument.Party issuerParty() {
        BusinessDocumentIssuer.Issuer issuer = businessDocumentIssuer.resolve();
        return new ImportBatchDocument.Party(
                issuer.legalName(), null, issuer.taxCode(), issuer.representative(),
                issuer.phone(), issuer.email(), issuer.address());
    }

    /**
     * Falls back to the name denormalised onto the batch when the supplier record
     * is gone: a deleted supplier must not make an old delivery note unprintable.
     */
    private ImportBatchDocument.Party supplierParty(Long supplierId, String fallbackName) {
        // Read straight from the repository, not through getActiveModelById: an old
        // batch belonging to a since-deactivated supplier must still print.
        LotterySupplierModel supplier = supplierId == null
                ? null
                : lotterySupplierRepositoryPort.findById(supplierId).orElse(null);
        if (supplier == null) {
            return new ImportBatchDocument.Party(
                    fallbackName, null, null, null, null, null, null);
        }
        return new ImportBatchDocument.Party(
                supplier.getName(),
                supplier.getCode(),
                supplier.getTaxCode(),
                supplier.getContactName(),
                supplier.getContactPhone(),
                supplier.getContactEmail(),
                supplier.getAddress());
    }

    private ImportBatchDocument.Operator importingOperator(UUID operatorId) {
        if (operatorId == null) {
            return new ImportBatchDocument.Operator(null, null, null, null);
        }
        return userLookupServicePort.findById(operatorId)
                .map(user -> new ImportBatchDocument.Operator(
                        user.getFullName(),
                        user.getRole() == null ? null : user.getRole().getName(),
                        user.getPhoneNumber(),
                        user.getEmail()))
                .orElseGet(() -> new ImportBatchDocument.Operator(null, null, null, null));
    }

    private String formatMoment(LocalDateTime moment) {
        return moment == null ? null : moment.format(DATE_TIME_DISPLAY);
    }

    /**
     * Keeps the supplier's upload for settlement disputes.
     *
     * <p>Returns null rather than throwing when storage is unavailable: losing the
     * evidence copy is a problem to look into, but it must not stop tickets that
     * were already reviewed and approved from being imported.
     */
    private StorageResult storeOriginalFile(byte[] content, String fileName) {
        try {
            return storagePort.upload(new UploadRequest(
                    content,
                    fileName == null || fileName.isBlank() ? "import-batch-file" : fileName,
                    resolveContentType(fileName),
                    IMPORT_EVIDENCE_FOLDER
            ));
        } catch (RuntimeException e) {
            log.warn("Could not store the original import file as evidence", e);
            return null;
        }
    }

    private String resolveContentType(String fileName) {
        String name = fileName == null ? "" : fileName.toLowerCase(Locale.ROOT);
        if (name.endsWith(".xlsx") || name.endsWith(".xlsm")) {
            return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        }
        return "text/csv";
    }

    private String exportFileName(ImportBatchResponse batch) {
        String code = Optional.ofNullable(batch.batchCode()).orElse("PN-" + batch.id());
        return "phieu-nhap-" + code.replaceAll("[^A-Za-z0-9._-]", "-") + ".xlsx";
    }

    // ------------------------------------------------------- learned data

    @Override
    @Transactional(readOnly = true)
    public List<ImportBatchFileMappingProfileResponse> getMappingProfiles(Long supplierId) {
        List<ImportBatchFileMappingProfileEntity> profiles = supplierId == null
                ? mappingProfileRepository.findByDeletedAtIsNullOrderByLastUsedAtDesc()
                : mappingProfileRepository
                        .findBySupplierIdAndDeletedAtIsNullOrderByLastUsedAtDesc(supplierId);

        return profiles.stream()
                .map(profile -> ImportBatchFileMappingProfileResponse.builder()
                        .id(profile.getId())
                        .supplierId(profile.getSupplierId())
                        .supplierName(resolveSupplierName(profile.getSupplierId()))
                        .headerSignature(profile.getHeaderSignature())
                        // A profile whose JSON no longer parses is still listed, so the
                        // operator can see it and delete it rather than wonder why an
                        // upload keeps ignoring it.
                        .mapping(readMapping(profile).orElse(null))
                        .useCount(profile.getUseCount())
                        .lastUsedAt(profile.getLastUsedAt())
                        .createdAt(profile.getCreatedAt())
                        .build())
                .toList();
    }

    @Override
    @Transactional
    public void deleteMappingProfile(Long id) {
        ImportBatchFileMappingProfileEntity profile = mappingProfileRepository.findById(id)
                .filter(found -> found.getDeletedAt() == null)
                .orElseThrow(() -> new DomainException(ErrorCode.IMPORT_BATCH_FILE_MAPPING_PROFILE_NOT_FOUND));

        // Soft delete keeps the audit trail of which layout was once trusted.
        profile.setDeletedAt(LocalDateTime.now(clock));
        mappingProfileRepository.save(profile);
    }

    @Override
    @Transactional
    public void saveMappingProfile(SaveImportBatchFileMappingProfileRequest request) {
        String mappingJson = writeMapping(request.mapping());
        ImportBatchFileMappingProfileEntity profile = mappingProfileRepository
                .findBySupplierIdAndHeaderSignatureAndDeletedAtIsNull(
                        request.supplierId(), request.headerSignature())
                .orElseGet(() -> ImportBatchFileMappingProfileEntity.builder()
                        .supplierId(request.supplierId())
                        .headerSignature(request.headerSignature())
                        .useCount(0)
                        .build());

        profile.setMapping(mappingJson);
        profile.setUseCount(profile.getUseCount() + 1);
        profile.setLastUsedAt(LocalDateTime.now(clock));
        mappingProfileRepository.save(profile);
    }

    @Override
    @Transactional
    public void saveStationAlias(SaveLotteryStationAliasRequest request) {
        String normalized = VietnameseTextNormalizer.normalizeStationName(request.rawName());
        if (normalized.isEmpty()) {
            throw new DomainException(ErrorCode.INVALID_INPUT);
        }
        // Confirms the station exists and is usable before we learn anything from it.
        lotteryStationServicePort.getModelById(request.lotteryStationId());

        LotteryStationAliasEntity alias = lotteryStationAliasRepository
                .findByAliasNormalizedAndDeletedAtIsNull(normalized)
                .orElseGet(() -> LotteryStationAliasEntity.builder().aliasNormalized(normalized).build());
        alias.setLotteryStationId(request.lotteryStationId());
        lotteryStationAliasRepository.save(alias);
    }

    // ------------------------------------------------------------ helpers

    private ImportBatchFileIssueResponse stationIssue(
            LotteryStationNameResolver.Match match,
            LocalDate drawDate
    ) {
        List<ImportBatchFileStationSuggestionResponse> suggestions = match.suggestions().stream()
                .map(suggestion -> ImportBatchFileStationSuggestionResponse.builder()
                        .lotteryStationId(suggestion.lotteryStationId())
                        .name(suggestion.name())
                        .score(suggestion.score())
                        .build())
                .toList();

        if (match.kind() == LotteryStationNameResolver.MatchKind.AMBIGUOUS) {
            return ImportBatchFileIssueResponse.of(
                    ImportBatchFileIssueCode.STATION_AMBIGUOUS, null, null, suggestions);
        }
        return ImportBatchFileIssueResponse.of(
                ImportBatchFileIssueCode.STATION_NOT_FOUND,
                null,
                String.format("Không khớp nhà đài nào có lịch quay ngày %s.", drawDate.format(DATE_DISPLAY)),
                suggestions);
    }

    private ImportBatchFileRowStatus rowStatus(List<ImportBatchFileIssueResponse> issues, boolean usable) {
        if (!usable || !noErrors(issues)) {
            return ImportBatchFileRowStatus.ERROR;
        }
        return issues.isEmpty() ? ImportBatchFileRowStatus.OK : ImportBatchFileRowStatus.WARNING;
    }

    private boolean noErrors(List<ImportBatchFileIssueResponse> issues) {
        return issues.stream().noneMatch(issue -> issue.severity() == ImportBatchFileIssueSeverity.ERROR);
    }

    private List<String> nullImages(int size) {
        List<String> images = new ArrayList<>(size);
        for (int index = 0; index < size; index++) {
            images.add(null);
        }
        return images;
    }

    private ImportBatchFileImportItemResultResponse failure(LocalDate drawDate, String code, String message) {
        return ImportBatchFileImportItemResultResponse.builder()
                .drawDate(drawDate)
                .success(false)
                .errorCode(code)
                .message(message)
                .build();
    }

    /** Echoes back what was actually used, including values that were auto-detected. */
    private ImportBatchFileMappingRequest appliedMapping(
            ImportBatchFileMappingRequest mapping,
            TabularTable table
    ) {
        return ImportBatchFileMappingRequest.builder()
                .headerRowIndex(mapping.headerRowIndex() == null ? 0 : mapping.headerRowIndex())
                .delimiter(mapping.delimiter() == null ? table.appliedDelimiter() : mapping.delimiter())
                .charset(mapping.charset() == null ? table.appliedCharset() : mapping.charset())
                .numberStyle(mapping.numberStyleOrAuto())
                .dateFormat(mapping.dateFormat())
                .drawDateColumn(mapping.drawDateColumn())
                .fallbackDrawDate(mapping.fallbackDrawDate())
                .stationCodeColumn(mapping.stationCodeColumn())
                .stationColumn(mapping.stationColumn())
                .quantityColumn(mapping.quantityColumn())
                .numbersColumn(mapping.numbersColumn())
                .serialsColumn(mapping.serialsColumn())
                .ticketImageColumn(mapping.ticketImageColumn())
                .serialSeparator(mapping.serialSeparatorOrDefault())
                .importCostColumn(mapping.importCostColumn())
                .build();
    }

    private Map<String, Long> loadAliasIndex() {
        return lotteryStationAliasRepository.findAllByDeletedAtIsNull().stream()
                .collect(Collectors.toMap(
                        LotteryStationAliasEntity::getAliasNormalized,
                        LotteryStationAliasEntity::getLotteryStationId,
                        (first, duplicate) -> first));
    }

    private List<Map<String, String>> sampleRows(TabularTable table) {
        return table.rows().stream()
                .limit(MAX_SAMPLE_ROWS)
                .map(row -> {
                    Map<String, String> values = new LinkedHashMap<>();
                    table.headers().forEach(header ->
                            values.put(header, Optional.ofNullable(row.get(header)).orElse("")));
                    return values;
                })
                .toList();
    }

    private void guardFileSize(byte[] content, ImportBatchFileConfig config) {
        if (content == null || content.length == 0) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_FILE_REQUIRED);
        }
        if (content.length > config.maxFileSizeBytes()) {
            throw new DomainException(
                    ErrorCode.IMPORT_BATCH_FILE_TOO_LARGE, null, config.maxFileSizeMb());
        }
    }

    private void validateMapping(TabularTable table, ImportBatchFileMappingRequest mapping) {
        requireColumn(table, mapping.stationColumn());
        if (hasText(mapping.stationCodeColumn())) {
            requireColumn(table, mapping.stationCodeColumn());
        }

        boolean hasNumbers = hasText(mapping.numbersColumn());
        boolean hasSerials = hasText(mapping.serialsColumn());
        if (hasNumbers != hasSerials) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_FILE_TICKET_COLUMNS_INCOMPLETE);
        }
        if (hasNumbers) {
            requireColumn(table, mapping.numbersColumn());
            requireColumn(table, mapping.serialsColumn());
        } else {
            // Without the tickets themselves the file can only declare quantities.
            requireColumn(table, mapping.quantityColumn());
        }

        if (hasText(mapping.drawDateColumn())) {
            requireColumn(table, mapping.drawDateColumn());
        } else if (mapping.fallbackDrawDate() == null) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_FILE_DRAW_DATE_SOURCE_REQUIRED);
        }
        if (hasText(mapping.quantityColumn())) {
            requireColumn(table, mapping.quantityColumn());
        }
        if (hasText(mapping.ticketImageColumn())) {
            requireColumn(table, mapping.ticketImageColumn());
        }
        if (hasText(mapping.importCostColumn())) {
            requireColumn(table, mapping.importCostColumn());
        }
    }

    private void requireColumn(TabularTable table, String column) {
        if (!table.hasColumn(column)) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_FILE_COLUMN_NOT_FOUND, null, column);
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private Optional<ImportBatchFileMappingRequest> readMapping(ImportBatchFileMappingProfileEntity profile) {
        try {
            return Optional.of(objectMapper.readValue(profile.getMapping(), ImportBatchFileMappingRequest.class));
        } catch (JsonProcessingException e) {
            log.warn("Ignoring unreadable mapping profile id={}", profile.getId(), e);
            return Optional.empty();
        }
    }

    private String writeMapping(ImportBatchFileMappingRequest mapping) {
        try {
            return objectMapper.writeValueAsString(mapping);
        } catch (JsonProcessingException e) {
            throw new DomainException(ErrorCode.INVALID_INPUT, e);
        }
    }

    /** Mirrors the supplier time checks enforced by ImportBatchService.create. */

    /** A file row after column mapping, before any resolution. */
    private record PendingRow(
            int rowNumber,
            Map<String, String> rawValues,
            LocalDate drawDate,
            String stationCodeText,
            String stationText,
            String numbersText,
            String serialsText,
            String quantityText,
            String ticketImageText,
            String importCostText,
            String salePriceText,
            String commissionRateText
    ) {
    }

    /** Everything shared by the rows of one draw date, including cross-row state. */
    private record GroupContext(
            LocalDate drawDate,
            ImportBatchImportMode importMode,
            List<LotteryStationNameResolver.Candidate> candidates,
            Map<Long, LotteryStationModel> stationsById,
            Map<String, Long> aliasIndex,
            LocalDateTime now,
            String serialSeparator,
            /**
             * Active stations NOT drawing on this date, keyed by canonical name.
             * Lets a name that fails to match the day's candidates be recognised as
             * a real station with the wrong schedule, rather than as an unknown one.
             */
            Map<String, LotteryStationModel> offScheduleByName,
            /** Filled while resolving rows; one entry per offending station. */
            Map<Long, ImportBatchFileScheduleMismatchResponse> scheduleMismatches,
            Map<Long, Integer> firstRowByStation,
            Map<TicketKey, Integer> firstRowByTicket,
            Set<String> seenSerials
    ) {
        GroupContext(
                LocalDate drawDate,
                ImportBatchImportMode importMode,
                List<LotteryStationNameResolver.Candidate> candidates,
                Map<Long, LotteryStationModel> stationsById,
                Map<String, Long> aliasIndex,
                LocalDateTime now,
                String serialSeparator
        ) {
            this(drawDate, importMode, candidates, stationsById, aliasIndex, now, serialSeparator,
                    Map.of(), new LinkedHashMap<>(),
                    new HashMap<>(), new HashMap<>(), new HashSet<>());
        }

        GroupContext(
                LocalDate drawDate,
                ImportBatchImportMode importMode,
                List<LotteryStationNameResolver.Candidate> candidates,
                Map<Long, LotteryStationModel> stationsById,
                Map<String, Long> aliasIndex,
                LocalDateTime now,
                String serialSeparator,
                Map<String, LotteryStationModel> offScheduleByName
        ) {
            this(drawDate, importMode, candidates, stationsById, aliasIndex, now, serialSeparator,
                    offScheduleByName, new LinkedHashMap<>(),
                    new HashMap<>(), new HashMap<>(), new HashSet<>());
        }
    }

    private record TicketKey(Long stationId, String numbers) {
    }

    /**
     * @param usable false when the station exists but cannot take tickets on this
     *               date, so the row is reported against a named station rather
     *               than as "not found"
     */
    private record StationResolution(
            Long stationId,
            String stationName,
            ImportBatchType batchType,
            BigDecimal importCost,
            RegionLength region,
            boolean usable
    ) {
        static StationResolution unresolved() {
            return new StationResolution(null, null, null, null, null, false);
        }

        static StationResolution blocked(Long stationId, String stationName) {
            return new StationResolution(stationId, stationName, null, null, null, false);
        }

        boolean isUsable() {
            return usable && stationId != null;
        }
    }

    /** How many digits a lottery number of this station's region has. */
    private record RegionLength(int min, int max) {

        static RegionLength of(LotteryStationModel station) {
            if (station == null || station.getRegion() == null) {
                return null;
            }
            Integer min = station.getRegion().minLength();
            Integer max = station.getRegion().maxLength();
            if (min == null) {
                return null;
            }
            return new RegionLength(min, max == null ? min : max);
        }
    }

}
