"use client";

import React from 'react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { LoginModal } from './LoginModal';
import { RegisterModal } from './RegisterModal';
import { ProfileSetupModal } from './ProfileSetupModal';
import { VerifyModal } from './VerifyModal';
import { ForgotPasswordModal } from './ForgotPasswordModal';

export const AuthModalContainer: React.FC = () => {
  const {
    isLoginModalOpen,
    isRegisterModalOpen,
    isProfileSetupModalOpen,
    isVerifyModalOpen,
    isForgotPasswordModalOpen,
  } = useAuthStore();

  return (
    <>
      {isLoginModalOpen && <LoginModal />}
      {isRegisterModalOpen && <RegisterModal />}
      {isProfileSetupModalOpen && <ProfileSetupModal />}
      {isVerifyModalOpen && <VerifyModal />}
      {isForgotPasswordModalOpen && <ForgotPasswordModal />}
    </>
  );
};
