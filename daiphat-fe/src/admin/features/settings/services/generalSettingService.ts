import {
    getSystemConfigs,
    updateSystemConfig,
} from '../../../features/system-config/services/systemConfigService';
import { ConfigType, SystemConfigResponse } from '../../../features/system-config/types/system-config';
import { SettingGeneralFormValues } from '@/admin/features/settings/schemas/setting.schema';
import { uploadAdminImage } from '@/admin/shared/services/upload.service';

/** Form field → system_config.config_key (GENERAL_SETTING only; secrets stay out). */
export const GENERAL_SETTING_FIELD_KEYS = {
    websiteName: 'SITE_NAME',
    websiteDomain: 'SITE_DOMAIN',
    slogan: 'SITE_SLOGAN',
    intro: 'SITE_INTRO',
    logo: 'SITE_LOGO_URL',
    favicon: 'SITE_FAVICON_URL',
    phone: 'SITE_PHONE',
    supportOpenTime: 'SITE_SUPPORT_OPEN_TIME',
    supportCloseTime: 'SITE_SUPPORT_CLOSE_TIME',
    email: 'SITE_EMAIL',
    address: 'SITE_ADDRESS',
    copyright: 'SITE_COPYRIGHT',
    facebook: 'SITE_FACEBOOK_URL',
    telegram: 'SITE_TELEGRAM_URL',
    instagram: 'SITE_INSTAGRAM_URL',
    legalName: 'SITE_LEGAL_NAME',
    taxCode: 'SITE_TAX_CODE',
    legalRepresentative: 'SITE_LEGAL_REPRESENTATIVE',
    legalRepresentativeTitle: 'SITE_LEGAL_REPRESENTATIVE_TITLE',
    contractSigningPlace: 'SITE_CONTRACT_SIGNING_PLACE',
} as const satisfies Record<
    keyof Pick<
        SettingGeneralFormValues,
        | 'websiteName'
        | 'websiteDomain'
        | 'slogan'
        | 'intro'
        | 'logo'
        | 'favicon'
        | 'phone'
        | 'supportOpenTime'
        | 'supportCloseTime'
        | 'email'
        | 'address'
        | 'copyright'
        | 'facebook'
        | 'telegram'
        | 'instagram'
        | 'legalName'
        | 'taxCode'
        | 'legalRepresentative'
        | 'legalRepresentativeTitle'
        | 'contractSigningPlace'
    >,
    string
>;

export type GeneralSettingField = keyof typeof GENERAL_SETTING_FIELD_KEYS;

export type PersistedGeneralSettingForm = Omit<SettingGeneralFormValues, 'logo' | 'favicon'> & {
    logo: string;
    favicon: string;
};

export const emptyGeneralSettingForm = (): PersistedGeneralSettingForm => ({
    websiteName: '',
    websiteDomain: '',
    slogan: '',
    intro: '',
    logo: '',
    favicon: '',
    phone: '',
    supportOpenTime: '08:00',
    supportCloseTime: '22:00',
    email: '',
    address: '',
    copyright: '',
    facebook: '',
    telegram: '',
    instagram: '',
    legalName: '',
    taxCode: '',
    legalRepresentative: '',
    legalRepresentativeTitle: '',
    contractSigningPlace: '',
});

/** Drop ephemeral URLs that were accidentally persisted (blob mock / data URI). */
export const sanitizePersistedMediaUrl = (value: string): string => {
    const trimmed = (value ?? '').trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return '';
    return trimmed;
};

const resolveMediaField = async (
    value: string | File | null | undefined,
    label: string
): Promise<string> => {
    if (value instanceof File) {
        const url = await uploadAdminImage(value);
        const persistable = sanitizePersistedMediaUrl(url);
        if (!persistable) {
            throw new Error(
                `${label}: URL ảnh tạm thời không thể lưu. Kiểm tra cấu hình upload.`
            );
        }
        return persistable;
    }
    if (typeof value === 'string') {
        return sanitizePersistedMediaUrl(value);
    }
    return '';
};

/** Upload pending logo/favicon Files; leave unchanged HTTPS URLs as-is. */
export const resolveGeneralSettingMedia = async (
    form: SettingGeneralFormValues
): Promise<PersistedGeneralSettingForm> => {
    const [logo, favicon] = await Promise.all([
        resolveMediaField(form.logo, 'Logo'),
        resolveMediaField(form.favicon, 'Favicon'),
    ]);

    return {
        ...form,
        logo,
        favicon,
        websiteDomain: form.websiteDomain ?? '',
        slogan: form.slogan ?? '',
        intro: form.intro ?? '',
        phone: form.phone ?? '',
        supportOpenTime: form.supportOpenTime ?? '',
        supportCloseTime: form.supportCloseTime ?? '',
        email: form.email ?? '',
        address: form.address ?? '',
        copyright: form.copyright ?? '',
        facebook: form.facebook ?? '',
        telegram: form.telegram ?? '',
        instagram: form.instagram ?? '',
    };
};

export const mapConfigsToGeneralForm = (
    configs: SystemConfigResponse[]
): PersistedGeneralSettingForm => {
    const byKey = new Map(configs.map((c) => [c.configKey, c.configValue ?? '']));
    const form = emptyGeneralSettingForm();

    (Object.keys(GENERAL_SETTING_FIELD_KEYS) as GeneralSettingField[]).forEach((field) => {
        const raw = byKey.get(GENERAL_SETTING_FIELD_KEYS[field]) ?? '';
        form[field] =
            field === 'logo' || field === 'favicon' ? sanitizePersistedMediaUrl(raw) : raw;
    });

    return form;
};

export const fetchGeneralSettings = async (): Promise<{
    form: PersistedGeneralSettingForm;
    configs: SystemConfigResponse[];
}> => {
    const res = await getSystemConfigs(ConfigType.GENERAL_SETTING);
    const configs = res.data ?? [];
    return { form: mapConfigsToGeneralForm(configs), configs };
};

export const saveGeneralSettings = async (
    form: SettingGeneralFormValues,
    configs: SystemConfigResponse[]
): Promise<void> => {
    const resolved = await resolveGeneralSettingMedia(form);
    const byKey = new Map(configs.map((c) => [c.configKey, c]));

    const tasks = (Object.keys(GENERAL_SETTING_FIELD_KEYS) as GeneralSettingField[]).map(
        async (field) => {
            const configKey = GENERAL_SETTING_FIELD_KEYS[field];
            const cfg = byKey.get(configKey);
            if (!cfg) {
                throw new Error(`Thiếu cấu hình hệ thống: ${configKey}. Hãy khởi động lại BE để seed.`);
            }

            const rawResolved = resolved[field];
            let nextValue = typeof rawResolved === 'string' ? rawResolved.trim() : '';
            if (field === 'logo' || field === 'favicon') {
                nextValue = sanitizePersistedMediaUrl(nextValue);
                const raw = form[field];
                const hadMediaInput =
                    raw instanceof File || (typeof raw === 'string' && raw.trim().length > 0);
                if (hadMediaInput && !nextValue) {
                    throw new Error(
                        'Logo/favicon đang dùng URL tạm (blob). Hãy chọn lại ảnh và nhấn Lưu.'
                    );
                }
            }
            if (nextValue === (cfg.configValue ?? '')) {
                return;
            }

            await updateSystemConfig(cfg.id, {
                configName: cfg.configName,
                configValue: nextValue,
                description: cfg.description,
            });
        }
    );

    await Promise.all(tasks);
};
