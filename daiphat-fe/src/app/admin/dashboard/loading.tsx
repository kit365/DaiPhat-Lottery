export default function AdminDashboardLoading() {
    return (
        <div
            className="flex min-h-[320px] flex-col items-center justify-center gap-3 py-10"
            role="status"
            aria-live="polite"
        >
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#B71833]" />
            <p className="text-sm text-gray-500">Đang tải trang...</p>
        </div>
    );
}
