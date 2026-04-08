// SweetAlert2 utility for confirmations
import Swal from 'sweetalert2';

export const confirmDelete = (text: string, onConfirm: () => void) => {
    Swal.fire({
        title: 'Xác nhận xóa?',
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6366f1',
        confirmButtonText: 'Đồng ý',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            onConfirm();
        }
    });
};

export const confirmAction = (title: string, text: string, onConfirm: () => void, icon: 'info' | 'warning' | 'success' = 'info') => {
    Swal.fire({
        title: title,
        text: text,
        icon: icon,
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Xác nhận',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            onConfirm();
        }
    });
};

export const confirmSuccess = (title: string, text: string) => {
    return Swal.fire({
        title: title,
        text: text,
        icon: 'success',
        confirmButtonColor: '#10b981',
        confirmButtonText: 'Đóng'
    });
};

export const confirmInput = (title: string, label: string, onConfirm: (value: string) => void) => {
    Swal.fire({
        title: title,
        input: 'number',
        inputLabel: label,
        inputValue: 15,
        showCancelButton: true,
        confirmButtonColor: '#6366f1',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Xác nhận',
        cancelButtonText: 'Quay lại',
        inputValidator: (value) => {
            if (!value || parseInt(value) <= 0) {
                return 'Vui lòng nhập số phút hợp lệ';
            }
            return null;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            onConfirm(result.value);
        }
    });
};

export const confirmInputText = (title: string, label: string, placeholder: string = "", onConfirm: (value: string) => void, icon: 'info' | 'warning' | 'success' | 'error' = 'info') => {
    Swal.fire({
        title: title,
        input: 'text',
        inputLabel: label,
        inputPlaceholder: placeholder,
        icon: icon,
        showCancelButton: true,
        confirmButtonColor: '#ffa500',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Xác nhận',
        cancelButtonText: 'Hủy',
        inputValidator: (value) => {
            if (!value) {
                return 'Vui lòng không để trống!';
            }
            return null;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            onConfirm(result.value);
        }
    });
};
