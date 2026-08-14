package com.daiphat.coreapi.infrastructure.adapter.out.streetagent.persistence;

import com.daiphat.coreapi.domain.model.enums.streetagent.DailySalesReportStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StreetAgentReportQueryAdapterTest {

    private static final LocalDate FROM = LocalDate.of(2026, 8, 1);
    private static final LocalDate TO = LocalDate.of(2026, 8, 31);

    @Mock
    private EntityManager entityManager;
    @Mock
    private TypedQuery<Object[]> reportQuery;
    @Mock
    private TypedQuery<Object[]> detailQuery;
    @Mock
    private TypedQuery<Object[]> settlementQuery;
    @Mock
    private TypedQuery<Long> openBatchQuery;

    private StreetAgentReportQueryAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new StreetAgentReportQueryAdapter(entityManager);
        stubQuery("from DailySalesReportEntity r", Object[].class, reportQuery);
        stubQuery("from AllocationBatchEntity batch", Long.class, openBatchQuery);
    }

    @Test
    void load_uses_independent_projections_and_excludes_deleted_report_details() {
        stubQuery("from DailySalesReportDetailEntity d", Object[].class, detailQuery);
        stubQuery("from AgentSettlementEntity s", Object[].class, settlementQuery);
        when(reportQuery.getResultList()).thenReturn(List.of(
                new Object[]{1L, 10L, "Nguyễn", "An", FROM, DailySalesReportStatus.FINALIZED,
                        8, 2, new BigDecimal("100000")},
                new Object[]{2L, 11L, "Trần", "Bình", TO, DailySalesReportStatus.OPEN,
                        4, 1, new BigDecimal("50000")}));
        when(detailQuery.getResultList()).thenReturn(List.of(
                new Object[]{1L, 100L, "Đài A", 10, 8, 2, new BigDecimal("100000")},
                new Object[]{2L, 101L, "Đài B", 5, 4, 1, new BigDecimal("50000")}));
        when(settlementQuery.getResultList()).thenReturn(List.<Object[]>of(
                new Object[]{10L, new BigDecimal("10000"), new BigDecimal("90000")}));
        when(openBatchQuery.getSingleResult()).thenReturn(1L);

        var dataset = adapter.load(FROM, TO, Set.of(DailySalesReportStatus.OPEN, DailySalesReportStatus.FINALIZED));

        assertThat(dataset.reports()).extracting(
                row -> row.reportId(), row -> row.allocatedQuantity(), row -> row.soldQuantity(), row -> row.grossSales())
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(1L, 10, 8, new BigDecimal("100000")),
                        org.assertj.core.groups.Tuple.tuple(2L, 5, 4, new BigDecimal("50000")));
        assertThat(dataset.stations()).extracting(row -> row.stationName(), row -> row.grossSales())
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("Đài A", new BigDecimal("100000")),
                        org.assertj.core.groups.Tuple.tuple("Đài B", new BigDecimal("50000")));
        assertThat(dataset.settlements()).singleElement().extracting(
                row -> row.agentId(), row -> row.commissionPayable(), row -> row.agentCashRemitted())
                .containsExactly(10L, new BigDecimal("10000"), new BigDecimal("90000"));
        assertThat(dataset.unsettledBatchCount()).isEqualTo(1L);

        ArgumentCaptor<String> queryCaptor = ArgumentCaptor.forClass(String.class);
        verify(entityManager, org.mockito.Mockito.times(4)).createQuery(queryCaptor.capture(), org.mockito.ArgumentMatchers.any(Class.class));
        assertThat(queryCaptor.getAllValues())
                .noneMatch(query -> query.contains("join fetch"))
                .anyMatch(query -> query.contains("from DailySalesReportDetailEntity d")
                        && query.contains("d.deletedAt is null"));
    }

    @Test
    void load_still_counts_open_batches_when_report_filter_is_finalized() {
        when(reportQuery.getResultList()).thenReturn(List.<Object[]>of());
        when(openBatchQuery.getSingleResult()).thenReturn(3L);

        var dataset = adapter.load(FROM, TO, Set.of(DailySalesReportStatus.FINALIZED));

        assertThat(dataset.reports()).isEmpty();
        assertThat(dataset.stations()).isEmpty();
        assertThat(dataset.settlements()).isEmpty();
        assertThat(dataset.unsettledBatchCount()).isEqualTo(3L);
        verify(openBatchQuery).getSingleResult();
    }

    private <T> void stubQuery(String fragment, Class<T> resultType, TypedQuery<T> query) {
        when(entityManager.createQuery(argThat(sql -> sql != null && sql.contains(fragment)), eq(resultType))).thenReturn(query);
        when(query.setParameter(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any()))
                .thenReturn(query);
    }
}
