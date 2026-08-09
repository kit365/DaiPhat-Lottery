"use client";

import type { CSSProperties } from "react";
import type { SvgIconComponent } from "@mui/icons-material";
import {
    Assignment,
    AccountBalance,
    AccountBalanceWallet,
    AddCircle,
    Archive,
    ArrowBack,
    Badge,
    CalendarMonth,
    Chat,
    CheckCircle,
    Checklist,
    Close,
    ConfirmationNumber,
    ContentCopy,
    CreditCard,
    Delete,
    Description,
    Edit,
    EmojiEvents,
    Facebook,
    FactCheck,
    FileDownload,
    FileUpload,
    HeadsetMic,
    HelpOutline,
    History,
    Home,
    HourglassEmpty,
    Info,
    Instagram,
    Inventory2,
    Link as LinkIcon,
    Notifications,
    NotificationsOff,
    OpenInNew,
    Person,
    PhotoLibrary,
    Place,
    PlayCircle,
    Print,
    ReceiptLong,
    RestartAlt,
    Save,
    Schedule,
    Search,
    Send,
    ShoppingCart,
    SwapHoriz,
    Tag,
    Visibility,
    VpnKey,
    WarningAmber,
} from "@mui/icons-material";

type IconProps = {
    icon: string;
    width?: number | string;
    height?: number | string;
    fontSize?: number | string;
    className?: string;
    style?: CSSProperties;
    color?: string;
};

const EXACT_ICON_MAP: Record<string, SvgIconComponent> = {
    "solar:bell-bing-bold-duotone": Notifications,
    "solar:bell-bold-duotone": Notifications,
    "solar:bell-off-bold-duotone": NotificationsOff,
    "eva:done-all-fill": CheckCircle,
    "mingcute:close-line": Close,
    "eva:arrow-back-fill": ArrowBack,
    "eva:person-fill": Person,
    "eva:printer-fill": Print,
    "eva:external-link-fill": OpenInNew,
    "logos:facebook": Facebook,
    "logos:instagram-icon": Instagram,
    "logos:telegram": Send,
};

function resolveIcon(icon: string): SvgIconComponent {
    const exact = EXACT_ICON_MAP[icon];
    if (exact) {
        return exact;
    }

    const key = icon.toLowerCase();

    if (key.includes("hourglass")) return HourglassEmpty;
    if (key.includes("clipboard-check") || key.includes("fact-check")) return FactCheck;
    if (key.includes("clipboard")) return Assignment;
    if (key.includes("import")) return FileDownload;
    if (key.includes("export")) return FileUpload;
    if (key.includes("arrow-left") || key.includes("arrow-back")) return ArrowBack;
    if (key.includes("done-all") || key.includes("check-circle")) return CheckCircle;
    if (key.includes("close")) return Close;
    if (key.includes("bell-off")) return NotificationsOff;
    if (key.includes("bell")) return Notifications;
    if (key.includes("copy")) return ContentCopy;
    if (key.includes("ticket") || key.includes("confirmation")) return ConfirmationNumber;
    if (key.includes("wallet") || key.includes("money") || key.includes("banknote")) {
        return AccountBalanceWallet;
    }
    if (key.includes("bill") || key.includes("receipt")) return ReceiptLong;
    if (key.includes("document") || key.includes("file")) return Description;
    if (key.includes("user-id") || key.includes("badge")) return Badge;
    if (key.includes("user") || key.includes("person") || key.includes("account")) return Person;
    if (key.includes("calendar")) return CalendarMonth;
    if (key.includes("magnif") || key.includes("search") || key.includes("zoom")) return Search;
    if (key.includes("danger") || key.includes("warning") || key.includes("triangle")) {
        return WarningAmber;
    }
    if (key.includes("printer")) return Print;
    if (key.includes("send")) return Send;
    if (key.includes("bank")) return AccountBalance;
    if (key.includes("transfer") || key.includes("swap")) return SwapHoriz;
    if (key.includes("gallery") || key.includes("image") || key.includes("photo")) return PhotoLibrary;
    if (key.includes("history")) return History;
    if (key.includes("map")) return Place;
    if (key.includes("diskette") || key.includes("save")) return Save;
    if (key.includes("add-circle") || key.includes("add")) return AddCircle;
    if (key.includes("restart") || key.includes("refresh")) return RestartAlt;
    if (key.includes("eye")) return Visibility;
    if (key.includes("pen") || key.includes("edit")) return Edit;
    if (key.includes("play")) return PlayCircle;
    if (key.includes("trash") || key.includes("delete")) return Delete;
    if (key.includes("archive")) return Archive;
    if (key.includes("cart")) return ShoppingCart;
    if (key.includes("home")) return Home;
    if (key.includes("key")) return VpnKey;
    if (key.includes("headset")) return HeadsetMic;
    if (key.includes("link")) return LinkIcon;
    if (key.includes("clock") || key.includes("schedule")) return Schedule;
    if (key.includes("info")) return Info;
    if (key.includes("crown") || key.includes("cup") || key.includes("star") || key.includes("prize")) {
        return EmojiEvents;
    }
    if (key.includes("hashtag") || key.includes("tag")) return Tag;
    if (key.includes("sim-card") || key.includes("card")) return CreditCard;
    if (key.includes("box") || key.includes("inventory")) return Inventory2;
    if (key.includes("checklist")) return Checklist;
    if (key.includes("chat")) return Chat;
    if (key.includes("facebook")) return Facebook;
    if (key.includes("instagram")) return Instagram;
    if (key.includes("telegram")) return Send;

    return HelpOutline;
}

/** MUI-backed drop-in replacement for @iconify/react Icon (no CDN). */
export function Icon({ icon, width, height, fontSize, className, style, color }: IconProps) {
    const ResolvedIcon = resolveIcon(icon);
    const size = fontSize ?? width ?? height ?? 24;

    return (
        <ResolvedIcon
            className={className}
            style={style}
            sx={{
                fontSize: size,
                width: width,
                height: height,
                color: color,
            }}
        />
    );
}
