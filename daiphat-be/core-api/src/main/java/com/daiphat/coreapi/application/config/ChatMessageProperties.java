package com.daiphat.coreapi.application.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "daiphat.chat.messages")
public class ChatMessageProperties {

    private String handoff;
    private String unavailable;
    private String disabled;
    private String noOperatorOnline;
    private String notUnderstood;
    private ScheduleMessages schedule = new ScheduleMessages();
    private AccountMessages account = new AccountMessages();

    @Getter
    @Setter
    public static class ScheduleMessages {
        private String askLocation;
        private String askDate;
        private String askDateMode;
        private String askResultDateMode;
        private String askResultStation;
        private String askResultNoStation;
        private String askDateYear;
        private String askConfirmStation;
        private String askRegionChoice;
        private String askStationInRegion;
        private String askGoal;
        private String stationReady;
        private String regionNotFound;
        private String dateNotFound;
        private String stationNotFound;

        public String askDateYear(String shortDateLabel) {
            if (askDateYear == null) {
                return null;
            }
            String safeDate = shortDateLabel != null ? shortDateLabel : "";
            return askDateYear.replace("{date}", safeDate);
        }

        public String askResultStation(String dateLabel) {
            if (askResultStation == null) {
                return "Chọn đài muốn xem kết quả ngày " + (dateLabel != null ? dateLabel : "") + ":";
            }
            return askResultStation.replace("{date}", dateLabel != null ? dateLabel : "");
        }

        public String askResultNoStation(String dateLabel) {
            if (askResultNoStation == null) {
                return "Ngày " + (dateLabel != null ? dateLabel : "") + " không có đài nào quay. Bạn chọn ngày khác nhé.";
            }
            return askResultNoStation.replace("{date}", dateLabel != null ? dateLabel : "");
        }

        public String askRegionChoice(String regionLabel) {
            return replaceRegion(askRegionChoice, regionLabel);
        }

        public String askStationInRegion(String regionLabel) {
            return replaceRegion(askStationInRegion, regionLabel != null ? regionLabel : "miền này");
        }

        public String stationReady(String stationName) {
            if (stationReady == null) {
                return "Bạn đã chọn đài " + (stationName != null ? stationName : "") + ".";
            }
            return stationReady.replace("{station}", stationName != null ? stationName : "này");
        }

        public String askConfirmStation(List<String> stationNames) {
            if (stationNames == null || stationNames.isEmpty()) {
                return askConfirmStation;
            }
            return askConfirmStation + " (" + String.join(", ", stationNames) + ")";
        }

        private String replaceRegion(String template, String regionLabel) {
            if (template == null) {
                return null;
            }
            return template.replace("{region}", regionLabel != null ? regionLabel : "");
        }
    }

    @Getter
    @Setter
    public static class AccountMessages {
        private String noOrders;
        private String latestOrderPrefix;
        private String latestOrderStatusSeparator;
        private String latestOrderCreatedAtPrefix;
        private String latestOrderCreatedAtSuffix;
        private String latestOrderFooter;
        private String lookupFailed;
    }
}
