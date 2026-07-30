package com.daiphat.coreapi.application.constant.chat.schedule;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class ChatScheduleConstants {

    public static final String ENTITY_REGION = "region";
    public static final String ENTITY_STATION_ID = "stationId";
    public static final String ENTITY_STATION_CANONICAL = "stationCanonical";
    public static final String ENTITY_DRAW_DATE = "drawDate";

    public static final String ENTITY_STATION_IDS = "stationIds";

    public static final String SLOT_STATION_ID = ENTITY_STATION_ID;
    public static final String SLOT_STATION_IDS = "stationIds";
    public static final String SLOT_REGION = ENTITY_REGION;
    public static final String SLOT_DRAW_DATE = ENTITY_DRAW_DATE;
    public static final String SLOT_DATE_MODE = "dateMode";
    public static final String SLOT_SCOPE = "scope";
    public static final String SLOT_CONFIRM_STATION_IDS = "confirmStationIds";
    public static final String SLOT_REGION_ALL_INTENT = "regionAllIntent";
    public static final String SLOT_GOAL = "goal";

    public static final String GOAL_SCHEDULE = "SCHEDULE";
    public static final String GOAL_RESULT = "RESULT";
    public static final String GOAL_SCHEDULE_AND_RESULT = "SCHEDULE_AND_RESULT";
    public static final String GOAL_TICKET = "TICKET";

    public static final String SCOPE_STATION = "STATION";
    public static final String SCOPE_STATIONS = "STATIONS";
    public static final String SCOPE_REGION_ALL = "REGION_ALL";
    public static final String SCOPE_REGION_TODAY = "REGION_TODAY";
    public static final String SCOPE_NATION_ALL = "NATION_ALL";
    public static final String SCOPE_PICK_STATION = "PICK_STATION";

    public static final String TOKEN_ASK_LOCATION = "SCHEDULE_ASK_LOCATION";
    public static final String TOKEN_ASK_DATE = "SCHEDULE_ASK_DATE";
    public static final String TOKEN_ASK_DATE_MODE = "SCHEDULE_ASK_DATE_MODE";
    public static final String TOKEN_ASK_STATION_PREFIX = "SCHEDULE_ASK_STATION:";
    public static final String TOKEN_CONFIRM_STATION_PREFIX = "SCHEDULE_CONFIRM_STATION:";
    /** Token từ chip chọn đài — gửi station id, bypass NLP. */
    public static final String TOKEN_SELECT_STATION_PREFIX = "SCHEDULE_SELECT_STATION:";
    /** Đài đã chọn — hiển thị hub actions trên FE. */
    public static final String TOKEN_STATION_READY_PREFIX = "SCHEDULE_STATION_READY:";
    public static final String TOKEN_ASK_GOAL = "SCHEDULE_ASK_GOAL";
    public static final String TOKEN_SET_GOAL_PREFIX = "SCHEDULE_SET_GOAL:";
    /** Hub footer — hiện lịch/kết quả ngay, bypass slot-fill. */
    public static final String TOKEN_SHOW_PREFIX = "SCHEDULE_SHOW:";
    public static final String TOKEN_REGION_CHOICE_PREFIX = "SCHEDULE_REGION_CHOICE:";
    public static final String TOKEN_PICK_STATION_PAGE_PREFIX = "SCHEDULE_PICK_STATION_PAGE:";
    public static final String TOKEN_RESULT_PREFIX = "SCHEDULE_RESULT:";
    public static final String TOKEN_PICK_STATION_LIST_PREFIX = "SCHEDULE_PICK_STATION_LIST:";
    public static final String TOKEN_RESULT_SUMMARY_PREFIX = "SCHEDULE_RESULT_SUMMARY:";
    public static final String TOKEN_STATION_BUNDLE_PREFIX = "SCHEDULE_STATION_BUNDLE:";

    public static final String TOKEN_LEGACY_SCHEDULE_OPTIONS = "SCHEDULE_OPTIONS";
    /** Token từ quick-reply chip — restart WEB_SCHEDULE, không phụ thuộc classify. */
    public static final String TOKEN_RESTART = "SCHEDULE_RESTART";

    public static final String RELATIVE_TODAY = "TODAY";
    public static final String RELATIVE_TOMORROW = "TOMORROW";
    public static final String RELATIVE_YESTERDAY = "YESTERDAY";

    public static final String RESULT_PARAM_STATION = "station";
    public static final String RESULT_PARAM_STATIONS = "stations";
    public static final String RESULT_PARAM_REGION = "region";
    public static final String RESULT_PARAM_DATE = "date";
    public static final String RESULT_PARAM_SCOPE_ALL = "scope=all";
    public static final String RESULT_PARAM_SCOPE_TODAY = "scope=today";
}
