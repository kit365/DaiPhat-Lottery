package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileSupplierIdentityResponse;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SupplierIdentityScannerTest {

    private final SupplierIdentityScanner scanner = new SupplierIdentityScanner();

    private LotterySupplierModel minhChinh() {
        return LotterySupplierModel.builder()
                .id(1L)
                .name("Minh Chính")
                .code("MINH_CHINH")
                .taxCode("0301234567")
                .contactName("Trần Văn Bảy")
                .contactPhone("0909123456")
                .contactEmail("ncc@minhchinh.vn")
                .build();
    }

    /** The layout the downloadable template writes: label left, value beside it. */
    private List<List<String>> templateLetterhead() {
        return List.of(
                List.of("CÔNG TY TNHH XỔ SỐ ĐẠI PHÁT", "", "", "", "", "Mẫu số: 01-VT/NV"),
                List.of("Địa chỉ: 12 Nguyễn Văn Bảo, Gò Vấp", "", "", "", "", "Số phiếu: ......"),
                List.of("PHIẾU GIAO NHẬN VÉ XỔ SỐ"),
                List.of("Nhà cung cấp:", "Minh Chính", "", "", "", "Ngày lập phiếu:", "", "16/08/2026"),
                List.of("Mã nhà cung cấp:", "MINH_CHINH", "", "", "", "Ngày quay:", "", "16/08/2026"),
                List.of("Mã số thuế:", "0301234567", "", "", "", "Người lập phiếu:", "", "..........."),
                List.of("Người liên hệ:", "Trần Văn Bảy", "", "", "", "Kho nhận vé:", "", "..........."),
                List.of("Số điện thoại:", "0909123456", "", "", "", "Email:", "", "ncc@minhchinh.vn"),
                List.of("Địa chỉ:", "25 Lê Lợi, Quận 1, TP.HCM")
        );
    }

    @Test
    @DisplayName("A letterhead naming the selected supplier passes with every field matched")
    void acceptsMatchingLetterhead() {
        ImportBatchFileSupplierIdentityResponse result =
                scanner.scan(templateLetterhead(), minhChinh());

        assertThat(result.declared()).isTrue();
        assertThat(result.mismatched()).isFalse();
        assertThat(result.fields())
                .extracting(ImportBatchFileSupplierIdentityResponse.Field::field)
                .containsExactlyInAnyOrder(
                        "taxCode", "code", "contactPhone", "name", "contactName", "contactEmail",
                        // Read from the supplier's own block; the issuer's address
                        // line two rows above it is correctly ignored.
                        "address");
        assertThat(result.fields())
                .allMatch(ImportBatchFileSupplierIdentityResponse.Field::matched);
    }

    @Test
    @DisplayName("The issuer's own address is not mistaken for the supplier's identity")
    void ignoresIssuerBlock() {
        ImportBatchFileSupplierIdentityResponse result = scanner.scan(
                List.of(List.of("CÔNG TY TNHH XỔ SỐ ĐẠI PHÁT"),
                        List.of("Địa chỉ: 12 Nguyễn Văn Bảo, Gò Vấp")),
                minhChinh());

        assertThat(result.declared()).isFalse();
    }

    @Test
    @DisplayName("Uploading another supplier's note against this supplier is blocked")
    void blocksForeignFile() {
        List<List<String>> foreign = List.of(
                List.of("Nhà cung cấp:", "Thành Đạt"),
                List.of("Mã số thuế:", "0399999999"),
                List.of("Số điện thoại:", "0911222333")
        );

        ImportBatchFileSupplierIdentityResponse result = scanner.scan(foreign, minhChinh());

        assertThat(result.mismatched()).isTrue();
        assertThat(scanner.mismatchMessage(result, minhChinh()))
                .contains("Mã số thuế").contains("0399999999").contains("0301234567");
    }

    @Test
    @DisplayName("The same tax code and phone written differently still count as the same party")
    void toleratesFormatting() {
        List<List<String>> formatted = List.of(
                List.of("Nhà cung cấp:", "MINH CHINH"),
                List.of("MST:", "03-0123-4567"),
                List.of("Điện thoại:", "+84 909 123 456")
        );

        ImportBatchFileSupplierIdentityResponse result = scanner.scan(formatted, minhChinh());

        assertThat(result.mismatched()).isFalse();
        assertThat(result.fields()).hasSize(3).allMatch(
                ImportBatchFileSupplierIdentityResponse.Field::matched);
    }

    @Test
    @DisplayName("A field left blank on the form does not contradict the supplier record")
    void ignoresUnfilledFields() {
        List<List<String>> blank = List.of(
                List.of("Nhà cung cấp:", "Minh Chính"),
                List.of("Mã số thuế:", "..........................")
        );

        ImportBatchFileSupplierIdentityResponse result = scanner.scan(blank, minhChinh());

        assertThat(result.mismatched()).isFalse();
        assertThat(result.fields())
                .extracting(ImportBatchFileSupplierIdentityResponse.Field::field)
                .containsExactly("name");
    }

    @Test
    @DisplayName("A changed contact person is reported but does not block the import")
    void contactPersonDoesNotBlock() {
        List<List<String>> changed = List.of(
                List.of("Nhà cung cấp:", "Minh Chính"),
                List.of("Mã số thuế:", "0301234567"),
                List.of("Người liên hệ:", "Nguyễn Thị Hoa")
        );

        ImportBatchFileSupplierIdentityResponse result = scanner.scan(changed, minhChinh());

        assertThat(result.mismatched()).isFalse();
        assertThat(result.fields())
                .filteredOn(field -> field.field().equals("contactName"))
                .singleElement()
                .satisfies(field -> {
                    assertThat(field.matched()).isFalse();
                    assertThat(field.blocking()).isFalse();
                });
    }

    @Test
    @DisplayName("The receiving party's own details are not read as the supplier's")
    void ignoresTheReceivingParty() {
        // The receiver's tax code is listed first on purpose: whichever party is
        // read first would win, so this is the case that used to fail.
        List<List<String>> twoParties = List.of(
                List.of("Bên nhận:", "CÔNG TY TNHH XỔ SỐ ĐẠI PHÁT"),
                List.of("Mã số thuế bên nhận:", "0312345678"),
                List.of("Người nhập lô:", "Nguyễn Thị Hoa"),
                List.of("SĐT người nhập:", "0912345678"),
                List.of("Nhà cung cấp:", "Minh Chính"),
                List.of("Mã số thuế:", "0301234567"),
                List.of("Số điện thoại:", "0909123456")
        );

        ImportBatchFileSupplierIdentityResponse result = scanner.scan(twoParties, minhChinh());

        assertThat(result.mismatched()).isFalse();
        assertThat(result.fields())
                .filteredOn(field -> field.field().equals("taxCode"))
                .singleElement()
                .satisfies(field -> assertThat(field.valueInFile()).isEqualTo("0301234567"));
        assertThat(result.fields())
                .filteredOn(field -> field.field().equals("contactPhone"))
                .singleElement()
                .satisfies(field -> assertThat(field.valueInFile()).isEqualTo("0909123456"));
    }

    @Test
    @DisplayName("The supplier's address is compared, but only once their block has started")
    void readsSupplierAddressNotTheIssuerLetterhead() {
        LotterySupplierModel withAddress = LotterySupplierModel.builder()
                .id(1L)
                .name("Minh Chính")
                .contactPhone("0909123456")
                .address("25 Lê Lợi, Quận 1, TP.HCM")
                .build();

        // The issuer's own address is labelled exactly like the supplier's and
        // comes first; reading it would compare our address against theirs.
        List<List<String>> preamble = List.of(
                List.of("CÔNG TY TNHH XỔ SỐ ĐẠI PHÁT"),
                List.of("Địa chỉ: 12 Nguyễn Văn Bảo, Gò Vấp"),
                List.of("Nhà cung cấp:", "Minh Chính"),
                List.of("Địa chỉ:", "25 Lê Lợi, Quận 1, TP.HCM")
        );

        ImportBatchFileSupplierIdentityResponse result = scanner.scan(preamble, withAddress);

        assertThat(result.fields())
                .filteredOn(field -> field.field().equals("address"))
                .singleElement()
                .satisfies(field -> {
                    assertThat(field.valueInFile()).isEqualTo("25 Lê Lợi, Quận 1, TP.HCM");
                    assertThat(field.matched()).isTrue();
                });
    }

    @Test
    @DisplayName("The same address abbreviated differently is still the same address")
    void toleratesAddressAbbreviations() {
        LotterySupplierModel withAddress = LotterySupplierModel.builder()
                .id(1L)
                .name("Minh Chính")
                .address("Số 25 Lê Lợi, Quận 1, Thành phố Hồ Chí Minh")
                .build();

        ImportBatchFileSupplierIdentityResponse result = scanner.scan(
                List.of(List.of("Nhà cung cấp:", "Minh Chính"),
                        List.of("Địa chỉ:", "25 Lê Lợi, Q.1, TP. Hồ Chí Minh")),
                withAddress);

        assertThat(result.fields())
                .filteredOn(field -> field.field().equals("address"))
                .singleElement()
                .satisfies(field -> assertThat(field.matched()).isTrue());
    }

    @Test
    @DisplayName("A moved supplier is reported but the delivery is not blocked over prose")
    void addressMismatchDoesNotBlock() {
        LotterySupplierModel withAddress = LotterySupplierModel.builder()
                .id(1L)
                .name("Minh Chính")
                .taxCode("0301234567")
                .address("25 Lê Lợi, Quận 1, TP.HCM")
                .build();

        ImportBatchFileSupplierIdentityResponse result = scanner.scan(
                List.of(List.of("Nhà cung cấp:", "Minh Chính"),
                        List.of("Mã số thuế:", "0301234567"),
                        List.of("Địa chỉ:", "88 Trần Hưng Đạo, Quận 5, TP.HCM")),
                withAddress);

        assertThat(result.mismatched()).isFalse();
        assertThat(result.fields())
                .filteredOn(field -> field.field().equals("address"))
                .singleElement()
                .satisfies(field -> {
                    assertThat(field.matched()).isFalse();
                    assertThat(field.blocking()).isFalse();
                });
    }

    @Test
    @DisplayName("Files from the older template carry no letterhead and are not rejected")
    void acceptsFileWithoutLetterhead() {
        assertThat(scanner.scan(List.of(), minhChinh()).declared()).isFalse();
        assertThat(scanner.scan(List.of(), minhChinh()).mismatched()).isFalse();
    }
}
