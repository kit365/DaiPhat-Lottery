package com.daiphat.coreapi.application.constant.chat.schedule;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.util.List;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class ChatScheduleMessages {

    public static final String ASK_LOCATION =
            "Bạn muốn xem lịch đài nào hoặc miền nào ạ?";
    public static final String ASK_DATE =
            "Bạn muốn xem lịch ngày/thứ nào? (vd: hôm nay, thứ 7)";
    public static final String ASK_DATE_MODE =
            "Bạn muốn xem lịch ngày nào?";
    public static final String ASK_CONFIRM_STATION =
            "Mình tìm thấy vài đài gần giống. Bạn chọn đài nào ạ?";
    public static final String ASK_REGION_CHOICE =
            "Bạn muốn xem tất cả đài miền {region} hay chọn đài cụ thể?";
    public static final String ASK_STATION_IN_REGION =
            "Bạn muốn xem đài nào ở {region} ạ? (vd: Bến Tre, TP.HCM)";
    public static final String REGION_NOT_FOUND =
            "Mình chưa nhận ra khu vực này. Bạn có thể chọn miền hoặc gõ tên đài cụ thể ạ?";
    public static final String DATE_NOT_FOUND =
            "Mình chưa nhận ra ngày/thứ này. Bạn thử gõ hôm nay, ngày mai hoặc thứ trong tuần nhé.";
    public static final String STATION_NOT_FOUND =
            "Mình chưa tìm thấy đài này. Bạn thử gõ lại tên đài hoặc chọn miền ạ?";

    public static String askRegionChoice(String regionLabel) {
        return ASK_REGION_CHOICE.replace("{region}", regionLabel != null ? regionLabel : "");
    }

    public static String askStationInRegion(String regionLabel) {
        return ASK_STATION_IN_REGION.replace("{region}", regionLabel != null ? regionLabel : "miền này");
    }

    public static String askConfirmStation(List<String> stationNames) {
        if (stationNames == null || stationNames.isEmpty()) {
            return ASK_CONFIRM_STATION;
        }
        return ASK_CONFIRM_STATION + " (" + String.join(", ", stationNames) + ")";
    }
}
