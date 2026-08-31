'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  Sparkles,
  RotateCcw,
  RotateCw,
  Settings,
  PictureInPicture,
  Film,
  Compass,
  Check,
  Eye,
  Layers,
  Flame,
} from 'lucide-react';

export interface LuxuryVideoItem {
  id: string;
  url: string;
  title_en?: string;
  title_ar?: string;
  thumbnail?: string;
  duration?: string;
  category?: 'tour' | 'drone' | 'cad' | 'spec' | string;
}

export interface LuxuryAmbientVideoPlayerProps {
  video: LuxuryVideoItem | string;
  title?: string;
  title_ar?: string;
  category?: string;
  poster?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  isAr?: boolean;
  onEnded?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export interface ParsedVideoSource {
  type: 'youtube' | 'vimeo' | 'html5';
  url: string;
  embedUrl?: string;
  thumbnail?: string;
}

export function parseVideoUrl(rawUrl: string): ParsedVideoSource {
  if (!rawUrl) return { type: 'html5', url: '' };
  const trimmed = rawUrl.trim();

  // YouTube parser (supports watch?v=, youtu.be/, embed/, shorts/)
  const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const id = ytMatch[1];
    return {
      type: 'youtube',
      url: trimmed,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  }

  // Vimeo parser
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    const id = vimeoMatch[1];
    return {
      type: 'vimeo',
      url: trimmed,
      embedUrl: `https://player.vimeo.com/video/${id}?autoplay=1&title=0&byline=0&portrait=0`,
      thumbnail: '',
    };
  }

  return {
    type: 'html5',
    url: trimmed,
  };
}

export const LuxuryAmbientVideoPlayer: React.FC<LuxuryAmbientVideoPlayerProps> = ({
  video,
  title,
  title_ar,
  category = 'tour',
  poster,
  autoPlay = false,
  loop = false,
  muted = false,
  isAr = false,
  onEnded,
  className = '',
  style,
}) => {
  const videoObj: LuxuryVideoItem = typeof video === 'string' 
    ? { id: 'v1', url: video, title_en: title, title_ar, category }
    : video;

  const videoUrl = videoObj.url;
  const parsedVideo = parseVideoUrl(videoUrl);
  const isEmbed = parsedVideo.type === 'youtube' || parsedVideo.type === 'vimeo';

  const displayTitle = isAr ? (videoObj.title_ar || videoObj.title_en || title || 'جولة فيديو داخل العقار') : (videoObj.title_en || title || 'Property Video Tour');
  const catLabel = isAr ? 'جولة فيديو داخل العقار' : 'PROPERTY VIDEO TOUR';
  const catConfig = { icon: '🎬' };

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAmbientOn, setIsAmbientOn] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [seekFeedback, setSeekFeedback] = useState<'forward' | 'backward' | null>(null);

  // DOM Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ambientVideoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Synchronize ambient background video with main video
  const syncAmbient = useCallback(() => {
    if (!ambientVideoRef.current || !videoRef.current || !isAmbientOn) return;
    const main = videoRef.current;
    const amb = ambientVideoRef.current;
    if (Math.abs(amb.currentTime - main.currentTime) > 0.3) {
      amb.currentTime = main.currentTime;
    }
    if (main.paused && !amb.paused) amb.pause();
    if (!main.paused && amb.paused) amb.play().catch(() => {});
  }, [isAmbientOn]);

  // Controls auto-hide timer
  const triggerActivity = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSpeedMenu(false);
      }, 3500);
    }
  }, [isPlaying]);

  // Play / Pause toggle
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused || videoRef.current.ended) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        if (ambientVideoRef.current && isAmbientOn) ambientVideoRef.current.play().catch(() => {});
      }).catch((e) => console.log('Autoplay prevented:', e));
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      if (ambientVideoRef.current) ambientVideoRef.current.pause();
    }
    triggerActivity();
  }, [isAmbientOn, triggerActivity]);

  // Time seek via range input
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
      syncAmbient();
    }
  };

  // Direct track pointer seek (guarantees strict LTR left-to-right calculation)
  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percent * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    syncAmbient();
    triggerActivity();
  };

  // Seek step (+10s / -10s)
  const seekStep = (seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    syncAmbient();
    triggerActivity();

    setSeekFeedback(seconds > 0 ? 'forward' : 'backward');
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => setSeekFeedback(null), 800);
  };

  // Volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  // Mute toggle
  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Picture in Picture
  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('PiP error:', err);
    }
  };

  // Speed change
  const handleSpeedSelect = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
    if (ambientVideoRef.current) ambientVideoRef.current.playbackRate = rate;
    setShowSpeedMenu(false);
  };

  // Event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0);
      if (autoPlay) {
        video.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
      syncAmbient();
    };

    const handleWaiting = () => setIsBuffering(true);
    const handleSeeking = () => setIsBuffering(true);
    const handleSeeked = () => setIsBuffering(false);
    const handleCanPlay = () => setIsBuffering(false);
    const handlePlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
    };
    const handlePause = () => setIsPlaying(false);
    const handleEndedEvent = () => {
      setIsPlaying(false);
      setIsBuffering(false);
      if (onEnded) onEnded();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEndedEvent);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEndedEvent);
    };
  }, [autoPlay, onEnded, syncAmbient]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;
  const videoThumb = parsedVideo.thumbnail || (videoObj as any)?.thumbnail || poster || '';

  if (isEmbed) {
    return (
      <div
        ref={containerRef}
        className={`luxury-ambient-player-root ${className} ${isFullscreen ? 'is-fullscreen' : ''}`}
        style={style}
      >
        {/* ─── 1. SEAMLESS AMBIENT BACKLIGHT GLOW (ACTUAL VIDEO AMBIENT MIRROR) ─── */}
        {isAmbientOn && (
          <div className="ambient-backlight-stage" aria-hidden="true">
            {videoThumb ? (
              <>
                <div
                  className="ambient-aurora-mesh mesh-alpha"
                  style={{ backgroundImage: `url(${videoThumb})` }}
                />
                <div
                  className="ambient-aurora-mesh mesh-beta"
                  style={{ backgroundImage: `url(${videoThumb})` }}
                />
              </>
            ) : (
              <div className="ambient-aurora-blend" />
            )}
          </div>
        )}

        {/* ─── 2. MAIN OBSIDIAN VIEWPORT & IFRAME EMBED ─── */}
        <div className="player-stage-viewport iframe-mode">
          <iframe
            src={parsedVideo.embedUrl}
            title={displayTitle}
            className="player-iframe-embed"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* ─── 3. STYLES ─── */}
        <style jsx>{`
          @keyframes auroraDriftAlpha {
            0% {
              transform: scale(1.02) translate(0px, 0px) rotate(0deg);
              filter: blur(56px) saturate(165%) brightness(0.96);
            }
            50% {
              transform: scale(1.03) translate(-16px, 10px) rotate(-0.6deg);
              filter: blur(58px) saturate(165%) brightness(0.95);
            }
            100% {
              transform: scale(1.02) translate(0px, 0px) rotate(0deg);
              filter: blur(56px) saturate(165%) brightness(0.96);
            }
          }

          @keyframes auroraDriftBeta {
            0% {
              transform: scale(1.05) translate(0px, 0px) rotate(0deg);
              opacity: 0.20;
            }
            50% {
              transform: scale(1.10) translate(-14px, -8px) rotate(-1deg);
              opacity: 0.40;
            }
            100% {
              transform: scale(1.05) translate(0px, 0px) rotate(0deg);
              opacity: 0.20;
            }
          }

          .luxury-ambient-player-root {
            position: relative;
            width: 100%;
            border-radius: 24px;
            background: transparent;
            overflow: visible;
            box-sizing: border-box;
          }

          .ambient-backlight-stage {
            position: absolute;
            inset: 0;
            z-index: 0;
            pointer-events: none;
            overflow: visible;
          }

          .ambient-aurora-mesh {
            position: absolute;
            inset: -8px -32px -8px -32px;
            background-size: cover;
            background-position: center;
            border-radius: 36px;
            will-change: transform, filter, opacity;
            pointer-events: none;
          }

          .ambient-aurora-mesh.mesh-alpha {
            opacity: 0.45;
            animation: auroraDriftAlpha 7.5s infinite ease-in-out;
          }

          .ambient-aurora-mesh.mesh-beta {
            animation: auroraDriftBeta 10s infinite ease-in-out;
            filter: blur(72px) saturate(175%) brightness(0.94);
          }

          .player-stage-viewport {
            position: relative;
            z-index: 1;
            width: 100%;
            aspect-ratio: 16 / 9;
            background: #080A0E;
            border-radius: 24px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            overflow: hidden;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
          }

          .player-iframe-embed {
            width: 100%;
            height: 100%;
            border: none;
            display: block;
            background: #000;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`luxury-ambient-player-root ${className} ${isFullscreen ? 'is-fullscreen' : ''}`}
      dir="ltr"
      onMouseMove={triggerActivity}
      onTouchStart={triggerActivity}
      style={style}
    >
      {/* ─── 1. REAL-TIME AMBIENT BACKLIGHT GLOW (LIVE PLAYING VIDEO SYNC) ─── */}
      {isAmbientOn && (
        <div className="ambient-backlight-stage" aria-hidden="true">
          <video
            ref={ambientVideoRef}
            src={videoUrl}
            muted
            playsInline
            loop={loop}
            className="ambient-mirror-video"
          />
        </div>
      )}

      {/* ─── 2. MAIN OBSIDIAN STAGE & HTML5 VIDEO ─── */}
      <div className="player-stage-viewport" onClick={togglePlay}>
        <video
          ref={videoRef}
          src={videoUrl}
          poster={poster || videoObj.thumbnail}
          playsInline
          loop={loop}
          muted={muted}
          className="player-primary-video"
          preload="metadata"
        />

        {/* Top Header Badge & Ambient Switch */}
        <div className={`player-top-overlay ${showControls ? 'visible' : 'hidden'}`} onClick={(e) => e.stopPropagation()}>
          <div className="player-meta-badge">
            <span className="player-cat-icon">{catConfig.icon}</span>
            <div className="player-title-col">
              <span className="player-cat-tag">{catLabel}</span>
              <span className="player-headline">{displayTitle}</span>
            </div>
          </div>

          <div className="player-top-actions">
            {/* Ambient Mode Toggle */}
            <button
              type="button"
              className={`player-ambient-pill ${isAmbientOn ? 'active' : ''}`}
              onClick={() => setIsAmbientOn(!isAmbientOn)}
              title={isAr ? 'تبديل الإضاءة السينمائية المحيطية' : 'Toggle Dynamic Ambient Backlight'}
            >
              <Sparkles size={13} className="sparkle-svg" />
              <span className="ambient-pill-label">
                {isAr ? `إضاءة محيطية: ${isAmbientOn ? 'مفعلة' : 'معطلة'}` : `Ambient: ${isAmbientOn ? 'ON' : 'OFF'}`}
              </span>
              <span className={`ambient-indicator-dot ${isAmbientOn ? 'active' : ''}`} />
            </button>
          </div>
        </div>

        {/* Center Play Button Overlay (when paused and not buffering) */}
        {!isPlaying && !isBuffering && (
          <div className="player-center-action" onClick={(e) => { e.stopPropagation(); togglePlay(); }}>
            <div className="player-center-gold-orb">
              <Play size={32} className="play-center-svg" />
            </div>
          </div>
        )}

        {/* Buffering Spinner */}
        {isBuffering && (
          <div className="player-buffering-overlay" aria-label="Loading video">
            <div className="luxury-spinner-ring" />
          </div>
        )}

        {/* Skip feedback ripple animation (+10s / -10s) */}
        {seekFeedback && (
          <div className={`seek-feedback-indicator ${seekFeedback}`}>
            {seekFeedback === 'forward' ? <RotateCw size={28} /> : <RotateCcw size={28} />}
            <span>{seekFeedback === 'forward' ? '+10s' : '-10s'}</span>
          </div>
        )}

        {/* Double-tap zones for Mobile */}
        <div
          className="double-tap-zone zone-left"
          onDoubleClick={(e) => { e.stopPropagation(); seekStep(-10); }}
        />
        <div
          className="double-tap-zone zone-right"
          onDoubleClick={(e) => { e.stopPropagation(); seekStep(10); }}
        />

        {/* ─── 3. OBSIDIAN & GOLD CONTROLS BAR ─── */}
        <div
          className={`player-controls-bottom ${showControls ? 'visible' : 'hidden'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress Scrub Bar */}
          <div className="player-scrubber-row" dir="ltr">
            <div className="player-track-wrapper" onPointerDown={handleTrackPointerDown} dir="ltr">
              {/* Buffered progress */}
              <div className="track-buffered" style={{ width: `${bufferedPercent}%` }} />
              {/* Played progress */}
              <div className="track-played" style={{ width: `${progressPercent}%` }}>
                <div className="track-scrubber-handle" />
              </div>
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.05"
                value={currentTime}
                onChange={handleSeek}
                dir="ltr"
                className="scrubber-range-input"
                aria-label="Video scrubber"
              />
            </div>
          </div>

          {/* Bottom Controls Row */}
          <div className="player-bottom-buttons-row" dir="ltr">
            {/* Left cluster: Play/Pause, Replay 10, Forward 10, Time */}
            <div className="player-btn-group left" dir="ltr">
              <button
                type="button"
                className="player-control-btn play-btn"
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>

              <button
                type="button"
                className="player-control-btn seek-btn"
                onClick={() => seekStep(-10)}
                title={isAr ? 'رجوع 10 ثوانٍ' : 'Rewind 10s'}
              >
                <RotateCcw size={16} />
              </button>

              <button
                type="button"
                className="player-control-btn seek-btn"
                onClick={() => seekStep(10)}
                title={isAr ? 'تقديم 10 ثوانٍ' : 'Forward 10s'}
              >
                <RotateCw size={16} />
              </button>

              {/* Volume */}
              <div className="volume-slider-group" dir="ltr">
                <button
                  type="button"
                  className="player-control-btn vol-btn"
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX size={17} />
                  ) : volume < 0.5 ? (
                    <Volume1 size={17} />
                  ) : (
                    <Volume2 size={17} />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  dir="ltr"
                  className="volume-range-input"
                  aria-label="Volume slider"
                />
              </div>

              {/* Timestamp */}
              <div className="player-timestamp" dir="ltr">
                <span className="current-time">{formatTime(currentTime)}</span>
                <span className="time-divider">/</span>
                <span className="total-time">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right cluster: Speed selector, PiP, Fullscreen */}
            <div className="player-btn-group right">
              {/* Playback Speed Menu */}
              <div className="speed-dropdown-wrapper">
                <button
                  type="button"
                  className="player-control-btn speed-btn"
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  title={isAr ? 'سرعة التشغيل' : 'Playback Speed'}
                >
                  <span>{playbackRate}x</span>
                </button>

                {showSpeedMenu && (
                  <div className="speed-popover-menu">
                    {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        className={`speed-option ${playbackRate === rate ? 'selected' : ''}`}
                        onClick={() => handleSpeedSelect(rate)}
                      >
                        <span>{rate === 1 ? '1.0x (Normal)' : `${rate}x`}</span>
                        {playbackRate === rate && <Check size={12} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Picture-in-Picture */}
              <button
                type="button"
                className="player-control-btn pip-btn"
                onClick={togglePiP}
                title={isAr ? 'صورة داخل صورة' : 'Picture in Picture'}
              >
                <PictureInPicture size={17} />
              </button>

              {/* Fullscreen */}
              <button
                type="button"
                className="player-control-btn fs-btn"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. BESPOKE LUXURY OBSIDIAN & GOLD STYLES ─── */}
      <style jsx>{`
        @keyframes auroraDriftAlpha {
          0% {
            transform: scale(1.02) translate(0px, 0px) rotate(0deg);
            filter: blur(56px) saturate(165%) brightness(0.96);
          }
          50% {
            transform: scale(1.03) translate(-16px, 10px) rotate(-0.6deg);
            filter: blur(58px) saturate(165%) brightness(0.95);
          }
          100% {
            transform: scale(1.02) translate(0px, 0px) rotate(0deg);
            filter: blur(56px) saturate(165%) brightness(0.96);
          }
        }

        @keyframes auroraDriftBeta {
          0% {
            transform: scale(1.05) translate(0px, 0px) rotate(0deg);
            opacity: 0.20;
          }
          50% {
            transform: scale(1.10) translate(-14px, -8px) rotate(-1deg);
            opacity: 0.40;
          }
          100% {
            transform: scale(1.05) translate(0px, 0px) rotate(0deg);
            opacity: 0.20;
          }
        }

        .luxury-ambient-player-root {
          position: relative;
          width: 100%;
          border-radius: 24px;
          background: transparent;
          overflow: visible;
          box-sizing: border-box;
          user-select: none;
          direction: ltr !important;
        }

        .luxury-ambient-player-root.is-fullscreen {
          border-radius: 0;
          width: 100vw;
          height: 100vh;
          background: #000000;
        }

        /* ─── Ambient Stage Projection (Exact Photo Gallery Match) ─── */
        .ambient-backlight-stage {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: visible;
        }

        .ambient-aurora-mesh {
          position: absolute;
          inset: -8px -32px -8px -32px;
          background-size: cover;
          background-position: center;
          border-radius: 36px;
          will-change: transform, filter, opacity;
          pointer-events: none;
        }

        .ambient-aurora-mesh.mesh-alpha {
          opacity: 0.45;
          animation: auroraDriftAlpha 7.5s infinite ease-in-out;
        }

        .ambient-aurora-mesh.mesh-beta {
          animation: auroraDriftBeta 10s infinite ease-in-out;
          filter: blur(72px) saturate(175%) brightness(0.94);
        }

        .ambient-mirror-video {
          position: absolute;
          inset: -12px -32px -12px -32px;
          width: calc(100% + 64px);
          height: calc(100% + 24px);
          object-fit: cover;
          border-radius: 36px;
          filter: blur(52px) saturate(180%) brightness(0.95);
          opacity: 0.7;
          transform: scale(1.06);
          will-change: filter, opacity;
          pointer-events: none;
        }

        /* ─── Main Viewport ─── */
        .player-stage-viewport {
          position: relative;
          z-index: 1;
          width: 100%;
          aspect-ratio: 16 / 9;
          background: #080A0E;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          overflow: hidden;
          cursor: pointer;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
          direction: ltr !important;
        }

        .luxury-ambient-player-root.is-fullscreen .player-stage-viewport {
          border-radius: 0;
          border: none;
          height: 100vh;
          aspect-ratio: auto;
        }

        .player-primary-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* ─── Top Overlay ─── */
        .player-top-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(to bottom, rgba(7, 9, 13, 0.88) 0%, rgba(7, 9, 13, 0.45) 60%, transparent 100%);
          z-index: 10;
          transition: opacity 0.25s ease, transform 0.25s ease;
          direction: ltr !important;
        }

        .player-top-overlay.hidden {
          opacity: 0;
          transform: translateY(-8px);
          pointer-events: none;
        }

        .player-meta-badge {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .player-cat-icon {
          font-size: 1.25rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .player-title-col {
          display: flex;
          flex-direction: column;
        }

        .player-cat-tag {
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #DDA752;
        }

        .player-headline {
          font-size: 0.88rem;
          font-weight: 700;
          color: #FFFDF5;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
        }

        /* Ambient Pill */
        .player-ambient-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(15, 20, 32, 0.82);
          border: 1px solid rgba(221, 167, 82, 0.3);
          border-radius: 999px;
          padding: 6px 12px;
          color: rgba(255, 255, 255, 0.75);
          font-size: 0.72rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          backdrop-filter: blur(12px);
        }

        .player-ambient-pill.active {
          background: rgba(221, 167, 82, 0.18);
          border-color: #DDA752;
          color: #FFFDF5;
          box-shadow: 0 0 14px rgba(221, 167, 82, 0.35);
        }

        .sparkle-svg {
          color: #DDA752;
        }

        .ambient-indicator-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
        }

        .ambient-indicator-dot.active {
          background: #DDA752;
          box-shadow: 0 0 8px #DDA752;
        }

        /* ─── Center Play Orb ─── */
        .player-center-action {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 8;
        }

        .player-center-gold-orb {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: rgba(13, 17, 26, 0.85);
          border: 2px solid rgba(221, 167, 82, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #DDA752;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 25px rgba(221, 167, 82, 0.35);
          backdrop-filter: blur(10px);
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease;
        }

        .player-center-gold-orb:hover {
          transform: scale(1.12);
          background: rgba(221, 167, 82, 0.25);
          color: #FFFDF5;
          border-color: #FFFDF5;
        }

        .play-center-svg {
          margin-left: 4px;
        }

        /* Double Tap zones */
        .double-tap-zone {
          position: absolute;
          top: 60px;
          bottom: 70px;
          width: 35%;
          z-index: 5;
        }
        .double-tap-zone.zone-left { left: 0; }
        .double-tap-zone.zone-right { right: 0; }

        /* Seek Feedback Ripple */
        .seek-feedback-indicator {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          background: rgba(13, 17, 26, 0.9);
          border: 1px solid #DDA752;
          color: #DDA752;
          padding: 14px 18px;
          border-radius: 16px;
          font-weight: 800;
          font-size: 0.8rem;
          z-index: 12;
          animation: popFade 0.7s forwards;
          pointer-events: none;
        }

        .seek-feedback-indicator.forward { right: 18%; }
        .seek-feedback-indicator.backward { left: 18%; }

        @keyframes popFade {
          0% { transform: translateY(-50%) scale(0.85); opacity: 0; }
          40% { transform: translateY(-50%) scale(1.05); opacity: 1; }
          100% { transform: translateY(-50%) scale(1); opacity: 0; }
        }

        /* ─── Buffering Spinner ─── */
        .player-buffering-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9;
          background: rgba(0, 0, 0, 0.35);
          pointer-events: none;
        }

        .luxury-spinner-ring {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 3px solid rgba(221, 167, 82, 0.2);
          border-top-color: #DDA752;
          box-shadow: 0 0 16px rgba(221, 167, 82, 0.35);
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ─── Bottom Controls Bar ─── */
        .player-controls-bottom {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 12px 18px;
          background: linear-gradient(to top, rgba(7, 9, 13, 0.95) 0%, rgba(7, 9, 13, 0.75) 60%, transparent 100%);
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: opacity 0.25s ease, transform 0.25s ease;
          direction: ltr !important;
        }

        .player-controls-bottom.hidden {
          opacity: 0;
          transform: translateY(8px);
          pointer-events: none;
        }

        /* Scrubber Track */
        .player-scrubber-row {
          width: 100%;
          padding: 4px 0;
          direction: ltr !important;
        }

        .player-track-wrapper {
          position: relative;
          width: 100%;
          height: 6px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.2);
          cursor: pointer;
          direction: ltr !important;
        }

        .player-track-wrapper:hover {
          height: 8px;
        }

        .track-buffered {
          position: absolute;
          top: 0;
          left: 0;
          right: auto;
          height: 100%;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.35);
          pointer-events: none;
          direction: ltr !important;
        }

        .track-played {
          position: absolute;
          top: 0;
          left: 0;
          right: auto;
          height: 100%;
          border-radius: 4px;
          background: linear-gradient(to right, #C59A45, #FEE8A0);
          pointer-events: none;
          direction: ltr !important;
        }

        .track-scrubber-handle {
          position: absolute;
          right: -6px;
          left: auto;
          top: 50%;
          transform: translateY(-50%);
          width: 13px;
          height: 13px;
          border-radius: 50%;
          background: #FFFDF5;
          border: 2px solid #DDA752;
          box-shadow: 0 0 8px rgba(0, 0, 0, 0.8);
        }

        .scrubber-range-input {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
          margin: 0;
          direction: ltr !important;
        }

        /* Buttons Row */
        .player-bottom-buttons-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          direction: ltr !important;
        }

        .player-btn-group {
          display: flex;
          align-items: center;
          gap: 10px;
          direction: ltr !important;
        }

        .player-control-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.8);
          cursor: pointer;
          padding: 6px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .player-control-btn:hover {
          color: #DDA752;
          background: rgba(221, 167, 82, 0.12);
          transform: scale(1.05);
        }

        .play-btn {
          color: #FFFDF5;
          background: rgba(221, 167, 82, 0.15);
          border: 1px solid rgba(221, 167, 82, 0.3);
          border-radius: 50%;
          width: 32px;
          height: 32px;
        }

        .play-btn:hover {
          background: #DDA752;
          color: #0A0C10;
        }

        /* Volume slider */
        .volume-slider-group {
          display: flex;
          align-items: center;
          gap: 4px;
          direction: ltr !important;
        }

        .volume-range-input {
          width: 58px;
          height: 4px;
          accent-color: #DDA752;
          cursor: pointer;
        }

        /* Timestamp */
        .player-timestamp {
          font-family: 'Plus Jakarta Sans', monospace;
          font-size: 0.72rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.7);
          margin-left: 6px;
          direction: ltr !important;
          unicode-bidi: isolate;
        }

        .current-time {
          color: #FFFDF5;
        }

        .time-divider {
          margin: 0 4px;
          opacity: 0.4;
        }

        /* Speed Dropdown */
        .speed-dropdown-wrapper {
          position: relative;
        }

        .speed-btn {
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          padding: 4px 8px;
        }

        .speed-popover-menu {
          position: absolute;
          bottom: 38px;
          right: 0;
          background: rgba(13, 17, 26, 0.95);
          border: 1px solid rgba(221, 167, 82, 0.3);
          border-radius: 12px;
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          backdrop-filter: blur(16px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
          min-width: 120px;
          z-index: 20;
        }

        .speed-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.75rem;
          font-weight: 600;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .speed-option:hover {
          background: rgba(221, 167, 82, 0.15);
          color: #DDA752;
        }

        .speed-option.selected {
          color: #DDA752;
          font-weight: 800;
        }

        @media (max-width: 640px) {
          .volume-range-input { display: none; }
          .player-headline { font-size: 0.78rem; }
          .ambient-pill-label { display: none; }
          .player-ambient-pill { padding: 6px; }
          .player-center-gold-orb { width: 56px; height: 56px; }
        }
      `}</style>
    </div>
  );
};

export default LuxuryAmbientVideoPlayer;
