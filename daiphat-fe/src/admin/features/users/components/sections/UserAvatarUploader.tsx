"use client";

import React, { useRef } from 'react';
import { Box, Card, Typography, Stack, CircularProgress } from '@mui/material';
import { Icon } from '@/admin/components/ui/AdminIcon';
import { toast } from 'react-toastify';

interface UserAvatarUploaderProps {
  avatarUrl?: string;
  avatarPreview?: string;
  onFileSelect: (file: File, previewUrl: string) => void;
  title?: string;
  /** When true, renders without outer Card for use inside CollapsibleCard. */
  embedded?: boolean;
  uploading?: boolean;
}

export const UserAvatarUploader: React.FC<UserAvatarUploaderProps> = ({
  avatarUrl,
  avatarPreview,
  onFileSelect,
  title = 'Ảnh đại diện',
  embedded = false,
  uploading = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Định dạng file không hợp lệ. Vui lòng chọn *.jpeg, *.jpg, *.png, hoặc *.gif');
      event.target.value = '';
      return;
    }

    const maxSize = 3 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Dung lượng file quá lớn. Tối đa là 3 Mb');
      event.target.value = '';
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    onFileSelect(file, previewUrl);
    event.target.value = '';
  };

  const currentSrc = avatarPreview || avatarUrl || '';

  const circleSize = embedded ? 120 : 144;
  const iconSize = embedded ? 28 : 32;

  const avatarPlaceholder = (
    <Stack alignItems="center" spacing={0.5} sx={{ px: 1, textAlign: 'center' }}>
      <Icon
        icon="solar:camera-add-bold"
        width={iconSize}
        color="var(--palette-text-secondary)"
      />
      <Typography
        variant="caption"
        sx={{
          color: 'var(--palette-text-secondary)',
          fontSize: embedded ? '0.6875rem' : '0.75rem',
          lineHeight: 1.2,
          fontWeight: 500,
        }}
      >
        Tải ảnh
      </Typography>
    </Stack>
  );

  const avatarCircle = (
    <Box
      onClick={handleOpenFile}
      role="presentation"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpenFile();
        }
      }}
      sx={{
        width: circleSize,
        height: circleSize,
        flexShrink: 0,
        mx: embedded ? 0 : 'auto',
        mb: embedded ? 0 : 3,
        borderRadius: '50%',
        border: '1px dashed var(--palette-divider)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        overflow: 'hidden',
        position: 'relative',
        bgcolor: 'rgba(145, 158, 171, 0.08)',
        transition: 'opacity 0.2s ease',
        '&:hover': { opacity: 0.72 },
      }}
    >
      {currentSrc ? (
        <img
          src={currentSrc}
          alt="Avatar"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : uploading ? (
        <CircularProgress size={embedded ? 28 : 32} sx={{ color: 'var(--palette-text-secondary)' }} />
      ) : (
        avatarPlaceholder
      )}
    </Box>
  );

  const hintText = (
    <Stack spacing={0.5}>
      <Typography variant="caption" color="text.secondary">
        Cho phép *.jpeg, *.jpg, *.png, *.gif
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Dung lượng tối đa 3 MB
      </Typography>
    </Stack>
  );

  const content = (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/jpg,image/png,image/gif"
        style={{ display: 'none' }}
      />

      {embedded ? (
        <Stack direction="row" spacing={2.5} alignItems="center">
          {avatarCircle}
          <Stack spacing={0.5}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            {hintText}
          </Stack>
        </Stack>
      ) : (
        <>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, textAlign: 'center' }}>
            {title}
          </Typography>
          {avatarCircle}
          <Stack spacing={1}>{hintText}</Stack>
        </>
      )}
    </>
  );

  if (embedded) {
    return <Box>{content}</Box>;
  }

  return (
    <Card sx={{ p: 4, borderRadius: 'var(--shape-borderRadius-lg)', textAlign: 'center' }}>
      {content}
    </Card>
  );
};
