# Phát hành APK Android trên GitHub

Workflow [android-release.yml](../.github/workflows/android-release.yml) chỉ chạy khi push tag bắt đầu bằng `v`. Workflow CI `android-dev.yml` không bị thay đổi: push hoặc pull request vẫn chỉ build APK và lưu Artifact, không tự động public Release.

## Cấu hình một lần trên GitHub

1. Mở repository `kit365/DaiPhat-Lottery` trên GitHub, vào **Settings > Secrets and variables > Actions**.
2. Tạo hoặc kiểm tra các repository secret sau. Không commit bất kỳ giá trị nào vào Git.

   | Secret | Giá trị |
   | --- | --- |
   | `MOBILE_ENV_FILE` | Toàn bộ nội dung file `daiphat_mobile/.env` dùng cho bản production. Có thể dùng `ENV_FILE` nếu đã có secret này. |
   | `ANDROID_KEYSTORE_BASE64` | Nội dung Base64 của file keystore `.jks` dùng để ký APK. |
   | `ANDROID_KEYSTORE_PASSWORD` | Mật khẩu keystore. |
   | `ANDROID_KEY_ALIAS` | Alias của key trong keystore. |
   | `ANDROID_KEY_PASSWORD` | Mật khẩu của key. |

   Lệnh tạo giá trị Base64 trên PowerShell (chỉ sao chép kết quả vào GitHub Secrets, không lưu vào file):

   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\duong-dan\release-key.jks'))
   ```

3. Vào **Settings > Actions > General > Workflow permissions**, chọn **Read and write permissions**. Workflow đã yêu cầu `contents: write`; quyền này cho phép `GITHUB_TOKEN` tạo Release và upload APK. Nếu repository thuộc organization và tùy chọn bị khóa, administrator cần cấp quyền tương ứng.
4. Commit và push file workflow này lên nhánh mà bạn định phát hành (thường là `main`) trước khi tạo tag. Tag phải trỏ đến commit đã chứa workflow.

## Phát hành một phiên bản

Từ một working tree sạch, cập nhật nhánh phát hành, kiểm tra commit và tạo annotated tag. Thay `v1.0.0` bằng phiên bản cần phát hành:

```powershell
git switch main
git pull --ff-only origin main
git status
git tag -a v1.0.0 -m "DaiPhat Mobile v1.0.0"
git push origin v1.0.0
```

Hoặc tạo tag hoàn toàn trên giao diện GitHub: vào **Releases > Draft a new release**, nhập một tag mới (ví dụ `v1.0.0`), chọn **Create new tag ... on publish**, đặt target là `main`, rồi **Publish release**. Workflow nhận ra Release đã tồn tại và upload (hoặc ghi đè) APK vào Release đó.

Quy ước tag hợp lệ: `vMAJOR.MINOR.PATCH`, ví dụ `v1.0.0`, `v1.2.3`; có thể dùng prerelease như `v1.1.0-rc.1`. Khi workflow tự tạo Release, tag prerelease sẽ tạo GitHub Release dạng **pre-release**. Khi tạo Release trên giao diện GitHub, chọn thêm tùy chọn **Set as a pre-release** cho tag prerelease.

Sau khi push tag:

1. Mở tab **Actions**, chọn run **Android Release** của tag vừa push.
2. Workflow build APK `--release`, ký APK bằng keystore trong Secrets, đặt `versionName` theo tag (bỏ chữ `v`) và dùng `github.run_number` làm Android `versionCode`.
3. Workflow tạo Artifact tên `DaiPhat-vX.Y.Z-apk` và GitHub Release tên `DaiPhat Mobile vX.Y.Z`.
4. Tải `DaiPhat-vX.Y.Z.apk` từ phần **Assets** của Release. Release notes được GitHub tự sinh.

Nếu run thất bại ở bước tạo Release với lỗi quyền, kiểm tra bước 3 ở trên và các policy của organization. Nếu thất bại ở bước ký APK, kiểm tra lại 4 secret Android, đặc biệt là Base64 của đúng file keystore và alias/mật khẩu.

## Lưu ý phát hành lại

Không push lại tag đã phát hành. Nếu cần sửa code, tạo tag mới, ví dụ `v1.0.1`.

Nếu chạy lại workflow cho cùng tag, APK cùng tên trong Release sẽ được ghi đè. Cách an toàn và dễ theo dõi nhất vẫn là tăng phiên bản và tạo tag mới.
