import { toast as reactToast, ToastOptions } from 'react-toastify';

const defaultOptions: ToastOptions = {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
};

export const AppToast = {
    success: (message: string, options?: ToastOptions) => {
        reactToast.success(message, { ...defaultOptions, ...options });
    },
    error: (message: string, options?: ToastOptions) => {
        reactToast.error(message, { ...defaultOptions, ...options });
    },
    info: (message: string, options?: ToastOptions) => {
        reactToast.info(message, { ...defaultOptions, ...options });
    },
    warning: (message: string, options?: ToastOptions) => {
        reactToast.warning(message, { ...defaultOptions, ...options });
    },
    confirm: async (message: string, title: string = "Xác nhận"): Promise<boolean> => {
        const { default: Swal } = await import('sweetalert2');
        const result = await Swal.fire({
            title,
            text: message,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#FF6262',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Đồng ý',
            cancelButtonText: 'Hủy',
            reverseButtons: true,
            customClass: {
                container: '!z-[999999]',
                popup: 'rounded-[2rem] border-none shadow-2xl',
                confirmButton: 'rounded-xl font-black px-8 py-3 mx-2',
                cancelButton: 'rounded-xl font-bold px-8 py-3 mx-2'
            }
        });
        return result.isConfirmed;
    }
};