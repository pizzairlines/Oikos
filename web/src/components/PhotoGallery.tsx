"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoGalleryProps {
  photos: string[];
  title: string;
}

export function PhotoGallery({ photos, title }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const goNext = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % photos.length);
  }, [lightboxIndex, photos.length]);

  const goPrev = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length);
  }, [lightboxIndex, photos.length]);

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [lightboxIndex, goNext, goPrev]);

  if (!photos || photos.length === 0) return null;

  return (
    <>
      {/* Main photo */}
      <div className="mb-5 rounded-2xl overflow-hidden">
        <div
          className="relative w-full h-56 sm:h-72 cursor-pointer group"
          onClick={() => openLightbox(0)}
        >
          <Image
            src={photos[0]}
            alt={title}
            fill
            sizes="672px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            priority
          />
          {photos.length > 1 && (
            <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
              1 / {photos.length}
            </div>
          )}
        </div>

        {/* Thumbnail strip */}
        {photos.length > 1 && (
          <div className="flex gap-1.5 mt-1.5 overflow-x-auto pb-1 snap-x hide-scrollbar">
            {photos.slice(1, 8).map((photo, i) => (
              <div
                key={i}
                className="relative h-16 w-24 flex-shrink-0 rounded-lg overflow-hidden cursor-pointer snap-start opacity-80 hover:opacity-100 transition-opacity"
                onClick={() => openLightbox(i + 1)}
              >
                <Image
                  src={photo}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-cover"
                  loading="lazy"
                />
              </div>
            ))}
            {photos.length > 8 && (
              <div
                className="h-16 w-24 flex-shrink-0 rounded-lg bg-muted flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors snap-start"
                onClick={() => openLightbox(8)}
              >
                <span className="text-xs text-muted-foreground font-medium">
                  +{photos.length - 8}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 z-10 text-white/80 hover:text-white transition-colors p-2"
            onClick={closeLightbox}
          >
            <X className="h-6 w-6" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 text-white/70 text-sm tabular-nums">
            {lightboxIndex + 1} / {photos.length}
          </div>

          {/* Navigation arrows */}
          {photos.length > 1 && (
            <>
              <button
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 text-white/60 hover:text-white transition-colors p-2"
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 text-white/60 hover:text-white transition-colors p-2"
                onClick={(e) => { e.stopPropagation(); goNext(); }}
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}

          {/* Image */}
          <div
            className="relative w-full h-full max-w-4xl max-h-[80vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={photos[lightboxIndex]}
              alt={`${title} - photo ${lightboxIndex + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>

          {/* Thumbnail strip in lightbox */}
          {photos.length > 1 && (
            <div
              className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 px-4 overflow-x-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {photos.map((photo, i) => (
                <button
                  key={i}
                  className={cn(
                    "relative h-10 w-14 flex-shrink-0 rounded overflow-hidden transition-all",
                    i === lightboxIndex
                      ? "ring-2 ring-white opacity-100"
                      : "opacity-50 hover:opacity-80"
                  )}
                  onClick={() => setLightboxIndex(i)}
                >
                  <Image
                    src={photo}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
