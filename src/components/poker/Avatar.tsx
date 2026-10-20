import React from 'react';

interface AvatarProps {
  seed: string;
  className?: string;
  isHero?: boolean;
  bg?: string;
}

export function Avatar({ seed, className = 'w-12 h-12', isHero = false, bg }: AvatarProps) {
  if (isHero) {
    return (
      <div
        className={`relative rounded-full overflow-hidden flex items-center justify-center border-2 border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)] bg-gradient-to-br from-emerald-600 via-teal-800 to-slate-900 ${className}`}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Hero clean styling: visor / cap / sharp jaw */}
          <circle cx="50" cy="50" r="48" fill="none" stroke="#34d399" strokeWidth="2" opacity="0.3" />
          <circle cx="50" cy="38" r="20" fill="#fbcfe8" />
          {/* Hair / Cap */}
          <path d="M26 36 C26 22, 74 22, 74 36 C74 24, 26 24, 26 36 Z" fill="#047857" />
          <path d="M20 34 Q50 20 80 34 Q50 30 20 34" fill="#065f46" />
          {/* Eyes & Shades */}
          <rect x="34" y="34" width="14" height="7" rx="2" fill="#0f172a" />
          <rect x="52" y="34" width="14" height="7" rx="2" fill="#0f172a" />
          <line x1="48" y1="37" x2="52" y2="37" stroke="#0f172a" strokeWidth="2" />
          {/* Smile */}
          <path d="M44 48 Q50 53 56 48" stroke="#9d174d" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Torso Hoodie */}
          <path d="M22 100 C22 66, 78 66, 78 100 Z" fill="#065f46" />
          <path d="M40 70 L50 85 L60 70" stroke="#34d399" strokeWidth="2" fill="none" />
        </svg>
      </div>
    );
  }

  // 8 Personas SVG variations based on seed
  switch (seed) {
    case 'mike': // Big Mike: Friendly, bearded, cap
      return (
        <div className={`relative rounded-full overflow-hidden flex items-center justify-center border-2 border-blue-400/60 shadow-md ${className}`} style={{ backgroundColor: bg || '#1e3a8a' }}>
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="40" r="22" fill="#fed7aa" />
            {/* Baseball cap */}
            <path d="M25 36 C25 18, 75 18, 75 36 Z" fill="#1d4ed8" />
            <path d="M20 36 C45 32, 65 32, 85 40 Q50 34 20 36" fill="#1e40af" />
            {/* Eyes */}
            <circle cx="42" cy="38" r="2.5" fill="#1e293b" />
            <circle cx="58" cy="38" r="2.5" fill="#1e293b" />
            {/* Beard */}
            <path d="M34 46 C34 62, 66 62, 66 46 Q50 56 34 46" fill="#92400e" />
            <path d="M45 50 Q50 54 55 50" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            {/* Body */}
            <path d="M18 100 C18 68, 82 68, 82 100 Z" fill="#2563eb" />
          </svg>
        </div>
      );

    case 'vic': // Vegas Vic: Tinted aviator sunglasses, bald with grey sideburns, gold chain
      return (
        <div className={`relative rounded-full overflow-hidden flex items-center justify-center border-2 border-amber-400/60 shadow-md ${className}`} style={{ backgroundColor: bg || '#374151' }}>
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="40" r="21" fill="#fde68a" />
            {/* Grey hair sides */}
            <path d="M28 32 C26 44, 30 52, 33 52" stroke="#9ca3af" strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d="M72 32 C74 44, 70 52, 67 52" stroke="#9ca3af" strokeWidth="5" fill="none" strokeLinecap="round" />
            {/* Aviators */}
            <path d="M34 35 L48 35 L46 45 L36 45 Z" fill="#b45309" stroke="#f59e0b" strokeWidth="1.5" />
            <path d="M52 35 L66 35 L64 45 L54 45 Z" fill="#b45309" stroke="#f59e0b" strokeWidth="1.5" />
            <line x1="48" y1="36" x2="52" y2="36" stroke="#f59e0b" strokeWidth="2" />
            {/* Thin stern mouth */}
            <line x1="44" y1="52" x2="56" y2="52" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
            {/* Hawaiian shirt */}
            <path d="M18 100 C18 68, 82 68, 82 100 Z" fill="#b91c1c" />
            <circle cx="50" cy="74" r="3" fill="#fef08a" />
          </svg>
        </div>
      );

    case 'danny': // Mad Dog Danny: Wild hair, manic grin, bandana
      return (
        <div className={`relative rounded-full overflow-hidden flex items-center justify-center border-2 border-red-500/70 shadow-md ${className}`} style={{ backgroundColor: bg || '#7f1d1d' }}>
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Wild Spiky hair */}
            <path d="M24 35 L30 18 L38 28 L50 14 L62 26 L70 16 L76 34" stroke="#18181b" strokeWidth="6" strokeLinejoin="round" fill="none" />
            <circle cx="50" cy="40" r="20" fill="#fbcfe8" />
            {/* Red Bandana */}
            <path d="M28 28 Q50 22 72 28 L74 34 Q50 28 26 34 Z" fill="#dc2626" />
            {/* Wide Eyes */}
            <circle cx="42" cy="38" r="4.5" fill="#fff" />
            <circle cx="43" cy="38" r="2" fill="#b91c1c" />
            <circle cx="58" cy="38" r="4.5" fill="#fff" />
            <circle cx="57" cy="38" r="2" fill="#b91c1c" />
            {/* Big Grin */}
            <path d="M40 48 Q50 60 60 48 Z" fill="#ffffff" stroke="#991b1b" strokeWidth="1.5" />
            {/* Body Tank Top */}
            <path d="M20 100 C20 68, 80 68, 80 100 Z" fill="#18181b" />
          </svg>
        </div>
      );

    case 'sophia': // Sophia Chen: Sleek ponytail, stylish modern glasses, blazer
      return (
        <div className={`relative rounded-full overflow-hidden flex items-center justify-center border-2 border-emerald-400/60 shadow-md ${className}`} style={{ backgroundColor: bg || '#064e3b' }}>
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* High ponytail */}
            <path d="M68 25 C82 30, 84 50, 80 65" stroke="#172554" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="50" cy="40" r="20" fill="#fed7aa" />
            {/* Dark sleek hair */}
            <path d="M28 36 C34 22, 66 22, 72 36 C64 25, 36 25, 28 36 Z" fill="#0f172a" />
            {/* Round stylish glasses */}
            <circle cx="42" cy="38" r="6" fill="none" stroke="#10b981" strokeWidth="2" />
            <circle cx="58" cy="38" r="6" fill="none" stroke="#10b981" strokeWidth="2" />
            <line x1="48" y1="38" x2="52" y2="38" stroke="#10b981" strokeWidth="2" />
            <circle cx="42" cy="38" r="2" fill="#0f172a" />
            <circle cx="58" cy="38" r="2" fill="#0f172a" />
            {/* Focused smile */}
            <path d="M45 50 Q50 53 55 50" stroke="#be123c" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            {/* Emerald Blazer */}
            <path d="M18 100 C18 68, 82 68, 82 100 Z" fill="#047857" />
            <polygon points="50,75 42,95 58,95" fill="#f8fafc" />
          </svg>
        </div>
      );

    case 'larry': // Lucky Larry: Bucket hat, sunglasses on head, grin
      return (
        <div className={`relative rounded-full overflow-hidden flex items-center justify-center border-2 border-amber-500/60 shadow-md ${className}`} style={{ backgroundColor: bg || '#78350f' }}>
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="42" r="20" fill="#fed7aa" />
            {/* Bucket hat */}
            <path d="M30 30 L36 16 L64 16 L70 30 Z" fill="#f59e0b" />
            <path d="M22 30 Q50 25 78 30 Q50 33 22 30 Z" fill="#d97706" />
            {/* Cheerful eyes */}
            <path d="M38 40 Q43 36 46 40" stroke="#451a03" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M54 40 Q59 36 62 40" stroke="#451a03" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* Big friendly grin */}
            <path d="M42 50 Q50 58 58 50 Z" fill="#fff" stroke="#92400e" strokeWidth="1.5" />
            {/* Shirt */}
            <path d="M18 100 C18 68, 82 68, 82 100 Z" fill="#ea580c" />
          </svg>
        </div>
      );

    case 'igor': // Ice Cold Igor: Hooded sweatshirt, massive headphones, stoic
      return (
        <div className={`relative rounded-full overflow-hidden flex items-center justify-center border-2 border-slate-500/60 shadow-md ${className}`} style={{ backgroundColor: bg || '#1e293b' }}>
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Hoodie shroud */}
            <path d="M20 100 C16 48, 28 20, 50 20 C72 20, 84 48, 80 100 Z" fill="#334155" />
            {/* Inner face in shadow */}
            <circle cx="50" cy="44" r="18" fill="#e2e8f0" />
            {/* Shadow under hood */}
            <path d="M32 36 Q50 28 68 36 Q50 34 32 36" fill="#1e293b" />
            {/* Heavy headphones */}
            <rect x="22" y="38" width="8" height="16" rx="3" fill="#0f172a" />
            <rect x="70" y="38" width="8" height="16" rx="3" fill="#0f172a" />
            <path d="M26 38 C28 16, 72 16, 74 38" stroke="#0f172a" strokeWidth="4" fill="none" />
            {/* Unblinking cold eyes */}
            <circle cx="43" cy="42" r="2" fill="#0f172a" />
            <circle cx="57" cy="42" r="2" fill="#0f172a" />
            <line x1="44" y1="53" x2="56" y2="53" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      );

    case 'tony': // Tony Two-Times: Fedora tilt, cigar, smirk
      return (
        <div className={`relative rounded-full overflow-hidden flex items-center justify-center border-2 border-purple-500/60 shadow-md ${className}`} style={{ backgroundColor: bg || '#4c1d95' }}>
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="42" r="21" fill="#fed7aa" />
            {/* Fedora Hat */}
            <ellipse cx="50" cy="28" rx="32" ry="7" fill="#2e1065" />
            <path d="M30 28 L34 14 L66 14 L70 28 Z" fill="#3b0764" />
            <rect x="34" y="24" width="32" height="4" fill="#a855f7" />
            {/* Smug eyebrows */}
            <line x1="36" y1="36" x2="46" y2="39" stroke="#1e1b4b" strokeWidth="2" strokeLinecap="round" />
            <line x1="54" y1="37" x2="64" y2="35" stroke="#1e1b4b" strokeWidth="2" strokeLinecap="round" />
            <circle cx="42" cy="41" r="2" fill="#1e1b4b" />
            <circle cx="58" cy="41" r="2" fill="#1e1b4b" />
            {/* Cigar in mouth */}
            <rect x="56" y="52" width="16" height="4" rx="1" fill="#78350f" transform="rotate(-15, 56, 52)" />
            <circle cx="72" cy="48" r="2" fill="#ef4444" />
            {/* Pinstripe suit */}
            <path d="M18 100 C18 68, 82 68, 82 100 Z" fill="#1e1b4b" />
            <line x1="42" y1="75" x2="42" y2="100" stroke="#a855f7" strokeWidth="1" opacity="0.4" />
            <line x1="58" y1="75" x2="58" y2="100" stroke="#a855f7" strokeWidth="1" opacity="0.4" />
          </svg>
        </div>
      );

    case 'sarah': // Sarah The Shark: Sleek headphones, laser focus
    default:
      return (
        <div className={`relative rounded-full overflow-hidden flex items-center justify-center border-2 border-teal-400/60 shadow-md ${className}`} style={{ backgroundColor: bg || '#0f766e' }}>
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="40" r="20" fill="#fde68a" />
            {/* Modern bob hair */}
            <path d="M26 40 C26 20, 74 20, 74 40 C74 55, 68 62, 66 62 C60 50, 70 34, 50 30 C30 34, 40 50, 34 62 C32 62, 26 55, 26 40 Z" fill="#042f2e" />
            {/* Wireless earbuds */}
            <circle cx="30" cy="44" r="3" fill="#14b8a6" />
            <circle cx="70" cy="44" r="3" fill="#14b8a6" />
            {/* Sharp cat-eye look */}
            <path d="M36 38 Q42 35 46 39" stroke="#042f2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M54 39 Q58 35 64 38" stroke="#042f2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <circle cx="41" cy="40" r="2" fill="#042f2e" />
            <circle cx="59" cy="40" r="2" fill="#042f2e" />
            {/* Calm confident smirk */}
            <path d="M46 50 Q52 54 56 49" stroke="#991b1b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            {/* Teal sports hoodie */}
            <path d="M18 100 C18 68, 82 68, 82 100 Z" fill="#115e59" />
          </svg>
        </div>
      );
  }
}
