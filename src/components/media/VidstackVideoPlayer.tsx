import { forwardRef } from 'react';
import { MediaPlayer, MediaProvider } from '@vidstack/react';
import { DefaultVideoLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import type {
  MediaPlayerInstance,
  MediaPlayerProps,
  MediaTimeUpdateEvent,
  MediaTimeUpdateEventDetail,
} from '@vidstack/react';

type VidstackVideoPlayerProps = {
  src: string;
  title: string;
  poster?: string;
  onTimeUpdate?: (detail: MediaTimeUpdateEventDetail, nativeEvent: MediaTimeUpdateEvent) => void;
  onPlay?: MediaPlayerProps['onPlay'];
  playbackRates?: number[];
  className?: string;
};

const VidstackVideoPlayer = forwardRef<MediaPlayerInstance, VidstackVideoPlayerProps>(
  ({ src, title, poster, onTimeUpdate, onPlay, playbackRates, className }, ref) => (
    <MediaPlayer
      ref={ref}
      src={src}
      viewType="video"
      streamType="on-demand"
      logLevel="warn"
      crossOrigin
      playsInline
      title={title}
      poster={poster}
      className={className}
      onTimeUpdate={onTimeUpdate}
      onPlay={onPlay}
    >
      <MediaProvider />
      <DefaultVideoLayout icons={defaultLayoutIcons} playbackRates={playbackRates} />
    </MediaPlayer>
  )
);

VidstackVideoPlayer.displayName = 'VidstackVideoPlayer';

export default VidstackVideoPlayer;
