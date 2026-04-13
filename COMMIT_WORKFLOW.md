# 🚀 Quy trình Commit Code (Jira + GitHub)

Tài liệu này hướng dẫn chuẩn quy trình làm việc với Git và Jira dành cho toàn bộ thành viên trong team và AI Agents.

---

## 🌿 1. Quy tắc Đặt tên Branch

Khi bắt đầu một task mới, hãy tạo branch theo định dạng sau:

**Format:** `prefix/<Topic-ID>-<short-description>`

**Chi tiết:**
- **Prefix:** `feature/` (tính năng), `bugfix/` (sửa lỗi), `hotfix/` (lỗi khẩn cấp production), `refactor/` (tối ưu code), `chore/` (cập nhật dependency, cấu hình).
- **Topic-ID:** ID của User Story trên Jira (ví dụ: `dp-74`).
- **Short Description:** Mô tả ngắn gọn bằng tiếng Anh, không dấu, dùng gạch nối `-` để ngăn cách.

**Ví dụ:**
- `feature/dp-74-customer-management`
- `feature/dp-80-chat-dashboard`
- `bugfix/dp-92-fix-login-redirect`

---

## 🧩 2. Commit theo Subtask

- Mỗi **Subtask** trên Jira nên là một **Commit riêng biệt**.
- **TUYỆT ĐỐI KHÔNG** gộp nhiều subtask khác nhau vào trong một commit. Điều này giúp việc track lỗi và revert code dễ dàng hơn.

---

## ✍️ 3. Định dạng Message Commit

Tất cả commit message phải tuân thủ chuẩn sau để Jira có thể tự động liên kết và cập nhật trạng thái:

**Format:** `[dp-ID] type: message #status`

**Thành phần:**
- **[dp-ID]**: ID của Subtask (ví dụ: `[dp-75]`).
- **type**: Loại thay đổi:
  - `feat`: Tính năng mới.
  - `fix`: Sửa lỗi.
  - `refactor`: Tối ưu/cấu trúc lại mã nguồn.
  - `chore`: Thay đổi nhỏ, cấu hình, build tool.
  - `docs`: Cập nhật tài liệu.
- **message**: Mô tả nội dung đã làm (nên dùng tiếng Anh hoặc tiếng Việt không dấu).
- **#status**: Trạng thái chuyển đổi trên Jira (Smart Commits):
  - `#todo` → Chuyển sang **To Do**.
  - `#in-progress` → Chuyển sang **In Progress**.
  - `#review` → Chuyển sang **In Review**.
  - `#done` → Chuyển sang **Done**.

> [!IMPORTANT]
> Nếu task chưa xong mà bạn chỉ muốn commit để lưu code, hoặc status đã được chuyển thủ công trên Jira trước đó, **không cần thêm phần #status** ở cuối.

---

## 📌 4. Ví dụ Thực tế

**User Story:** `DP-74 - Customer Management`

**Các Subtasks:**
- `DP-75`: UI list
- `DP-76`: API
- `DP-77`: Integration
- `DP-78`: Fix bug

**Dãy Commit chuẩn:**
1. `[dp-75] feat: build customer list UI #done`
2. `[dp-76] feat: implement get customers API #done`
3. `[dp-77] feat: integrate UI with API #done`
4. `[dp-78] fix: resolve pagination issue #done`

---

## 🚫 5. Những điều KHÔNG được làm

- ❌ **Thiếu Subtask ID:** Commit không có `[dp-ID]` sẽ không link được với Jira.
- ❌ **Message vô nghĩa:** Tránh các message như `"fix bug"`, `"update code"`, `"done"`, `"..."`.
- ❌ **Gộp Task:** Sửa lỗi giao diện và viết API trong cùng 1 commit.

---

## ⚡ 6. Flow Làm việc chuẩn (Dành cho Team & Agent)

1. **Nhận Task:** Kiểm tra Jira để lấy ID User Story và Subtask.
2. **Tạo Branch:** Theo format `feature/dp-ID-description`.
3. **Làm Subtask:** Thực hiện các thay đổi mã nguồn cho đúng phạm vi subtask đó.
4. **Commit:** Sử dụng format chuẩn để Jira tự chuyển trạng thái.
5. **Push & PR:** Push code lên remote branch và tạo Pull Request (PR) để merge vào branch `dev`.

---

## 🤖 Ghi chú dành cho AI Agent (Antigravity)

- **LUÔN LUÔN** hỏi user về Jira ID trước khi tạo branch hoặc commit nếu chưa biết.
- **TỰ ĐỘNG** áp dụng format branch và commit này cho mọi thay đổi mã nguồn trong dự án này.
- Coi đây là **Project Rules** ưu tiên cao nhất khi thao tác với Git.
