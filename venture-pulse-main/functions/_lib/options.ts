export const STAGES = ['Pub', 'Club', 'Massage/SPA', 'Escort', 'Sugarbaby', 'KTV', 'Others'];
export const ORIGINS = ['Thailand', 'Vietnam', 'China', 'Malaysia', 'Singapore', 'Others'];
export const LOCATIONS = ['Johor Bahru (JB)', 'Kuala Lumpur (KL)', 'Singapore', 'Ho Chi Minh (HCM)', 'Hanoi', 'Others'];
export const CURRENCIES = ['MYR', 'SGD', 'VND', 'THB', 'RMB', 'USD'];
export const ADMIN_TAGS = ['Business', 'VC'];

export const MAX_MEDIA = 9;
export const MAX_CIRCLE_MEMBERS = 50;
export const MAX_BUDGET = 99999;

export const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
export const VIDEO_TYPES: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 60 * 1024 * 1024;
