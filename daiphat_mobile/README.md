# 🎰 DaiPhat Lottery Mobile App (Flutter)

You are acting as a **UI/UX Expert** and a **Senior Flutter Developer**. Your task is to build and maintain the Mobile App for the lottery platform named **"ĐẠI PHÁT" (DaiPhat-Lottery-Platform)**. 

To ensure a seamless omnichannel experience, the Mobile App must strictly comply with the following context, design systems, and architectural rules extracted from the existing Web platform.

---

## 🎨 1. DESIGN SYSTEM & UI/UX STANDARDS
Flutter does not use CSS/Tailwind. You must implement these configurations inside `lib/theme/app_theme.dart` using Flutter's `ThemeData` and custom extensions. Do not hardcode these values in individual widgets.

### Color Palette (From Tailwind Config)
- **Primary Colors (Đỏ):** Main Primary `"#ee1314"`, Dark Primary `"#c80f11"`.
- **Accent/Gold Colors (Vàng):** Accent Gold `"#FFD700"`, Light Gold `"#FFF9E6"`.
- **Surface & Text Colors:** Surface/Background `"#FFFFFF"`, Ink (Main Text) `"#17191F"`, Secondary Text `"#505050"`, Navy Dark `"#102937"`.

### Typography (Google Fonts)
- **Main Font (Body, Captions, Labels):** `Public Sans` (via `google_fonts` package).
- **Heading/Accent Font (Titles, Headers, Highlights):** `Barlow` (via `google_fonts` package).

### Shapes & Geometry (Border Radius)
- **Small components (Inputs, Small tags):** `BorderRadius.circular(8.0)`
- **Large components (Cards, Buttons, Bottom Sheets):** `BorderRadius.circular(24.0)`

---

## 🚀 2. TECH STACK & ARCHITECTURE
You must strictly use the following packages for state, navigation, and networking. Do not install alternative packages unless explicitly requested.

- **State Management:** `flutter_riverpod` (and `riverpod_generator` for code generation).
- **Routing & Navigation:** `go_router` (Implement deep linking readiness and strict declarative routing).
- **Network Client:** `dio` (Configure interceptors for auth tokens, logging, and global error handling).

---

## 📱 3. CORE CORE FEATURES & SCREENS
When generating routes or screens, ensure they correspond to this architectural footprint:
1. **Home Screen (Trang chủ):** Display lottery results (Hiển thị kết quả xổ số) prominently.
2. **Lottery Purchase & Cart (Mua vé số & Giỏ hàng):** UI for ticket selection and temporary checkout basket.
3. **Draw Schedule (Lịch mở thưởng):** Timetables and countdowns for upcoming lottery sessions.
4. **My Tickets (Quản lý "Vé của tôi"):** History, active tickets, and winning/losing states of the user's purchased tickets.
5. **Account Management (Quản lý tài khoản):** Overview, personal profile settings, orders history, and Auth flow (Login/Register).
6. **Live Support Chat (Hỗ trợ/Chat trực tuyến):** Real-time customer support screen.

---

## 💾 4. DATA MODELS & SCHEMA CONSTRAINTS
When creating serialization/deserialization classes (e.g., using `freezed` or `json_serializable`), match the fields exactly with the backend TypeScript models.

### Example: Live Chat Data Models
Translate these schemas into robust Dart classes with proper Type Safety:

#### Participant Model
```dart
// Equivalent to TypeScript Interface:
// interface Participant { _id: string; fullName: string; avatar?: string; status?: 'active' | 'inactive'; }