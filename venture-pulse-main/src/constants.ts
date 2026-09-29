export const STAGES = ['Seed Round', 'Series A', 'Series B', 'Series C', 'Others'];
export const ORIGINS = ['Thailand', 'Vietnam', 'China', 'Malaysia', 'Singapore', 'Others'];
export const LOCATIONS = ['Johor Bahru (JB)', 'Kuala Lumpur (KL)', 'Singapore', 'Ho Chi Minh (HCM)', 'Hanoi', 'Others'];
export const CURRENCIES = ['MYR', 'SGD', 'VND', 'THB', 'RMB', 'USD'];

// Internal values stay 'Business' / 'VC' (used for storage and logic).
// ADMIN_TAG_LABELS is what's actually shown to admins and on the ribbon.
export const ADMIN_TAGS = ['Business', 'VC'] as const;
export const ADMIN_TAG_LABELS: Record<(typeof ADMIN_TAGS)[number], string> = {
  Business: 'Founder',
  VC: 'Platform',
};

export const MAX_MEDIA = 9;
export const MAX_BUDGET = 99999;
export const MAX_IMAGE_MB = 10;
export const MAX_VIDEO_MB = 60;

export const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
];
