package com.daiphat.coreapi.application.constant.chat.schedule;

/**
 * Test-only shim aligning with chat-messages.yml schedule section.
 */
public final class ChatScheduleMessages {

    public static final String ASK_LOCATION = "Bạn muốn xem lịch đài nào hoặc miền nào ạ?";
    public static final String ASK_DATE = "Bạn muốn xem lịch ngày/thứ nào? (vd: hôm nay, thứ 7)";
    public static final String ASK_DATE_MODE = "Bạn muốn xem lịch ngày nào?";
    public static final String DATE_NOT_FOUND =
            "Mình chưa nhận ra ngày/thứ này. Bạn thử gõ hôm nay, ngày mai hoặc thứ trong tuần nhé.";
    public static final String REGION_NOT_FOUND =
            "Mình chưa nhận ra khu vực này. Bạn có thể chọn miền hoặc gõ tên đài cụ thể ạ?";
    public static final String STATION_NOT_FOUND =
            "Mình chưa tìm thấy đài này. Bạn thử gõ lại tên đài hoặc chọn miền ạ?";

    private ChatScheduleMessages() {
    }
}
