'use client';
import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {AnimatePresence, motion} from 'framer-motion';
import {ChevronLeft, ChevronRight, Play, ShieldCheck, X} from 'lucide-react';
import {parseVideoUrl, type LuxuryVideoItem} from '../video/LuxuryAmbientVideoPlayer';
import './GalleryLightbox.css';

interface Props {
 images: string[]; videos?: LuxuryVideoItem[]; title: string; estateName?: string; district?: string;
 isAr: boolean; index: number; onIndexChange: (index: number) => void; onClose: () => void;
}
export default function GalleryLightbox({images, videos = [], title, estateName, district, isAr, index: activeImageIndex, onIndexChange, onClose}: Props) {
 const media = [...images.map(url => ({url, thumbnail:url, video:false, title})), ...videos.map(video=>({url:video.url, thumbnail:video.thumbnail || parseVideoUrl(video.url).thumbnail || '', video:true, title:isAr ? video.title_ar || video.title_en : video.title_en || video.title_ar}))];
 const property = {images: media.map(item=>item.thumbnail), title, estateName, district};
 const [zoomedImage, setZoomedImage] = useState<string | null>(null);
 const lightboxTouchX = useRef<number | null>(null);
 const dialogRef = useRef<HTMLDivElement>(null);
 const goToImage = (idx:number) => onIndexChange(((idx % media.length) + media.length) % media.length);
  // Pinch-zoom / pan state for the fullscreen single-image view
  const [zoomView, setZoomView] = useState({ scale: 1, x: 0, y: 0 });
  const zoomGesture = useRef({
    mode: 'none' as 'none' | 'pinch' | 'pan',
    startDist: 0,
    startScale: 1,
    startTouchX: 0,
    startTouchY: 0,
    startX: 0,
    startY: 0,
    moved: false,
    lastTap: 0,
  });

  const openZoom = (url: string) => {
    setZoomView({ scale: 1, x: 0, y: 0 });
    setZoomedImage(url);
  };

  const handleZoomTouchStart = (e: React.TouchEvent) => {
    const g = zoomGesture.current;
    g.moved = false;
    if (e.touches.length === 2) {
      g.mode = 'pinch';
      g.startDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      g.startScale = zoomView.scale;
    } else if (e.touches.length === 1 && zoomView.scale > 1) {
      g.mode = 'pan';
      g.startTouchX = e.touches[0].clientX;
      g.startTouchY = e.touches[0].clientY;
      g.startX = zoomView.x;
      g.startY = zoomView.y;
    } else {
      g.mode = 'none';
    }
  };

  const handleZoomTouchMove = (e: React.TouchEvent) => {
    const g = zoomGesture.current;
    if (g.mode === 'pinch' && e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = Math.min(4, Math.max(1, g.startScale * (dist / g.startDist)));
      g.moved = true;
      setZoomView((v) => (scale === 1 ? { scale: 1, x: 0, y: 0 } : { ...v, scale }));
    } else if (g.mode === 'pan' && e.touches.length === 1) {
      const dx = e.touches[0].clientX - g.startTouchX;
      const dy = e.touches[0].clientY - g.startTouchY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) g.moved = true;
      const limit = (zoomView.scale - 1) * 400;
      setZoomView((v) => ({
        ...v,
        x: Math.min(limit, Math.max(-limit, g.startX + dx)),
        y: Math.min(limit, Math.max(-limit, g.startY + dy)),
      }));
    }
  };

  const handleZoomTouchEnd = (e: React.TouchEvent) => {
    const g = zoomGesture.current;
    if (e.touches.length > 0) return;
    if (!g.moved && g.mode !== 'pinch') {
      const now = Date.now();
      if (now - g.lastTap < 300) {
        // Double tap: toggle zoom
        setZoomView((v) => (v.scale > 1 ? { scale: 1, x: 0, y: 0 } : { ...v, scale: 2.5 }));
        g.lastTap = 0;
      } else {
        g.lastTap = now;
        // Single tap at rest closes back to the lightbox
        if (zoomView.scale === 1) {
          setTimeout(() => {
            if (Date.now() - zoomGesture.current.lastTap >= 280 && zoomGesture.current.lastTap !== 0) {
              setZoomedImage(null);
              zoomGesture.current.lastTap = 0;
            }
          }, 300);
        }
      }
    }
    g.mode = 'none';
  };


 const handlers = useRef({onClose, goToImage, activeImageIndex, zoomedImage});
 handlers.current = {onClose, goToImage, activeImageIndex, zoomedImage};
 useEffect(() => {
   const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
   const lenis = window.__masrLenis;
   const restart = lenis && !lenis.isStopped;
   lenis?.stop();
   const savedOverflow = document.body.style.overflow;
   document.body.style.overflow = 'hidden';
   const siblings = Array.from(document.body.children).filter((e): e is HTMLElement => e instanceof HTMLElement && e !== dialogRef.current);
   const inert = siblings.map(element=>({element,value:element.inert}));
   for (const {element} of inert) element.inert = true;
   dialogRef.current?.querySelector<HTMLButtonElement>('.lightbox-close-btn')?.focus({preventScroll:true});
   const keydown = (event:KeyboardEvent) => {
     const current=handlers.current;
     if(event.key === 'Escape') {
       event.preventDefault(); event.stopImmediatePropagation();
       if(current.zoomedImage) setZoomedImage(null); else current.onClose();
     } else if(event.key === 'Tab') {
       const controls=Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), video[controls], [tabindex="0"]') ?? []).filter(e=>e.getClientRects().length>0 && !e.closest('.slot-hidden'));
       const first=controls[0],last=controls[controls.length-1];
       if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}
       else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}
     } else if(event.key==='ArrowRight'||event.key==='ArrowLeft') {
       if(document.activeElement?.tagName==='VIDEO')return;
       event.preventDefault();event.stopImmediatePropagation();current.goToImage(current.activeImageIndex+(event.key==='ArrowRight'?1:-1));
     }
   };
   document.addEventListener('keydown',keydown,true);
   return()=>{
     document.removeEventListener('keydown',keydown,true);
     for(const {element,value} of inert)element.inert=value;
     document.body.style.overflow=savedOverflow;
     if(restart)lenis.start();
     opener?.focus({preventScroll:true});
   };
 }, []);
 return typeof document === 'undefined' ? null : createPortal(
<motion.div 
                className={`lightbox-overlay ${videos.length ? 'zone-media-lightbox' : ''}`}
                ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} data-lenis-prevent
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
              >
                {/* Fullscreen Lightbox Ambient Glow with Smooth Morphing Transition */}
                <AnimatePresence initial={false}>
                  <motion.div 
                    key={activeImageIndex}
                    className="lightbox-ambient-fade-slot"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div 
                      className="lightbox-aurora-mesh mesh-alpha"
                      style={{
                        backgroundImage: `url(${property.images[activeImageIndex] || property.images[0]})`
                      }}
                    />
                    <div 
                      className="lightbox-aurora-mesh mesh-beta"
                      style={{
                        backgroundImage: `url(${property.images[activeImageIndex] || property.images[0]})`
                      }}
                    />
                  </motion.div>
                </AnimatePresence>

                <div
                  className="lightbox-carousel-stage"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Tapping the empty/blurred stage area exits fullscreen
                    if (e.target === e.currentTarget) onClose();
                  }}
                >
                  
                  {/* Floating Top Header Bar */}
                  <div className="lightbox-top-bar">
                    <div className="lightbox-top-left">
                      <span className="lightbox-dossier-tag">
                        <ShieldCheck size={14} className="tag-gold-icon" />
                        <span>{videos.length ? (isAr ? 'الصور والفيديو' : 'PHOTOS & VIDEO') : (isAr ? 'صور العقار' : 'PROPERTY PHOTOS')}</span>
                      </span>
                      <span className="lightbox-counter-pill" dir="ltr">
                        <span data-media-counter className="tabular-nums">{activeImageIndex + 1} / {property.images.length}</span>
                      </span>
                    </div>

                    <div className="lightbox-top-right">
                      <button 
                        className="lightbox-close-btn" 
                        onClick={onClose}
                        type="button"
                        title={isAr ? 'إغلاق (Esc)' : 'Close (Esc)'}
                      >
                        <X size={18} />
                        <span>{isAr ? 'إغلاق' : 'Close'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Flat Clean Carousel Cards Deck (swipeable on touch) */}
                  <div
                    className="lightbox-deck-container"
                    onClick={(e) => {
                      if (e.target === e.currentTarget) onClose();
                    }}
                    onTouchStart={(e) => {
                      if (e.target instanceof Element && e.target.closest('video, iframe')) {
                        lightboxTouchX.current = null;
                        return;
                      }
                      lightboxTouchX.current = e.touches[0].clientX;
                    }}
                    onTouchEnd={(e) => {
                      if (lightboxTouchX.current === null) return;
                      const delta = e.changedTouches[0].clientX - lightboxTouchX.current;
                      lightboxTouchX.current = null;
                      if (Math.abs(delta) < 48) return;
                      // Swipe left reveals the card on the right, and vice versa
                      if (delta < 0) goToImage(activeImageIndex + 1);
                      else goToImage(activeImageIndex - 1);
                    }}
                  >
                    {property.images.map((imgUrl, idx) => {
                      const total = property.images.length;
                      let diff = idx - activeImageIndex;
                      if (diff > total / 2) diff -= total;
                      if (diff < -total / 2) diff += total;

                      const isCenter = diff === 0;
                      const isPrev = diff === -1;
                      const isNext = diff === 1;
                      const isVisible = Math.abs(diff) <= 1;

                      return (
                        <motion.div
                          key={idx}
                          className={`carousel-card-slot ${isCenter ? 'slot-center' : isPrev ? 'slot-prev' : isNext ? 'slot-next' : 'slot-hidden'}`}
                          animate={{
                            x: diff === 0 ? '0%' : diff === -1 ? '-70%' : diff === 1 ? '70%' : diff < -1 ? '-120%' : '120%',
                            scale: isCenter ? 1 : 0.82,
                            opacity: isCenter ? 1 : isVisible ? 0.38 : 0,
                            zIndex: isCenter ? 10 : isVisible ? 4 : 1
                          }}
                          transition={{
                            type: 'spring',
                            stiffness: 260,
                            damping: 28,
                            mass: 0.85
                          }}
                          onClick={() => {
                            if (!isCenter) goToImage(idx);
                            else if (!media[idx].video) openZoom(media[idx].url);
                          }}
                        >
                          {media[idx].video && isCenter ? (() => {
                            const source = parseVideoUrl(media[idx].url);
                            return source.embedUrl ? <iframe className="carousel-card-img" tabIndex={-1} src={source.embedUrl} title={media[idx].title || title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
                              : <video className="carousel-card-img" src={source.url} poster={media[idx].thumbnail} controls playsInline autoPlay />;
                          })() : imgUrl ? <img src={imgUrl} alt={`${property.title} - Plate ${idx + 1}`} className="carousel-card-img" /> : <Play size={36} aria-hidden="true" />}
                        </motion.div>
                      );
                    })}

                    {/* Left & Right Floating Navigation Control Arrows */}
                    <button 
                      className="lightbox-nav-arrow arrow-prev"
                      onClick={() => goToImage(activeImageIndex - 1)}
                      type="button"
                      title="Previous Plate (Left Arrow)"
                    >
                      <ChevronLeft size={22} />
                    </button>

                    <button 
                      className="lightbox-nav-arrow arrow-next"
                      onClick={() => goToImage(activeImageIndex + 1)}
                      type="button"
                      title="Next Plate (Right Arrow)"
                    >
                      <ChevronRight size={22} />
                    </button>
                  </div>

                  {/* Bottom Floating Curated Info & Thumbnail Dock */}
                  <div className="lightbox-bottom-dock">
                    <div className="dock-meta-row">
                      <div className="dock-title-group">
                        <h3 className="dock-property-title">{property.title}</h3>
                        <div className="dock-sub-tags">
                          <span className="dock-estate">{property.estateName}</span>
                          {property.district && property.district !== property.estateName && (
                            <>
                              <span className="dock-dot">•</span>
                              <span className="dock-district">{property.district}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Interactive Thumbnail Navigation Pills */}
                      <div className="dock-thumbnails-row">
                        {property.images.map((thumb, idx) => (
                          <button
                            key={idx}
                            className={`dock-thumb-btn ${activeImageIndex === idx ? 'active' : ''}`}
                            onClick={() => goToImage(idx)}
                            type="button"
                            title={`Jump to Plate ${idx + 1}`}
                          >
                            {thumb ? <img src={thumb} alt={`Thumb ${idx + 1}`} className="dock-thumb-img" /> : <Play size={18} aria-hidden="true" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Single-image fullscreen view: pinch to zoom, drag to pan,
                    double-tap toggles zoom, single tap (unzoomed) returns to lightbox */}
                <AnimatePresence>
                  {zoomedImage && (
                    <motion.div
                      className="lightbox-zoom-layer"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={() =>
                        setZoomView((v) => (v.scale > 1 ? { scale: 1, x: 0, y: 0 } : { ...v, scale: 2.5 }))
                      }
                      onWheel={(e) => {
                        const scale = Math.min(4, Math.max(1, zoomView.scale - e.deltaY * 0.0025));
                        setZoomView((v) => (scale === 1 ? { scale: 1, x: 0, y: 0 } : { ...v, scale }));
                      }}
                      onTouchStart={handleZoomTouchStart}
                      onTouchMove={handleZoomTouchMove}
                      onTouchEnd={handleZoomTouchEnd}
                    >
                      <img
                        src={zoomedImage}
                        alt={property.title}
                        className="lightbox-zoom-img"
                        style={{
                          transform: `translate(${zoomView.x}px, ${zoomView.y}px) scale(${zoomView.scale})`,
                        }}
                        draggable={false}
                      />
                      <button
                        type="button"
                        className="lightbox-zoom-close"
                        onClick={(e) => {
                          e.stopPropagation();
                          setZoomedImage(null);
                        }}
                        aria-label={isAr ? 'العودة للمعرض' : 'Back to gallery'}
                      >
                        <X size={18} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>, document.body);
}
