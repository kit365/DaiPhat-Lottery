import { GuestGuard } from '@/admin/components/auth/GuestGuard';
import { ClientPage } from './ClientPage';

export default function AdminLogin() {
    return (
        <GuestGuard>
            <ClientPage />
        </GuestGuard>
    );
}
