import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Building2 } from 'lucide-react';

export interface MediaItem {
  url: string;
  kind: 'image' | 'video';
}

/** Tinder-style gallery: swipe (touch/trackpad), tap the arrows, or use the keyboard. */
export default function MediaCarousel({ media, alt }: { media: MediaItem[]; alt: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    scroller.current?.scrollTo({ left: 0 });
  }, [media]);

  // Only the visible slide's video may play.
  useEffect(() => {
    scroller.current?.querySelectorAll('video').forEach((v, i) => {
      if (v.dataset.slide !== String(index)) v.pause();
    });
  }, [index]);

  if (media.length === 0) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-neutral-900 via-neutral-900 to-black flex items-center justify-center">
        <Building2 className="w-20 h-20 text-neutral-700" />
      </div>
    );
  }

  const goTo = (i: number) => {
    const el = scroller.current;
    if (!el) return;
    const next = Math.max(0, Math.min(media.length - 1, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
  };

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  };

  return (
    <div
      className="relative w-full h-full bg-black select-none"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') goTo(index + 1);
        if (e.key === 'ArrowLeft') goTo(index - 1);
      }}
    >
      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex w-full h-full overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {media.map((m, i) => (
          <div key={m.url} className="w-full h-full shrink-0 snap-center flex items-center justify-center bg-black">
            {m.kind === 'video' ? (
              <video
                data-slide={i}
                src={m.url}
                controls
                playsInline
                preload="metadata"
                className="w-full h-full object-contain"
              />
            ) : (
              <img
                src={m.url}
                alt={`${alt} ${i + 1}`}
                loading={i === 0 ? 'eager' : 'lazy'}
                draggable={false}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        ))}
      </div>

      {media.length > 1 && (
        <>
          {/* progress bars, like Tinder */}
          <div className="absolute top-2 inset-x-3 flex gap-1 pointer-events-none">
            {media.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i === index ? 'bg-white' : 'bg-white/35'}`} />
            ))}
          </div>

          {index > 0 && (
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              aria-label="Previous"
              className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {index < media.length - 1 && (
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              aria-label="Next"
              className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          <div className="absolute bottom-2 right-3 text-[11px] font-semibold text-white bg-black/50 rounded-full px-2 py-0.5 pointer-events-none">
            {index + 1} / {media.length}
          </div>
        </>
      )}
    </div>
  );
}
