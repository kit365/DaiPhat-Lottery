import { redirect } from 'next/navigation';

// Trang tổng quan tạm ẩn — chuyển về tài khoản cá nhân.
// import { ProfileTabWrapper } from '../ProfileTabWrapper';
// import { OverviewTab } from '@/client/features/profile/pages/tabs/OverviewTab';

export default function ProfileOverviewPage() {
    redirect('/profile/info');
}
