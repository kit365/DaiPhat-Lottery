# DaiPhat Lottery Platform — Sequence Diagrams

---

## 1. Đặt hàng & thanh toán online

```mermaid
sequenceDiagram
    actor Customer
    participant FE as CheckoutPage
    participant API as OrderController
    participant OS as OrderService
    participant TS as TransactionService
    participant LT as LotteryTicketService
    participant PG as PayOS Gateway
    participant Redis
    participant DB

    Customer->>FE: Chọn vé, bấm "Đặt hàng"
    FE->>API: POST /orders/online
    API->>OS: createOnlineOrder(request, customerId)
    OS->>LT: reserveForOrder(ticketIds)
    LT->>DB: UPDATE status = RESERVED
    LT-->>OS: ticketSnapshots
    OS->>DB: INSERT order (PENDING_PAYMENT) + transaction (PENDING)
    OS->>Redis: saveCountdown(orderId, TTL=10 phút)
    OS-->>API: OrderModel
    API-->>FE: 200 orderId, totalAmount

    FE->>API: POST /transactions/{orderId}/process (gateway=PAYOS)
    API->>TS: processPayment(orderId, txId, PAYOS)
    TS->>PG: createPaymentLink(amount, orderCode)

    alt Tạo link thành công
        PG-->>TS: checkoutUrl
        TS->>DB: UPDATE transaction (PROCESSING)
        TS-->>FE: checkoutUrl
        FE->>Customer: Redirect sang PayOS

        alt Khách thanh toán thành công
            PG->>API: POST /transactions/callback/payos
            API->>TS: processGatewayCallback(PAYOS, payload)
            TS->>DB: UPDATE transaction (COMPLETED)
            TS->>LT: markSoldForOrder(serialIds)
            TS->>DB: UPDATE order (PAID)
            TS->>Redis: clearCountdown(orderId)
            TS-->>Customer: Thông báo đặt hàng thành công

        else Khách huỷ / thanh toán thất bại
            PG->>API: POST /transactions/callback/payos (failure)
            API->>TS: processGatewayCallback(PAYOS, payload)
            TS->>DB: UPDATE transaction (FAILED), attempts++

            alt Đã thử >= 3 lần
                TS->>LT: releaseReservationForOrder(serialIds)
                TS->>DB: UPDATE order (CANCELLED)
                TS->>Redis: clearCountdown(orderId)
                TS-->>Customer: Thông báo đơn bị huỷ
            else Còn lần thử
                TS-->>FE: Cho phép thử lại
            end
        end

    else Tạo link thất bại
        TS->>DB: UPDATE transaction (FAILED)
        TS-->>FE: 400 Lỗi khởi tạo thanh toán
    end

    note over Redis,DB: Scheduler hết TTL 10 phút
    Redis-->>OS: countdown expired
    OS->>LT: releaseReservationForOrder(serialIds)
    OS->>DB: UPDATE order (CANCELLED)
```

---

## 2. Mua vé tại quầy (offline)

```mermaid
sequenceDiagram
    actor Customer
    actor Operator
    participant FE as CounterOrderPage
    participant API as OrderController
    participant OS as OrderService
    participant LT as LotteryTicketService
    participant DB

    Operator->>FE: Nhập thông tin khách + chọn vé
    FE->>API: POST /orders/direct

    API->>OS: createDirectOrder(request, operatorId)
    OS->>LT: sellOfflineForOrder(ticketIds)
    LT->>DB: UPDATE status = SOLD
    LT-->>OS: ticketSnapshots

    alt Thanh toán tiền mặt
        OS->>DB: INSERT order (PAID) + transaction CASH (COMPLETED)
        OS->>DB: completeDirectOrder(operatorId)
        OS-->>FE: order COMPLETED
        FE->>Customer: In hoá đơn / QR vé

    else Chuyển khoản (cần chờ xác nhận)
        OS->>LT: reserveForOrder(ticketIds)
        LT->>DB: UPDATE status = RESERVED
        OS->>DB: INSERT order (PENDING_PAYMENT) + transaction TRANSFER (PENDING)
        OS-->>FE: order PENDING_PAYMENT

        FE->>API: POST /transactions/{orderId}/collect-cash
        API->>OS: collectDirectOrderCash(orderId, operatorId)
        OS->>DB: UPDATE transaction (COMPLETED)
        OS->>DB: UPDATE order (PAID → COMPLETED)
        OS-->>FE: Xác nhận thanh toán thành công
        FE->>Customer: Hoàn tất giao dịch
    end
```

---

## 3. Nhập kho vé (scan / nhập tay)

```mermaid
sequenceDiagram
    actor Operator
    participant FE as TicketCreatePage
    participant API as LotteryTicketController
    participant LTS as LotteryTicketService
    participant DB

    Operator->>FE: Nhập số vé, đài, ngày mở thưởng, ảnh
    FE->>API: POST /lottery-tickets

    API->>LTS: create(request, operatorId)
    LTS->>DB: Kiểm tra tồn tại (station, numbers, drawDate)

    alt Vé bị trùng
        LTS-->>API: 409 TICKET_ALREADY_EXISTS
        API-->>FE: Lỗi trùng vé
    else Ngày mở thưởng không hợp lệ
        LTS-->>API: 400 INVALID_DRAW_DATE
        API-->>FE: Lỗi ngày không hợp lệ
    else Hợp lệ
        LTS->>DB: INSERT ticket (PENDING_VERIFICATION) + serial
        LTS-->>API: LotteryTicketResponse
        API-->>FE: Nhập kho thành công

        Operator->>API: POST /lottery-tickets/{id}/verify
        API->>LTS: verify(id, verifierId)
        LTS->>DB: UPDATE status = IN_STOCK
        LTS-->>FE: Vé đã xác thực, sẵn sàng bán
    end
```

---

## 4. Bán vé qua người bán dạo (Street Agent)

```mermaid
sequenceDiagram
    actor Agent as StreetAgent
    actor Operator
    participant FE as AdminFE
    participant API as StreetAgentController
    participant SAS as StreetAgentProfileService
    participant OrdAPI as OrderController
    participant OS as OrderService
    participant DB

    note over Operator,FE: Đăng ký hồ sơ đại lý
    Operator->>FE: Tạo hồ sơ đại lý
    FE->>API: POST /street-agent-profiles
    API->>SAS: create(request)
    SAS->>DB: INSERT street_agent_profiles (PENDING)
    SAS-->>FE: Hồ sơ đã tạo

    Operator->>API: PUT /street-agent-profiles/{id} (status=ACTIVE)
    API->>SAS: update(id, ACTIVE)
    SAS->>DB: UPDATE status = ACTIVE
    SAS-->>FE: Đại lý đã kích hoạt

    note over Agent,Operator: Đại lý bán vé (có app)
    Agent->>FE: Chọn vé + tạo đơn cho khách
    FE->>OrdAPI: POST /orders/direct (operatorId = agentId)
    OrdAPI->>OS: createDirectOrder(request, agentId)
    OS->>DB: INSERT order (DIRECT) gắn agentId
    OS-->>FE: Đơn hàng tạo thành công

    note over Agent,Operator: Đại lý bán vé (không app)
    Operator->>FE: Nhập thủ công thay cho đại lý
    FE->>OrdAPI: POST /orders/direct
    OrdAPI->>OS: createDirectOrder(request, operatorId)
    OS-->>FE: Đơn hàng tạo thành công
```

---

## 5. Yêu cầu & xử lý hoàn tiền

```mermaid
sequenceDiagram
    actor Customer
    actor Admin
    participant FE as RefundTab
    participant API as RefundRequestController
    participant RS as RefundRequestService
    participant DB

    Customer->>FE: Chọn đơn đang PREPARING, nhấn "Yêu cầu hoàn tiền"
    FE->>API: POST /refund-requests (orderId, bankAccountId, amount)

    API->>RS: create(userId, request)
    RS->>DB: Kiểm tra order status = PREPARING

    alt Order không đúng trạng thái
        RS-->>API: 400 ORDER_INVALID_STATUS
        API-->>FE: Lỗi trạng thái đơn

    else Tài khoản ngân hàng không khớp
        RS-->>API: 400 BANK_ACCOUNT_MISMATCH
        API-->>FE: Lỗi tài khoản ngân hàng

    else Hợp lệ
        RS->>DB: INSERT refund_request (PENDING)
        RS-->>FE: Yêu cầu hoàn tiền đã gửi
    end

    Admin->>API: PATCH /refund-requests/{id}/approve
    API->>RS: approve(id, adminId)
    RS->>DB: UPDATE status = APPROVED
    RS-->>Admin: Đã duyệt

    Admin->>API: PATCH /refund-requests/{id}/complete-payout
    API->>RS: completePayout(id, adminId)
    RS->>DB: UPDATE status = COMPLETED, paidAt = now
    RS-->>Admin: Hoàn tất chi trả

    note over Customer: Trường hợp Admin từ chối
    Admin->>API: PATCH /refund-requests/{id}/reject
    API->>RS: reject(id, adminId, reason)
    RS->>DB: UPDATE status = REJECTED
    RS-->>Customer: Thông báo từ chối + lý do

    note over Customer: Trường hợp Customer huỷ
    Customer->>API: PATCH /refund-requests/{id}/cancel
    API->>RS: cancel(id, userId)
    RS->>DB: UPDATE status = CANCELLED (chỉ khi PENDING)
    RS-->>FE: Đã huỷ yêu cầu
```

---

## 6. Đồng bộ kết quả xổ số (Tự động)

```mermaid
sequenceDiagram
    participant SCH as LotteryResultSyncScheduler
    participant LRS as LotteryResultService
    participant LSS as LotteryStationService
    participant SRC as MinhNgocSourceStrategy
    participant DB

    note over SCH: Mỗi phút — refreshLivePollingTask()
    SCH->>LSS: getScheduleModelsByDrawDate(today)
    LSS-->>SCH: stations[]

    alt Có đài trong live window (drawTime → drawTime+30 phút)
        SCH->>SCH: startLivePolling (interval=10s)

        loop Mỗi 10 giây — runLivePollingCycle()
            SCH->>LSS: getScheduleModelsByDrawDate(today)
            loop Từng đài đang trong live window
                SCH->>LRS: ensureResultForBoard(stationId, today)
                LRS->>DB: Upsert lottery_result (PENDING)
                SCH->>LRS: syncResult(resultId, MINH_NGOC)
                LRS->>SRC: fetchResult(stationId, drawDate)
                SRC->>SRC: HTTP GET minhngoc.com.vn

                alt Lấy dữ liệu thành công
                    SRC-->>LRS: LotteryResultSourceData
                    LRS->>DB: UPDATE result details + status = COMPLETED
                else Nguồn lỗi / chưa có kết quả
                    SRC-->>LRS: error / empty
                    LRS->>DB: UPDATE status = PENDING (giữ nguyên để retry)
                end
            end

            alt Hết live window
                SCH->>SCH: stopLivePolling()
            end
        end

    else Không có đài nào trong live window
        SCH->>SCH: stopLivePolling() nếu đang chạy
    end

    note over SCH: Mỗi 10 giây — syncHistoricalBacklog()
    SCH->>LRS: syncHistoricalBacklog(batchSize=20)
    LRS->>DB: Lấy các result PENDING/MISSING cũ
    loop Từng result trong backlog
        LRS->>SRC: fetchResult(stationId, drawDate)
        alt Thành công
            SRC-->>LRS: data
            LRS->>DB: UPDATE status = COMPLETED
        else Lỗi
            LRS->>DB: Giữ PENDING, retry lần sau
        end
    end
```

---

## 7. Đối soát & Trả thưởng (Prize Payout)

```mermaid
sequenceDiagram
    actor Customer
    actor Admin
    participant FE as MyTicketsPage
    participant CheckAPI as LotteryResultController
    participant RLDS as LotteryResultDetailService
    participant PTQ as PurchasedTicketQueryService
    participant TPM as TicketPrizeMatcher
    participant RefAPI as RefundRequestController
    participant RS as RefundRequestService
    participant DB

    note over Customer,FE: Bước 1 — Đối soát (Dò số trúng thưởng)

    alt Dò nhanh theo số vé (public)
        Customer->>FE: Nhập stationId + drawDate + ticketNumber
        FE->>CheckAPI: GET /lottery-results/check
        CheckAPI->>RLDS: checkWinning(stationId, drawDate, ticketNumber)
        RLDS->>DB: findByStationIdAndDrawDate(stationId, drawDate)

        alt Kết quả chưa có
            DB-->>RLDS: empty
            RLDS-->>FE: resultAvailable=false, canCheck=false
            FE->>Customer: "Kết quả chưa về, vui lòng thử lại sau"

        else Kết quả đã COMPLETED
            DB-->>RLDS: LotteryResultModel + details[]
            RLDS->>TPM: findFirstMatch(ticketNumber, resultDetails)
            TPM-->>RLDS: MatchResult (prizeCode, prizeDisplayName, amount)
            RLDS-->>FE: LotteryWinningCheckResponse (winning, totalWinningAmount, matchedPrizes)
            FE->>Customer: Hiển thị kết quả trúng/không trúng
        end

    else Xem danh sách vé đã mua + kết quả (authenticated)
        Customer->>FE: Mở tab "Vé của tôi"
        FE->>CheckAPI: GET /orders/my-tickets?status=WON
        CheckAPI->>PTQ: getMyTickets(userId, ...)
        PTQ->>DB: findPurchasedTickets(spec, pageable)
        loop Từng vé đã mua
            PTQ->>DB: findByStationIdAndDrawDate(stationId, drawDate)
            PTQ->>DB: findByLotteryResultId(resultId)
            PTQ->>TPM: findFirstMatch(numbers, resultDetails)
            TPM-->>PTQ: MatchResult hoặc empty
        end
        PTQ-->>FE: PurchasedTicketResponse[] (WON / LOST / PENDING_DRAW)
        FE->>Customer: Hiển thị danh sách + badge trúng thưởng
    end

    note over Customer,Admin: Bước 2 — Yêu cầu trả thưởng (Prize Payout Request)

    Customer->>FE: Chọn vé WON → "Yêu cầu nhận thưởng"
    FE->>RefAPI: POST /refund-requests
    note right of FE: refundType=FULL_ORDER, orderId, bankAccountId, refundAmount=prizeAmount
    RefAPI->>RS: create(userId, request)
    RS->>DB: findById(orderId) — kiểm tra order status = PREPARING

    alt Order không đủ điều kiện
        RS-->>FE: 400 ORDER_INVALID_STATUS
        FE->>Customer: Không thể yêu cầu trả thưởng cho đơn này
    else Tài khoản ngân hàng không khớp
        RS-->>FE: 400 BANK_ACCOUNT_MISMATCH
        FE->>Customer: Kiểm tra lại tài khoản ngân hàng
    else Số tiền không hợp lệ
        RS-->>FE: 400 REFUND_REQUEST_INVALID_AMOUNT
        FE->>Customer: Số tiền thưởng không khớp
    else Hợp lệ
        RS->>DB: INSERT refund_request (PENDING, requestRole=CUSTOMER)
        RS-->>FE: Yêu cầu đã gửi thành công
        FE->>Customer: "Yêu cầu trả thưởng đang chờ duyệt"
    end

    note over Admin: Bước 3 — Admin duyệt & chi trả

    Admin->>RefAPI: GET /refund-requests (admin view, status=PENDING)
    RefAPI-->>Admin: Danh sách yêu cầu chờ duyệt

    alt Admin duyệt
        Admin->>RefAPI: PATCH /refund-requests/{id}/approve
        RefAPI->>RS: approve(id, adminId)
        RS->>DB: UPDATE status = APPROVED
        RS-->>Admin: Đã duyệt, chờ chuyển khoản

        note over Admin: Thực hiện chuyển khoản ngân hàng

        alt Chuyển khoản thành công
            Admin->>RefAPI: PATCH /refund-requests/{id}/complete-payout
            RefAPI->>RS: completePayout(id, adminId)
            RS->>DB: UPDATE status = COMPLETED, paidAt = now
            RS-->>Admin: Hoàn tất trả thưởng
            RS-->>Customer: Thông báo đã nhận tiền thưởng

        else Chuyển khoản thất bại (lần 1)
            Admin->>Admin: Kiểm tra thông tin tài khoản ngân hàng
            Admin->>RefAPI: PATCH /refund-requests/{id}/complete-payout (retry)
            note right of Admin: Retry thủ công — hệ thống chưa tự động retry
            RefAPI->>RS: completePayout(id, adminId)
            RS->>DB: UPDATE status = COMPLETED
            RS-->>Customer: Thông báo đã nhận tiền thưởng

        else Chuyển khoản thất bại nhiều lần
            Admin->>RefAPI: PATCH /refund-requests/{id}/reject
            RefAPI->>RS: reject(id, adminId, reason="Tài khoản ngân hàng không hợp lệ")
            RS->>DB: UPDATE status = REJECTED
            RS-->>Customer: Thông báo từ chối + lý do
            note over Customer: Customer cập nhật tài khoản ngân hàng và tạo yêu cầu mới
        end

    else Admin từ chối
        Admin->>RefAPI: PATCH /refund-requests/{id}/reject (reason)
        RefAPI->>RS: reject(id, adminId, reason)
        RS->>DB: UPDATE status = REJECTED
        RS-->>Customer: Thông báo từ chối + lý do
    end
```

---

## Trạng thái chính của các entity

| Entity | Trạng thái |
|---|---|
| LotteryTicket | `IN_STOCK` → `RESERVED` → `SOLD` / `EXPIRED` |
| Order | `PENDING_PAYMENT` → `PAID` → `PREPARING` → `PENDING_PICKUP` → `COMPLETED` / `CANCELLED` |
| Transaction | `PENDING` → `COMPLETED` / `FAILED` / `CANCELLED` |
| RefundRequest | `PENDING` → `APPROVED` → `COMPLETED` / `REJECTED` / `CANCELLED` |
| LotteryResult | `PENDING` → `COMPLETED` |
| StreetAgentProfile | `PENDING` → `ACTIVE` / `INACTIVE` |
