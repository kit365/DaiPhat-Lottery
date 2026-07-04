package com.daiphat.coreapi.domain.model.enums.auth;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class PermissionConstants {

    // --- RESOURCES ---
    public static final String DASHBOARD = "dashboard";
    public static final String STATISTICS = "stats";
    public static final String USER = "member";
    public static final String ACCOUNT = "admin";
    public static final String ROLE = "role";
    public static final String ARTICLE = "article";
    public static final String TICKET = "ticket";
    public static final String IMPORT_BATCH = "importBatch";
    public static final String SUPPLIER = "supplier";
    public static final String STATION = "station";
    public static final String REGION = "region";
    public static final String PRIZE_STRUCTURE = "prizeStructure";
    public static final String LOTTERY_RESULT = "lotteryResult";
    public static final String PROVIDER = "provider";
    public static final String STREET_AGENT = "streetAgent";
    public static final String ORDER = "order";
    public static final String REFUND = "refund";
    public static final String TICKET_SERVICE = "ticketService";
    public static final String TICKET_SERVICE_ORDER = "ticketServiceOrder";
    public static final String COUPON = "coupon";
    public static final String CHAT = "chat";
    public static final String CALENDAR = "calendar";
    public static final String SETTINGS = "settings";

    // --- ACTIONS ---
    public static final String VIEW = ":view";
    public static final String CREATE = ":create";
    public static final String EDIT = ":edit";
    public static final String DELETE = ":delete";
    public static final String MANAGE = ":manage";
    public static final String SYNC = ":sync";
    public static final String SYSTEM = ":system";
    public static final String ANALYTICS = ":analytics";
    public static final String ECOMMERCE = ":ecommerce";
    public static final String APPROVE = ":approve";
    public static final String REJECT = ":reject";
    public static final String PROCESS = ":process";
}
