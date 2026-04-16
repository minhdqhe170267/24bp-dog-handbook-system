import { API_CONFIG } from '../../constants/api';

export const breedUi = {
  imagePlaceholder: '#EAF7F0',
} as const;

export const resolveBreedImageUrl = (imageUrl: string | null | undefined): string | null => {
  const raw = (imageUrl || '').trim();

  if (!raw) {
    return null;
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  const apiOrigin = API_CONFIG.BASE_URL.replace(/\/api\/v1\/?$/i, '');
  const normalizedPath = raw.startsWith('/') ? raw : `/${raw}`;
  return `${apiOrigin}${normalizedPath}`;
};
