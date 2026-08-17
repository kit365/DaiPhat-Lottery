"use client";

import { LoginPage } from '@/admin/features/auth/components/pages/LoginPage';

// Authentication pages are public by definition. Routing them through the
// admin permission boundary can deadlock before a user is able to sign in.
export const ClientPage = LoginPage;
