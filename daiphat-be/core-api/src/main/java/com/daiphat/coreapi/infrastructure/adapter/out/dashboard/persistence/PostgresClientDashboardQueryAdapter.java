package com.daiphat.coreapi.infrastructure.adapter.out.dashboard.persistence;

import com.daiphat.coreapi.application.dto.response.dashboard.ClientDashboardResponse;
import com.daiphat.coreapi.application.dto.response.dashboard.DashboardActionTarget;
import com.daiphat.coreapi.application.port.out.dashboard.ClientDashboardQueryPort;
import com.daiphat.coreapi.shared.time.VietnamClock;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
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
public class PostgresClientDashboardQueryAdapter implements ClientDashboardQueryPort {
    @PersistenceContext private EntityManager entityManager;
    private final VietnamClock vietnamClock;

    public PostgresClientDashboardQueryAdapter(VietnamClock vietnamClock) { this.vietnamClock = vietnamClock; }

    @Override
    public ClientDashboardResponse.Wallet loadWallet(UUID userId) {
        return new ClientDashboardResponse.Wallet(null, "UNAVAILABLE");
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<ClientDashboardResponse.RecentOrder> loadRecentOrders(UUID userId) {
        return ((List<Object[]>) entityManager.createNativeQuery("""
             select id::text, order_code, total_amount, status, created_at
               from orders
              where user_id = :userId
              order by created_at desc limit 3
            """).setParameter("userId", userId).getResultList()).stream().map(row -> new ClientDashboardResponse.RecentOrder(
                String.valueOf(row[0]), String.valueOf(row[1]), amount(row[2]), String.valueOf(row[3]), time(row[4]))).toList();
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<ClientDashboardResponse.TicketAlert> loadTicketAlerts(UUID userId) {
        return ((List<Object[]>) entityManager.createNativeQuery("""
             select distinct lts.serial_number, lts.draw_date, lts.payout_state
               from orders o join order_details od on od.order_id = o.id
               join lottery_ticket_serials lts on lts.id = coalesce(od.replaced_by_ticket_serial_id, od.lottery_ticket_serial_id)
              where o.user_id = :userId and o.status not in ('CANCELLED')
                and lts.deleted_at is null
                and (lts.draw_date >= :businessDate or lts.payout_state = 'PAYOUT_PENDING')
              order by case when lts.payout_state = 'PAYOUT_PENDING' then 0 else 1 end, lts.draw_date asc limit 3
            """).setParameter("userId", userId).setParameter("businessDate", java.sql.Date.valueOf(vietnamClock.today())).getResultList()).stream().map(row -> {
            LocalDate drawDate = row[1] instanceof java.sql.Date date ? date.toLocalDate() : (LocalDate) row[1];
            String type = "PAYOUT_PENDING".equals(String.valueOf(row[2])) ? "PRIZE_READY" : "DRAW_UPCOMING";
            return new ClientDashboardResponse.TicketAlert(type, String.valueOf(row[0]), drawDate,
                    type.equals("PRIZE_READY") ? "Vé có kết quả cần nhận thưởng." : "Vé sắp đến ngày xổ.",
                    new DashboardActionTarget("my-tickets", type, String.valueOf(row[0])));
        }).toList();
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<ClientDashboardResponse.OpenRequest> loadOpenRequests(UUID userId) {
        return ((List<Object[]>) entityManager.createNativeQuery("""
             select 'REFUND', id::text, status, created_at from refund_requests
              where requested_by = :userId and status not in ('COMPLETED','REJECTED','CANCELLED')
             union all
             select 'PRIZE_PAYOUT', id::text, status, created_at from prize_payout_requests
              where customer_id = :userId and status not in ('COMPLETED','REJECTED','CANCELLED')
             order by 4 desc limit 6
            """).setParameter("userId", userId).getResultList()).stream().map(row -> new ClientDashboardResponse.OpenRequest(
                String.valueOf(row[0]), String.valueOf(row[1]), String.valueOf(row[2]), time(row[3]),
                new DashboardActionTarget("REFUND".equals(row[0]) ? "refund" : "prize-payout", String.valueOf(row[2]), String.valueOf(row[1])))).toList();
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<ClientDashboardResponse.RecentNotification> loadRecentNotifications(UUID userId) {
        return ((List<Object[]>) entityManager.createNativeQuery("""
             select id, title, content, is_read, created_at, reference_type, reference_id
               from notifications where user_id = :userId and deleted_at is null
              order by created_at desc limit 3
            """).setParameter("userId", userId).getResultList()).stream().map(row -> new ClientDashboardResponse.RecentNotification(
                ((Number) row[0]).longValue(), String.valueOf(row[1]), String.valueOf(row[2]), Boolean.TRUE.equals(row[3]), time(row[4]),
                new DashboardActionTarget("notification", row[5] == null ? null : String.valueOf(row[5]), row[6] == null ? null : String.valueOf(row[6])))).toList();
    }

    private static BigDecimal amount(Object value) { return value instanceof BigDecimal amount ? amount : BigDecimal.ZERO; }
    private static LocalDateTime time(Object value) { return value instanceof Timestamp timestamp ? timestamp.toLocalDateTime() : value instanceof LocalDateTime time ? time : null; }
}
