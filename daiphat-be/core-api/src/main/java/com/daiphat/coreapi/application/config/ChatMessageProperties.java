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

        private String stationNearestDrawDate;

        private String regionStationCatalog;

        private String stationBundleIntro;

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

        public String stationNearestDrawDate(String stationName, String weekdays, String date, String time) {
            if (stationNearestDrawDate == null || stationNearestDrawDate.isBlank()) {
                return "Dạ, đài " + safe(stationName) + " quay vào " + safe(weekdays)
                        + ". Ngày quay gần nhất với hôm nay là " + safe(date) + " (lúc " + safe(time) + ") ạ.";
            }
            return stationNearestDrawDate
                    .replace("{station}", safe(stationName))
                    .replace("{weekdays}", safe(weekdays))
                    .replace("{date}", safe(date))
                    .replace("{time}", safe(time));
        }

        public String regionStationCatalog(String regionLabel, int count, String stationNames) {
            if (regionStationCatalog == null || regionStationCatalog.isBlank()) {
                return "Dạ, hiện " + safe(regionLabel) + " có tổng cộng " + count + " đài xổ số, gồm:\n"
                        + safe(stationNames)
                        + "\nBạn cần xem lịch quay hay kết quả đài nào thì nhắn mình hỗ trợ thêm nhé ạ.";
            }
            return regionStationCatalog
                    .replace("{region}", safe(regionLabel))
                    .replace("{count}", String.valueOf(count))
                    .replace("{stations}", safe(stationNames));
        }

        public String stationBundleIntro(String stationName, String dateLabel) {
            if (stationBundleIntro == null || stationBundleIntro.isBlank()) {
                return "Dạ, dưới đây là lịch quay và kết quả gần nhất của đài "
                        + safe(stationName) + " (ngày " + safe(dateLabel) + ") ạ:";
            }
            return stationBundleIntro
                    .replace("{station}", safe(stationName))
                    .replace("{date}", safe(dateLabel));
        }

        private static String safe(String value) {
            return value != null ? value : "";
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
