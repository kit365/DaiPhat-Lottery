import React from 'react';
import { StatusBadge } from '../../../shared/components/StatusBadge/StatusBadge';
import { TicketStatus, TICKET_STATUS_LABELS, getTicketStatusBadgeClass } from '../../../types/support.type';

/** Same tokens as `.admin-status-badge--*` (bg + text). */
const ADMIN_BADGE_TONES: Record<string, { color: string; bg: string }> = {
    'admin-status-badge--draft': {
        color: '#374151',
        bg: '#e5e7eb',
    },
    'admin-status-badge--pending': {
        color: 'var(--palette-warning-dark, #B76E00)',
        bg: 'var(--palette-warning-lighter, #FFF5CC)',
    },
    'admin-status-badge--active': {
        color: 'var(--palette-info-dark, #006C9C)',
        bg: 'var(--palette-info-lighter, #CAFDF5)',
    },
    'admin-status-badge--inactive': {
        color: 'var(--palette-error-dark, #B71D18)',
        bg: 'var(--palette-error-lighter, #FFE9D5)',
    },
    'admin-status-badge--success': {
        color: 'var(--palette-success-dark, #118D57)',
        bg: 'var(--palette-success-lighter, #D3FCD2)',
    },
};

const FALLBACK_TONE = ADMIN_BADGE_TONES['admin-status-badge--draft'];

export const COMPLAINT_STATUS_MAP: Record<TicketStatus, { label: string; bg: string; text: string }> = {
    [TicketStatus.OPEN]: {
        label: TICKET_STATUS_LABELS[TicketStatus.OPEN],
        bg: ADMIN_BADGE_TONES['admin-status-badge--draft'].bg,
        text: ADMIN_BADGE_TONES['admin-status-badge--draft'].color,
    },
    [TicketStatus.IN_PROGRESS]: {
        label: TICKET_STATUS_LABELS[TicketStatus.IN_PROGRESS],
        bg: ADMIN_BADGE_TONES['admin-status-badge--active'].bg,
        text: ADMIN_BADGE_TONES['admin-status-badge--active'].color,
    },
    [TicketStatus.WAITING_FOR_CUSTOMER]: {
        label: TICKET_STATUS_LABELS[TicketStatus.WAITING_FOR_CUSTOMER],
        bg: ADMIN_BADGE_TONES['admin-status-badge--pending'].bg,
        text: ADMIN_BADGE_TONES['admin-status-badge--pending'].color,
    },
    [TicketStatus.RESOLVED]: {
        label: TICKET_STATUS_LABELS[TicketStatus.RESOLVED],
        bg: ADMIN_BADGE_TONES['admin-status-badge--success'].bg,
        text: ADMIN_BADGE_TONES['admin-status-badge--success'].color,
    },
    [TicketStatus.REJECTED]: {
        label: TICKET_STATUS_LABELS[TicketStatus.REJECTED],
        bg: ADMIN_BADGE_TONES['admin-status-badge--inactive'].bg,
        text: ADMIN_BADGE_TONES['admin-status-badge--inactive'].color,
    },
    [TicketStatus.CLOSED]: {
        label: TICKET_STATUS_LABELS[TicketStatus.CLOSED],
        bg: ADMIN_BADGE_TONES['admin-status-badge--draft'].bg,
        text: ADMIN_BADGE_TONES['admin-status-badge--draft'].color,
    },
};

interface ComplaintStatusBadgeProps {
    status: TicketStatus;
    className?: string;
}

export const ComplaintStatusBadge: React.FC<ComplaintStatusBadgeProps> = ({ status, className = '' }) => {
    const tone = ADMIN_BADGE_TONES[getTicketStatusBadgeClass(status)] ?? FALLBACK_TONE;

    return (
        <StatusBadge
            label={TICKET_STATUS_LABELS[status] ?? status}
            color={tone.color}
            bg={tone.bg}
            className={className}
        />
    );
};
