import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { parseMediaUrls, pickTrainingImage, type InstructionStep } from './ui';

const STEP_MARKER_REGEX = /((?:Bước|Buoc|B|Step)\s*\d+)\s*[:.)-]?\s*/giu;
const NUMBERED_MARKER_REGEX = /(\d{1,2})\s*[:.)-]\s*/g;

const normalizeInstructionText = (value: string | null | undefined) =>
  (value || '')
    .replace(/\r\n/g, '\n')
    .replace(/[•·]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const splitByRegexMarkers = (value: string, regex: RegExp): string[] => {
  const matches = Array.from(value.matchAll(regex));
  if (matches.length <= 1) {
    return [];
  }

  return matches
    .map((match, index) => {
      const start = match.index ?? 0;
      const end = index < matches.length - 1 ? (matches[index + 1].index ?? value.length) : value.length;
      return value.slice(start, end).trim();
    })
    .filter(Boolean);
};

const splitLooseParagraphs = (value: string): string[] =>
  value
    .split(/\r?\n+|[;|]+/)
    .map((item) => item.replace(/^\s*[-*•]+\s*/, '').trim())
    .filter(Boolean);

const toInstructionStep = (segment: string, index: number): InstructionStep => {
  const markerMatch = segment.match(/^(?:(Bước|Buoc|B|Step)\s*(\d+)|(\d+))\s*[:.)-]?\s*(.*)$/iu);
  const stepNumber = markerMatch?.[2] || markerMatch?.[3] || String(index + 1);
  const body = (markerMatch?.[4] || segment).trim();
  const sentenceParts = body.split(/(?<=[.!?])\s+/u).filter(Boolean);
  const summary = sentenceParts[0]?.trim() || body || `Bước ${stepNumber}`;

  return {
    title: `Bước ${stepNumber}`,
    summary,
    detail: body || summary,
  };
};

export const buildTrainingInstructionSteps = (instructions: string | null | undefined): InstructionStep[] => {
  if (!instructions) {
    return [];
  }

  try {
    const parsed = JSON.parse(instructions);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.flatMap((item, index) => buildTrainingInstructionSteps(String(item)) || [toInstructionStep(String(item), index)]);
    }
  } catch {
    // Not a JSON array. Fall back to text parsing.
  }

  const normalized = normalizeInstructionText(instructions);
  if (!normalized) {
    return [];
  }

  const explicitSteps = splitByRegexMarkers(normalized, STEP_MARKER_REGEX);
  if (explicitSteps.length > 0) {
    return explicitSteps.map((item, index) => toInstructionStep(item, index));
  }

  const numberedSteps = splitByRegexMarkers(normalized, NUMBERED_MARKER_REGEX);
  if (numberedSteps.length > 1) {
    return numberedSteps.map((item, index) => toInstructionStep(item, index));
  }

  const paragraphs = splitLooseParagraphs(instructions);
  if (paragraphs.length > 1) {
    return paragraphs.map((item, index) => toInstructionStep(item, index));
  }

  return [toInstructionStep(normalized, 0)];
};

export const getTrainingVideoThumbnailUrl = (videoUrl: string | null | undefined): string | null => {
  const trimmed = videoUrl?.trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
    return null;
  }

  const cloudinaryVideoMarker = '/video/upload/';
  const markerIndex = trimmed.indexOf(cloudinaryVideoMarker);
  if (markerIndex < 0) {
    return null;
  }

  const beforeUpload = trimmed.slice(0, markerIndex + cloudinaryVideoMarker.length);
  const afterUpload = trimmed.slice(markerIndex + cloudinaryVideoMarker.length);
  const thumbnailPath = afterUpload.replace(/\.(mp4|mov|m4v|webm)(\?.*)?$/i, '.jpg$2');

  return `${beforeUpload}so_0/${thumbnailPath}`;
};

export const pickTrainingCoverImage = (
  seed: number | string | null | undefined,
  mediaUrls?: string | null,
  imageUrl?: string | null,
  videoUrl?: string | null,
): string => {
  const directImage = imageUrl?.trim();
  if (directImage && /^https?:\/\//i.test(directImage)) {
    return directImage;
  }

  const firstImage = parseMediaUrls(mediaUrls)
    .find((item) => /^https?:\/\//i.test(item) && !/\.mp4(?:$|\?)/i.test(item));

  return firstImage || getTrainingVideoThumbnailUrl(videoUrl) || pickTrainingImage(seed);
};

export const useTrainingEntrance = (duration = 620) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [duration, progress]);

  return {
    progress,
    animatedStyle: {
      opacity: progress,
      transform: [
        {
          translateY: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [18, 0],
          }),
        },
        {
          scale: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.985, 1],
          }),
        },
      ],
    },
  };
};
