package com.daiphat.coreapi.domain.model.enums.notification;

/**
 * In-app notification visibility scope. Customer inbox only surfaces CUSTOMER rows;
 * admin/staff inbox surfaces STAFF rows.
 */
public enum NotificationAudience {
    CUSTOMER,
    STAFF
}
