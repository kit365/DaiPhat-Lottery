import { GuestGuard } from '@/admin/components/auth/GuestGuard';
import { ClientPage } from './ClientPage';

export default function AdminForgotPassword() {
    return (
        <GuestGuard>
            <ClientPage />
        </GuestGuard>
    );
}
