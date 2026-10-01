// SweetAlert2 — styled identically to AppToast.confirm (Red accent #FF6262, rounded-[2rem], reverseButtons)

const ADMIN_PRIMARY = "#FF6262";
const ADMIN_CANCEL = "#94a3b8";
const ADMIN_DELETE = "#FF6262";
const ADMIN_WARNING = "#FF6262";

async function loadSwal() {
    const { default: Swal } = await import("sweetalert2");
    return Swal;
}

const SWAL_CUSTOM_CLASS = {
    container: "!z-[999999]",
    popup: "rounded-[2rem] border-none shadow-2xl p-6 sm:p-8",
    confirmButton: "rounded-xl font-black px-8 py-3 mx-2 shadow-md hover:opacity-90 transition-opacity",
    cancelButton: "rounded-xl font-bold px-8 py-3 mx-2 shadow-sm hover:opacity-90 transition-opacity",
};

export const confirmDelete = (text: string, onConfirm: () => void) => {
    void loadSwal().then((Swal) => {
        Swal.fire({
            title: "Xác nhận xóa?",
            text: text,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: ADMIN_DELETE,
            cancelButtonColor: ADMIN_CANCEL,
            confirmButtonText: "Đồng ý",
            cancelButtonText: "Hủy",
            reverseButtons: true,
            customClass: SWAL_CUSTOM_CLASS,
        }).then((result) => {
            if (result.isConfirmed) {
                onConfirm();
            }
        });
    });
};

export const confirmAction = (
    title: string,
    text: string,
    onConfirm: () => void,
    icon: "info" | "warning" | "success" = "warning"
) => {
    void loadSwal().then((Swal) => {
        Swal.fire({
            title: title,
            text: text,
            icon: icon,
            showCancelButton: true,
            confirmButtonColor: ADMIN_PRIMARY,
            cancelButtonColor: ADMIN_CANCEL,
            confirmButtonText: "Xác nhận",
            cancelButtonText: "Hủy",
            reverseButtons: true,
            customClass: SWAL_CUSTOM_CLASS,
        }).then((result) => {
            if (result.isConfirmed) {
                onConfirm();
            }
        });
    });
};

export const confirmAsync = async (
    title: string,
    text: string,
    icon: "info" | "warning" | "success" | "error" = "warning",
    confirmButtonText: string = "Đồng ý"
): Promise<boolean> => {
    const Swal = await loadSwal();
    const result = await Swal.fire({
        title,
        text,
        icon,
        showCancelButton: true,
        confirmButtonColor: ADMIN_PRIMARY,
        cancelButtonColor: ADMIN_CANCEL,
        confirmButtonText,
        cancelButtonText: "Hủy",
        reverseButtons: true,
        customClass: SWAL_CUSTOM_CLASS,
    });
    return Boolean(result.isConfirmed);
};

export const confirmSuccess = (title: string, text: string) => {
    return loadSwal().then((Swal) =>
        Swal.fire({
            title: title,
            text: text,
            icon: "success",
            confirmButtonColor: ADMIN_PRIMARY,
            confirmButtonText: "Đóng",
            customClass: SWAL_CUSTOM_CLASS,
        }),
    );
};

export const confirmInput = (title: string, label: string, onConfirm: (value: string) => void) => {
    void loadSwal().then((Swal) => {
        Swal.fire({
            title: title,
            input: "number",
            inputLabel: label,
            inputValue: 15,
            showCancelButton: true,
            confirmButtonColor: ADMIN_PRIMARY,
            cancelButtonColor: ADMIN_CANCEL,
            confirmButtonText: "Xác nhận",
            cancelButtonText: "Quay lại",
            reverseButtons: true,
            customClass: SWAL_CUSTOM_CLASS,
            inputValidator: (value) => {
                if (!value || parseInt(value) <= 0) {
                    return "Vui lòng nhập số phút hợp lệ";
                }
                return null;
            },
        }).then((result) => {
            if (result.isConfirmed) {
                onConfirm(result.value);
            }
        });
    });
};

export const confirmInputText = (
    title: string,
    label: string,
    placeholder: string = "",
    onConfirm: (value: string) => void,
    icon: "info" | "warning" | "success" | "error" = "info"
) => {
    void loadSwal().then((Swal) => {
        Swal.fire({
            title: title,
            input: "text",
            inputLabel: label,
            inputPlaceholder: placeholder,
            icon: icon,
            showCancelButton: true,
            confirmButtonColor: ADMIN_PRIMARY,
            cancelButtonColor: ADMIN_CANCEL,
            confirmButtonText: "Xác nhận",
            cancelButtonText: "Hủy",
            reverseButtons: true,
            customClass: SWAL_CUSTOM_CLASS,
            inputValidator: (value) => {
                if (!value) {
                    return "Vui lòng không để trống!";
                }
                return null;
            },
        }).then((result) => {
            if (result.isConfirmed) {
                onConfirm(result.value);
            }
        });
    });
};
