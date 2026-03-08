"use client";

import Image from "next/image";

interface ObjektImageProps {
  bildUrl?: string | null;
  alt: string;
  className?: string;
  size?: "small" | "medium" | "large";
}

// PropGate Haus-Logo als Fallback
const HausIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    />
  </svg>
);

export function ObjektImage({ bildUrl, alt, className = "", size = "medium" }: ObjektImageProps) {
  const sizeClasses = {
    small: "h-12 w-12",
    medium: "h-20 w-20",
    large: "h-32 w-32",
  };

  const iconSizes = {
    small: "h-6 w-6",
    medium: "h-10 w-10",
    large: "h-16 w-16",
  };

  const baseClasses = `${sizeClasses[size]} rounded-xl overflow-hidden ${className}`;

  if (bildUrl) {
    return (
      <div className={`${baseClasses} relative`}>
        <Image
          src={bildUrl}
          alt={alt}
          fill
          className="object-cover"
          unoptimized
        />
      </div>
    );
  }

  // Fallback: PropGate Haus-Icon (wie in der Sidebar)
  return (
    <div className={`${baseClasses} flex items-center justify-center bg-[var(--bg-card-hover)] border-2 border-[var(--border)] shadow-sm`}>
      <HausIcon className={`${iconSizes[size]} text-blue-400`} />
    </div>
  );
}
