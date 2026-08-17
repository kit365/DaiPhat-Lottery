package com.daiphat.coreapi.infrastructure.adapter.out.dashboard.persistence;

import com.daiphat.coreapi.application.dto.response.dashboard.*;
import com.daiphat.coreapi.application.port.out.dashboard.StaffDashboardQueryPort;
import com.daiphat.coreapi.shared.time.VietnamClock;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
@Transactional(readOnly = true)
public class PostgresStaffDashboardQueryAdapter implements StaffDashboardQueryPort {
    @PersistenceContext private EntityManager entityManager;
    private final VietnamClock vietnamClock;

    public PostgresStaffDashboardQueryAdapter(VietnamClock vietnamClock) { this.vietnamClock = vietnamClock; }

    @Override
    public StaffDashboardResponse.TaskSummary loadTaskSummary(UUID actorId, LocalDate day) {
        Object[] row = (Object[]) entityManager.createNativeQuery("""
            select count(distinct ab.id) filter (where ab.status = 'DRAFT'),
                   count(distinct ab.id) filter (where ab.status = 'RETURN_OPEN' and rb.status = 'PENDING_INSPECTION'),
                   count(distinct ab.id) filter (where ab.status = 'RETURN_OPEN' and rb.status = 'INSPECTING'),
                   count(distinct ab.id) filter (where ab.status = 'RETURN_OPEN' and rb.status = 'RECEIVED'),
                   count(distinct ab.id) filter (
                       where ab.status = 'DRAFT'
                         and coalesce(ab.effective_handover_deadline_at, ab.reservation_expires_at) < :now
                   )
              from allocation_batches ab
              left join return_batches rb
                on rb.source_allocation_batch_id = ab.id
               and rb.return_batch_type = 'STREET_AGENT_RETURN'
               and rb.deleted_at is null
             where ab.deleted_at is null and ab.business_date = :day
            """).setParameter("now", java.sql.Timestamp.valueOf(vietnamClock.now()))
                .setParameter("day", java.sql.Date.valueOf(day)).getSingleResult();
        return new StaffDashboardResponse.TaskSummary(n(row[0]), n(row[1]), n(row[2]), n(row[3]), n(row[4]));
    }

    @Override
    @SuppressWarnings("unchecked")
    public StaffDashboardResponse.WorkItems loadWorkItems(UUID actorId, LocalDate day, String status, int page, int size) {
        String statusFilter = status == null || status.isBlank() ? "" : " and ab.status = :status ";
        Query query = entityManager.createNativeQuery("""
              select ab.id::text,
                     case
                       when ab.status = 'DRAFT' then 'HANDOVER'
                       when rb.status = 'PENDING_INSPECTION' then 'RETURN_ENTRY'
                       when rb.status = 'INSPECTING' then 'INSPECTION'
                       when rb.status = 'RECEIVED' then 'SETTLEMENT'
                     end,
                     ab.status, ab.batch_code, coalesce(min(s.name), ''), ab.allocated_quantity,
                     coalesce(ab.effective_handover_deadline_at, ab.reservation_expires_at), ab.created_at
                from allocation_batches ab
                left join allocation_batch_details abd on abd.allocation_batch_id = ab.id and abd.deleted_at is null
                left join lottery_stations s on s.id = abd.lottery_station_id
                left join return_batches rb on rb.source_allocation_batch_id = ab.id
                    and rb.return_batch_type = 'STREET_AGENT_RETURN' and rb.deleted_at is null
               where ab.deleted_at is null and ab.business_date = :day """ + statusFilter + " group by ab.id, ab.status, rb.status, ab.batch_code, ab.allocated_quantity, ab.effective_handover_deadline_at, ab.reservation_expires_at, ab.created_at order by coalesce(ab.effective_handover_deadline_at, ab.reservation_expires_at), ab.created_at limit :limit offset :offset")
                .setParameter("day", java.sql.Date.valueOf(day)).setParameter("limit", size).setParameter("offset", (page - 1) * size);
        if (!statusFilter.isBlank()) query.setParameter("status", status);
        List<StaffDashboardResponse.WorkItem> items = ((List<Object[]>) query.getResultList()).stream()
                .filter(row -> row[1] != null)
                .map(row -> {
                    LocalDateTime deadline = time(row[6]);
                    String stage = String.valueOf(row[1]);
                    String allocationStatus = String.valueOf(row[2]);
                    return new StaffDashboardResponse.WorkItem("VENDOR_" + stage, priority(deadline), "ALLOCATION_BATCH",
                            String.valueOf(row[0]), String.valueOf(row[4]), n(row[5]), deadline, allocationStatus, true,
                            new DashboardActionTarget("street-agent-allocation", allocationStatus, String.valueOf(row[0])), time(row[7]));
                }).toList();
        Query countQuery = entityManager.createNativeQuery("""
                select count(*)
                  from allocation_batches ab
                  left join return_batches rb on rb.source_allocation_batch_id = ab.id
                    and rb.return_batch_type = 'STREET_AGENT_RETURN' and rb.deleted_at is null
                 where ab.deleted_at is null and ab.business_date = :day
                   and (ab.status = 'DRAFT' or (ab.status = 'RETURN_OPEN'
                        and rb.status in ('PENDING_INSPECTION', 'INSPECTING', 'RECEIVED')))
                """ + (statusFilter.isBlank() ? "" : " and ab.status = :status"));
        countQuery.setParameter("day", java.sql.Date.valueOf(day));
        if (!statusFilter.isBlank()) countQuery.setParameter("status", status);
        Number total = (Number) countQuery.getSingleResult();
        return new StaffDashboardResponse.WorkItems(items, total.longValue(), page, size);
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<StaffDashboardResponse.RecentAction> loadRecentActions(UUID actorId, LocalDate day) {
        return ((List<Object[]>) entityManager.createNativeQuery("""
             select id::text, batch_code, status, coalesce(updated_at, created_at)
               from allocation_batches
              where deleted_at is null and cast(coalesce(updated_at, created_at) as date) = :day
                and (deposit_received_by = :actorId or settled_by = :actorId)
              order by coalesce(updated_at, created_at) desc limit 10
            """).setParameter("day", java.sql.Date.valueOf(day)).setParameter("actorId", actorId).getResultList()).stream().map(row ->
                new StaffDashboardResponse.RecentAction("VENDOR_BATCH", String.valueOf(row[0]), String.valueOf(row[1]), String.valueOf(row[2]), time(row[3]),
                        new DashboardActionTarget("street-agent-allocation", String.valueOf(row[2]), String.valueOf(row[0])))).toList();
    }

    @Override
    public List<StaffDashboardResponse.InventoryAlert> loadInventoryAlerts(UUID actorId, LocalDate day) {
        return List.of(); // Inventory escalation rules are admin-owned until staff assignments exist.
    }

    private static long n(Object value) { return value instanceof Number number ? number.longValue() : 0; }
    private static LocalDateTime time(Object value) { return value instanceof Timestamp timestamp ? timestamp.toLocalDateTime() : value instanceof LocalDateTime time ? time : null; }
    private DashboardPriority priority(LocalDateTime deadline) { return deadline != null && deadline.isBefore(vietnamClock.now()) ? DashboardPriority.CRITICAL : DashboardPriority.HIGH; }
}
