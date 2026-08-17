package com.daiphat.coreapi.infrastructure.adapter.out.dashboard.persistence;

import com.daiphat.coreapi.application.dto.response.dashboard.*;
import com.daiphat.coreapi.application.port.out.dashboard.AdminDashboardQueryPort;
import com.daiphat.coreapi.shared.time.VietnamClock;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Repository
@Transactional(readOnly = true)
public class PostgresAdminDashboardQueryAdapter implements AdminDashboardQueryPort {
    @PersistenceContext private EntityManager entityManager;
    private final VietnamClock vietnamClock;

    public PostgresAdminDashboardQueryAdapter(VietnamClock vietnamClock) { this.vietnamClock = vietnamClock; }

    @Override
    public AdminDashboardResponse.Kpis loadKpis(LocalDate day) {
        // Vendor sales only become dashboard revenue after the allocation is settled.  A
        // draft/handed-over batch is still inventory risk, not a completed sale.
        Object[] row = (Object[]) entityManager.createNativeQuery("""
                select coalesce((select sum(od.quantity)
                                   from orders o
                                   join order_details od on od.order_id = o.id
                                  where cast(o.created_at as date) = :day
                                    and o.status in ('PAID','PREPARING','PENDING_PICKUP','COMPLETED')), 0)
                       + coalesce((select sum(ab.sold_quantity)
                                     from allocation_batches ab
                                    where ab.deleted_at is null
                                      and ab.business_date = :day
                                      and ab.status in ('SETTLED','LATE_SETTLED')), 0),
                       coalesce((select sum(o.total_amount)
                                   from orders o
                                  where cast(o.created_at as date) = :day
                                    and o.status in ('PAID','PREPARING','PENDING_PICKUP','COMPLETED')), 0)
                       + coalesce((select sum(coalesce(nullif(ab.gross_cash_remitted, 0),
                                                       coalesce(ab.face_value_snapshot, 0) * coalesce(ab.sold_quantity, 0)))
                                     from allocation_batches ab
                                    where ab.deleted_at is null
                                      and ab.business_date = :day
                                      and ab.status in ('SETTLED','LATE_SETTLED')), 0),
                       coalesce((select sum(abs(coalesce(ss.settlement_difference_amount, 0)))
                                   from supplier_settlements ss
                                  where ss.deleted_at is null
                                    and ss.reconciliation_phase <> 'COMPLETED'
                                    and (ss.period_from is null or ss.period_from <= :day)
                                    and (ss.period_to is null or ss.period_to >= :day)), 0),
                       (select count(*) from allocation_batches ab where ab.deleted_at is null
                           and ab.business_date = :day and ab.status in ('DRAFT','CONFIRMED','RETURN_OPEN'))
                """).setParameter("day", Date.valueOf(day)).getSingleResult();
        return new AdminDashboardResponse.Kpis(number(row[0]).longValue(), money(row[1]), money(row[2]), number(row[3]).longValue());
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<AdminDashboardResponse.OrderStatusCount> loadOrderStatusCounts(LocalDate day) {
        return ((List<Object[]>) entityManager.createNativeQuery("""
                select o.status,
                       case o.status
                           when 'PENDING_PAYMENT' then 'Chờ thanh toán'
                           when 'PAID' then 'Đã thanh toán'
                           when 'PREPARING' then 'Đang chuẩn bị vé'
                           when 'PENDING_PICKUP' then 'Chờ khách lấy vé'
                           when 'COMPLETED' then 'Hoàn tất'
                           when 'CANCELLED' then 'Đã hủy'
                           else o.status
                       end,
                       count(*)
                  from orders o
                 where cast(o.created_at as date) = :day
                 group by o.status
                 order by case o.status
                           when 'PENDING_PAYMENT' then 1
                           when 'PAID' then 2
                           when 'PREPARING' then 3
                           when 'PENDING_PICKUP' then 4
                           when 'COMPLETED' then 5
                           when 'CANCELLED' then 6
                           else 99
                          end
                """).setParameter("day", Date.valueOf(day)).getResultList()).stream()
                .map(row -> new AdminDashboardResponse.OrderStatusCount(
                        String.valueOf(row[0]), String.valueOf(row[1]), number(row[2]).longValue()))
                .toList();
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<AdminDashboardResponse.SerialStatusCount> loadSerialStatusCounts(LocalDate day) {
        return ((List<Object[]>) entityManager.createNativeQuery("""
                select lts.status,
                       case lts.status
                           when 'IN_STOCK' then 'Trong kho'
                           when 'RESERVED' then 'Đang giữ chỗ'
                           when 'SOLD' then 'Đã bán'
                           when 'WITH_STREET_AGENT' then 'Người bán vé số giữ'
                           when 'EXPIRED' then 'Hết hạn'
                           else lts.status
                       end,
                       count(*)
                  from lottery_ticket_serials lts
                  join lottery_tickets lt on lt.id = lts.ticket_id
                 where lts.deleted_at is null
                   and lt.deleted_at is null
                   and lt.draw_date = :day
                 group by lts.status
                 order by case lts.status
                           when 'IN_STOCK' then 1
                           when 'RESERVED' then 2
                           when 'SOLD' then 3
                           when 'SOLD' then 4
                           when 'WITH_STREET_AGENT' then 5
                           when 'EXPIRED' then 6
                           else 99
                          end
                """).setParameter("day", Date.valueOf(day)).getResultList()).stream()
                .map(row -> new AdminDashboardResponse.SerialStatusCount(
                        String.valueOf(row[0]), String.valueOf(row[1]), number(row[2]).longValue()))
                .toList();
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<AdminDashboardResponse.TopStationSales> loadTopStationSales(LocalDate fromDate, LocalDate toDate, int limit) {
        return ((List<Object[]>) entityManager.createNativeQuery("""
                select s.id, s.name, count(*)
                  from lottery_ticket_serials lts
                  join lottery_tickets lt on lt.id = lts.ticket_id
                  join lottery_stations s on s.id = lt.station_id
                 where lts.deleted_at is null
                   and lt.deleted_at is null
                   and s.deleted_at is null
                   and lt.draw_date between :fromDate and :toDate
                   and lts.status = 'SOLD'
                 group by s.id, s.name
                 order by count(*) desc, s.name asc
                 limit :limit
                """).setParameter("fromDate", Date.valueOf(fromDate)).setParameter("toDate", Date.valueOf(toDate)).setParameter("limit", limit).getResultList()).stream()
                .map(row -> new AdminDashboardResponse.TopStationSales(
                        number(row[0]).longValue(), String.valueOf(row[1]), number(row[2]).longValue()))
                .toList();
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<AdminDashboardResponse.RecentOrder> loadRecentOrders(LocalDate day, int limit) {
        return ((List<Object[]>) entityManager.createNativeQuery("""
                select o.id::text, o.order_code, coalesce(nullif(trim(o.name), ''), 'Khách lẻ'),
                       o.total_amount, o.status, o.created_at
                  from orders o
                 where cast(o.created_at as date) = :day
                 order by o.created_at desc nulls last
                 limit :limit
                """).setParameter("day", Date.valueOf(day)).setParameter("limit", limit).getResultList()).stream()
                .map(row -> new AdminDashboardResponse.RecentOrder(
                        String.valueOf(row[0]), String.valueOf(row[1]), String.valueOf(row[2]),
                        money(row[3]), orderStatusLabel(String.valueOf(row[4])), timestamp(row[5])))
                .toList();
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<AdminDashboardResponse.DailyRevenuePoint> loadDailyRevenue(LocalDate day) {
        LocalDate fromDay = day.minusDays(13);
        return ((List<Object[]>) entityManager.createNativeQuery("""
                with days as (
                    select generate_series(cast(:fromDay as date), cast(:toDay as date), interval '1 day')::date as day
                ), completed_orders as (
                    select cast(coalesce(o.actual_picked_up_at, o.updated_at, o.created_at) as date) as day,
                           coalesce(sum(o.total_amount), 0) as amount
                      from orders o
                     where o.status = 'COMPLETED'
                       and cast(coalesce(o.actual_picked_up_at, o.updated_at, o.created_at) as date)
                           between cast(:fromDay as date) and cast(:toDay as date)
                     group by cast(coalesce(o.actual_picked_up_at, o.updated_at, o.created_at) as date)
                ), settled_vendor_sales as (
                    select ab.business_date as day,
                           coalesce(sum(coalesce(
                               nullif(ab.gross_cash_remitted, 0),
                               coalesce(ab.face_value_snapshot, 0) * coalesce(ab.sold_quantity, 0)
                           )), 0) as amount
                      from allocation_batches ab
                     where ab.deleted_at is null
                       and ab.status in ('SETTLED', 'LATE_SETTLED')
                       and ab.business_date between cast(:fromDay as date) and cast(:toDay as date)
                     group by ab.business_date
                ), daily_revenue as (
                    select day, amount from completed_orders
                    union all
                    select day, amount from settled_vendor_sales
                ), totals as (
                    select day, sum(amount) as amount
                      from daily_revenue
                     group by day
                )
                select d.day, coalesce(t.amount, 0)
                  from days d
                  left join totals t on t.day = d.day
                 order by d.day
                """)
                .setParameter("fromDay", Date.valueOf(fromDay))
                .setParameter("toDay", Date.valueOf(day))
                .getResultList()).stream()
                .map(row -> new AdminDashboardResponse.DailyRevenuePoint(localDate(row[0]), money(row[1])))
                .toList();
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<AdminDashboardResponse.ActionItem> loadActionItems(LocalDate day) {
        return ((List<Object[]>) entityManager.createNativeQuery("""
                select ab.status, count(*), min(coalesce(ab.effective_handover_deadline_at, ab.reservation_expires_at)),
                       min(ab.id)::text
                  from allocation_batches ab
                 where ab.deleted_at is null and ab.business_date = :day
                   and ab.status in ('DRAFT','CONFIRMED','RETURN_OPEN')
                 group by ab.status
                 order by min(coalesce(ab.effective_handover_deadline_at, ab.reservation_expires_at)) nulls last
                """).setParameter("day", Date.valueOf(day)).getResultList()).stream().map(row -> new AdminDashboardResponse.ActionItem(
                "VENDOR_" + row[0], priority(timestamp(row[2])), number(row[1]).longValue(), timestamp(row[2]),
                new DashboardActionTarget("street-agent-allocation", String.valueOf(row[0]), String.valueOf(row[3])))).toList();
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<AdminDashboardResponse.InventoryRisk> loadInventoryRisks(LocalDate day) {
        // Inventory is serial-level: one ticket number can have many physical serials.
        // Counting lottery_tickets here would under-report (or hide) the actual stock.
        return ((List<Object[]>) entityManager.createNativeQuery("""
                select s.id, s.name, lt.draw_date,
                       count(distinct case when lts.status = 'IN_STOCK' then lts.id end),
                       count(distinct case when lts.status = 'WITH_STREET_AGENT' then lts.id end),
                       case when count(distinct case when lts.status = 'IN_STOCK' then lts.id end) = 0
                            then 'NO_SELLABLE_STOCK' else 'LOW' end
                  from lottery_stations s
                  join lottery_tickets lt on lt.station_id = s.id
                                          and lt.deleted_at is null
                                          and lt.is_active = true
                  left join lottery_ticket_serials lts on lts.ticket_id = lt.id and lts.deleted_at is null
                 where lt.draw_date = :day
                   and s.deleted_at is null
                   and s.is_active = true
                 group by s.id, s.name, lt.draw_date
                 order by s.name
                """).setParameter("day", Date.valueOf(day)).getResultList()).stream().map(row ->
                new AdminDashboardResponse.InventoryRisk(number(row[0]).longValue(), String.valueOf(row[1]), localDate(row[2]),
                        number(row[3]).longValue(), number(row[4]).longValue(), String.valueOf(row[5]))).toList();
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<AdminDashboardResponse.VendorRisk> loadVendorRisks(LocalDate day) {
        // Only serials physically handed to the vendor are shown as vendor-held.  DRAFT_RESERVED
        // is still in our warehouse and therefore belongs to the allocation/action queue instead.
        return ((List<Object[]>) entityManager.createNativeQuery("""
                select p.id, concat(p.last_name, ' ', p.first_name), ab.batch_code,
                       count(distinct ats.lottery_ticket_serial_id),
                       coalesce(ab.effective_handover_deadline_at, ab.reservation_expires_at), ab.status
                  from allocation_batches ab
                  join street_agent_profiles p on p.id = ab.street_agent_profile_id
                  left join agent_ticket_stocks ats
                   on ats.allocation_batch_id = ab.id
                   and ats.deleted_at is null
                   and ats.status in ('HANDED_OVER','RETURN_PENDING_INSPECTION','RETURN_REJECTED')
                 where ab.deleted_at is null and p.deleted_at is null and ab.business_date = :day
                   and ab.status in ('DRAFT','CONFIRMED','RETURN_OPEN')
                 group by p.id, p.last_name, p.first_name, ab.id, ab.batch_code,
                          ab.effective_handover_deadline_at, ab.reservation_expires_at, ab.status
                 order by coalesce(ab.effective_handover_deadline_at, ab.reservation_expires_at) nulls last
                """).setParameter("day", Date.valueOf(day)).getResultList()).stream().map(row -> new AdminDashboardResponse.VendorRisk(
                number(row[0]).longValue(), String.valueOf(row[1]), String.valueOf(row[2]), number(row[3]).longValue(),
                timestamp(row[4]), String.valueOf(row[5]))).toList();
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<AdminDashboardResponse.Reconciliation> loadReconciliations(LocalDate day, int limit) {
        return ((List<Object[]>) entityManager.createNativeQuery("""
                select 'SUPPLIER', coalesce(ls.name, ls.code), ss.id, ss.period_from, ss.period_to,
                       coalesce(ss.settlement_difference_amount, 0), ss.reconciliation_phase
                  from supplier_settlements ss left join lottery_suppliers ls on ls.id = ss.lottery_supplier_id
                 where ss.deleted_at is null
                   and ss.reconciliation_phase <> 'COMPLETED'
                   and coalesce(ss.settlement_difference_amount, 0) <> 0
                   and (ss.period_from is null or ss.period_from <= :day)
                   and (ss.period_to is null or ss.period_to >= :day)
                 order by ss.updated_at desc nulls last
                 limit :limit
                """).setParameter("day", Date.valueOf(day)).setParameter("limit", limit).getResultList()).stream().map(row -> new AdminDashboardResponse.Reconciliation(
                String.valueOf(row[0]), String.valueOf(row[1]), number(row[2]).longValue(), localDate(row[3]), localDate(row[4]),
                money(row[5]), String.valueOf(row[6]))).toList();
    }

    private static Number number(Object value) { return value instanceof Number n ? n : BigDecimal.ZERO; }
    private static BigDecimal money(Object value) { return value instanceof BigDecimal b ? b : new BigDecimal(number(value).toString()); }
    private static LocalDateTime timestamp(Object value) { return value instanceof Timestamp t ? t.toLocalDateTime() : value instanceof LocalDateTime t ? t : null; }
    private static LocalDate localDate(Object value) { return value instanceof Date d ? d.toLocalDate() : value instanceof LocalDate d ? d : null; }
    private static String orderStatusLabel(String status) {
        return switch (status) {
            case "PENDING_PAYMENT" -> "Chờ thanh toán";
            case "PAID" -> "Đã thanh toán";
            case "PREPARING" -> "Đang chuẩn bị vé";
            case "PENDING_PICKUP" -> "Chờ khách lấy vé";
            case "COMPLETED" -> "Hoàn tất";
            case "CANCELLED" -> "Đã hủy";
            default -> status;
        };
    }
    private DashboardPriority priority(LocalDateTime deadline) { return deadline != null && deadline.isBefore(vietnamClock.now()) ? DashboardPriority.CRITICAL : DashboardPriority.HIGH; }
}
