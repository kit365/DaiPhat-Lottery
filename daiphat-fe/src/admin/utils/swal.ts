// SweetAlert2 — load on demand inside handlers (không kéo ~77KB vào mọi page list).

const ADMIN_PRIMARY = '#1C252E';
const ADMIN_CANCEL = '#919EAB';
const ADMIN_DELETE = '#FF5630';
const ADMIN_WARNING = '#FFAB00';

async function loadSwal() {
    const { default: Swal } = await import('sweetalert2');
    return Swal;
}

export const confirmDelete = (text: string, onConfirm: () => void) => {
    void loadSwal().then((Swal) => {
        Swal.fire({
            title: 'Xác nhận xóa?',
            text: text,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: ADMIN_DELETE,
            cancelButtonColor: ADMIN_CANCEL,
            confirmButtonText: 'Đồng ý',
            cancelButtonText: 'Hủy',
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
    icon: 'info' | 'warning' | 'success' = 'info'
) => {
    const confirmButtonColor = icon === 'warning' ? ADMIN_WARNING : ADMIN_PRIMARY;

    void loadSwal().then((Swal) => {
        Swal.fire({
            title: title,
            text: text,
            icon: icon,
            showCancelButton: true,
            confirmButtonColor,
            cancelButtonColor: ADMIN_CANCEL,
            confirmButtonText: 'Xác nhận',
            cancelButtonText: 'Hủy',
        }).then((result) => {
            if (result.isConfirmed) {
                onConfirm();
            }
        });
    });
};

export const confirmSuccess = (title: string, text: string) => {
    return loadSwal().then((Swal) =>
        Swal.fire({
            title: title,
            text: text,
            icon: 'success',
            confirmButtonColor: ADMIN_PRIMARY,
            confirmButtonText: 'Đóng',
        }),
    );
};

export const confirmInput = (title: string, label: string, onConfirm: (value: string) => void) => {
    void loadSwal().then((Swal) => {
        Swal.fire({
            title: title,
            input: 'number',
            inputLabel: label,
            inputValue: 15,
            showCancelButton: true,
            confirmButtonColor: ADMIN_PRIMARY,
            cancelButtonColor: ADMIN_CANCEL,
            confirmButtonText: 'Xác nhận',
            cancelButtonText: 'Quay lại',
            inputValidator: (value) => {
                if (!value || parseInt(value) <= 0) {
                    return 'Vui lòng nhập số phút hợp lệ';
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
    placeholder: string = '',
    onConfirm: (value: string) => void,
    icon: 'info' | 'warning' | 'success' | 'error' = 'info'
) => {
    void loadSwal().then((Swal) => {
        Swal.fire({
            title: title,
            input: 'text',
            inputLabel: label,
            inputPlaceholder: placeholder,
            icon: icon,
            showCancelButton: true,
            confirmButtonColor: icon === 'warning' ? ADMIN_WARNING : ADMIN_PRIMARY,
            cancelButtonColor: ADMIN_CANCEL,
            confirmButtonText: 'Xác nhận',
            cancelButtonText: 'Hủy',
            inputValidator: (value) => {
                if (!value) {
                    return 'Vui lòng không để trống!';
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
