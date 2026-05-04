import React, { useMemo } from 'react';
import { StyleProp } from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer, type VideoContentFit, type VideoSource } from 'expo-video';

const normalizeVideoUrl = (value: string | null | undefined): string | null => {
    const trimmed = value?.trim();
    return trimmed && /^https?:\/\//i.test(trimmed) ? trimmed : null;
};

export const hasTrainingVideo = (value: string | null | undefined): boolean => !!normalizeVideoUrl(value);

type TrainingMediaSurfaceProps = {
    imageUrl: string;
    videoUrl?: string | null;
    style?: StyleProp<any>;
    contentFit?: VideoContentFit;
    nativeControls?: boolean;
};

export function TrainingMediaSurface({
    imageUrl,
    videoUrl,
    style,
    contentFit = 'cover',
    nativeControls = true,
}: TrainingMediaSurfaceProps) {
    const videoSource = useMemo<VideoSource>(() => {
        const normalizedVideoUrl = normalizeVideoUrl(videoUrl);
        return normalizedVideoUrl ? { uri: normalizedVideoUrl } : null;
    }, [videoUrl]);
    const player = useVideoPlayer(videoSource, (instance) => {
        instance.loop = false;
        instance.muted = false;
    });

    if (videoSource) {
        return (
            <VideoView
                player={player}
                style={style}
                contentFit={contentFit}
                nativeControls={nativeControls}
                allowsFullscreen
                playsInline
            />
        );
    }

    return <Image source={imageUrl} style={style} contentFit={contentFit} />;
}
