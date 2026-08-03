"use client";

import React, { useRef } from 'react';
import { Box, Card, Typography, Stack } from '@mui/material';
import { toast } from 'react-toastify';

interface UserAvatarUploaderProps {
  avatarUrl?: string;
  avatarPreview?: string;
  onFileSelect: (file: File, previewUrl: string) => void;
  title?: string;
}

export const UserAvatarUploader: React.FC<UserAvatarUploaderProps> = ({
  avatarUrl,
  avatarPreview,
  onFileSelect,
  title = 'Ảnh đại diện',
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

  const currentSrc = avatarPreview || avatarUrl || '/assets/img/avatar/default-avatar.png';

  return (
    <Card sx={{ p: 4, borderRadius: 'var(--shape-borderRadius-lg)', textAlign: 'center' }}>
      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>
        {title}
      </Typography>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/jpg,image/png,image/gif"
        style={{ display: 'none' }}
      />

      <Box
        onClick={handleOpenFile}
        sx={{
          width: 144,
          height: 144,
          mx: 'auto',
          mb: 3,
          borderRadius: '50%',
          border: '1px dashed var(--palette-divider)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          overflow: 'hidden',
          position: 'relative',
          bgcolor: 'var(--palette-background-neutral)',
          '&:hover': { opacity: 0.8 },
        }}
      >
        <img
          src={currentSrc}
          alt="Avatar"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/assets/img/avatar/default-avatar.png';
          }}
        />
      </Box>

      <Stack spacing={1}>
        <Typography variant="caption" color="text.secondary">
          Cho phép *.jpeg, *.jpg, *.png, *.gif
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Dung lượng tối đa 3 MB
        </Typography>
      </Stack>
    </Card>
  );
};
