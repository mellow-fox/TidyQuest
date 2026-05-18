/// <reference types="react" />

type PresetComponent = (props: PresetProps) => any;

interface PresetProps {
  size?: number;
}

function CyberKnight({ size = 38 }: PresetProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="40" fill="#3B4A67" />
      <path d="M18 50 C18 30 32 20 50 20 C68 20 82 30 82 50 C82 70 68 80 50 80 C32 80 18 70 18 50 Z" fill="#1F2A40" />
      <rect x="24" y="42" width="52" height="18" rx="9" fill="#54D1FF" />
      <rect x="30" y="46" width="12" height="10" rx="4" fill="#0F2130" />
      <rect x="58" y="46" width="12" height="10" rx="4" fill="#0F2130" />
      <path d="M40 30 L50 18 L60 30" fill="#A6D8FF" />
      <path d="M32 52 L68 52" stroke="#0F2130" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function NeonRogue({ size = 38 }: PresetProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="40" fill="#2F1B44" />
      <path d="M20 45 Q50 10 80 45 V84 H20 Z" fill="#3F2B6B" />
      <path d="M25 46 C38 30 62 30 75 46" fill="#FB63F4" opacity="0.35" />
      <path d="M30 58 C40 50 60 50 70 58" stroke="#FF97F9" strokeWidth="4" strokeLinecap="round" />
      <circle cx="36" cy="62" r="5" fill="#FFD6F1" />
      <circle cx="64" cy="62" r="5" fill="#FFD6F1" />
      <line x1="43" y1="75" x2="57" y2="75" stroke="#FF97F9" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function ArcadePilot({ size = 38 }: PresetProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="40" fill="#1F2937" />
      <g fill="#7C3AED">
        <ellipse cx="50" cy="42" rx="30" ry="16" />
        <rect x="30" y="46" width="40" height="20" rx="10" />
      </g>
      <circle cx="38" cy="45" r="5" fill="#E0E7FF" />
      <circle cx="62" cy="45" r="5" fill="#E0E7FF" />
      <path d="M32 58 L68 58" stroke="#FDE68A" strokeWidth="6" strokeLinecap="round" />
      <path d="M23 72 Q30 64 32 72" stroke="#E0E7FF" strokeWidth="5" fill="none" />
      <path d="M77 72 Q70 64 68 72" stroke="#E0E7FF" strokeWidth="5" fill="none" />
      <rect x="44" y="60" width="12" height="6" rx="3" fill="#F97316" />
    </svg>
  );
}

function StarGamer({ size = 38 }: PresetProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="40" fill="#181A2D" />
      <path d="M50 20 L61 42 H85 L65 57 L73 80 L50 67 L27 80 L35 57 L15 42 H39 L50 20 Z" fill="#FACC15" />
      <rect x="34" y="54" width="32" height="16" rx="8" fill="#0F172A" />
      <circle cx="42" cy="62" r="4" fill="#60A5FA" />
      <circle cx="58" cy="62" r="4" fill="#60A5FA" />
      <path d="M50 56 L50 70" stroke="#93C5FD" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function PinkMage({ size = 38 }: PresetProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="52" r="38" fill="#FBCFE8" />
      <path d="M30 42 Q50 10 70 42 V85 H30 Z" fill="#F472B6" />
      <path d="M40 40 C45 30 55 30 60 40" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
      <circle cx="37" cy="58" r="5" fill="#6D28D9" />
      <circle cx="63" cy="58" r="5" fill="#6D28D9" />
      <path d="M44 73 Q50 80 56 73" stroke="#7C3AED" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M29 45 L71 25" stroke="#FDE68A" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function GlitterPrincess({ size = 38 }: PresetProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="38" fill="#FDE68A" />
      <path d="M22 45 L30 24 L42 40 L50 20 L58 40 L70 24 L78 45 L50 60 Z" fill="#F472B6" />
      <circle cx="50" cy="45" r="10" fill="#FFFFFF" />
      <path d="M50 56 Q45 66 50 70 Q55 66 50 56" fill="#FCA5A5" />
      <path d="M38 28 L42 20 M58 28 L62 20" stroke="#FFF7ED" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function PastelSiren({ size = 38 }: PresetProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="54" r="38" fill="#C4B5FD" />
      <path d="M28 40 C30 18 70 18 72 40 C72 52 67 60 50 60 C33 60 28 52 28 40 Z" fill="#A78BFA" />
      <path d="M32 70 C40 78 60 78 68 70" stroke="#FDE68A" strokeWidth="6" strokeLinecap="round" />
      <circle cx="38" cy="52" r="4" fill="#111827" />
      <circle cx="62" cy="52" r="4" fill="#111827" />
      <circle cx="36" cy="50" r="1.5" fill="#FFFFFF" />
      <circle cx="64" cy="50" r="1.5" fill="#FFFFFF" />
    </svg>
  );
}

function YellowCockatiel({ size = 38 }: PresetProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="52" r="38" fill="#FDE047" />
      <path d="M30 32 C35 10 65 10 70 32 C72 42 70 54 60 60 C55 64 45 64 40 60 C30 54 28 42 30 32 Z" fill="#FBBF24" />
      <circle cx="38" cy="54" r="5" fill="#111827" />
      <circle cx="62" cy="54" r="5" fill="#111827" />
      <circle cx="39" cy="52" r="1.5" fill="#FFFFFF" />
      <circle cx="63" cy="52" r="1.5" fill="#FFFFFF" />
      <path d="M45 68 L55 68 L50 72 Z" fill="#F97316" />
      <path d="M42 28 L35 14 L48 22" fill="#FBBF24" />
      <path d="M58 28 L65 14 L52 22" fill="#FBBF24" />
    </svg>
  );
}

function PixelKnight({ size = 38 }: PresetProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <rect x="18" y="22" width="64" height="56" fill="#0F172A" rx="8" />
      <rect x="26" y="30" width="48" height="12" fill="#64748B" />
      <rect x="32" y="46" width="12" height="12" fill="#F97316" />
      <rect x="56" y="46" width="12" height="12" fill="#F97316" />
      <rect x="38" y="62" width="24" height="10" fill="#94A3B8" />
      <rect x="42" y="34" width="16" height="4" fill="#E2E8F0" />
      <rect x="50" y="34" width="4" height="16" fill="#E2E8F0" />
    </svg>
  );
}

function PixelMage({ size = 38 }: PresetProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <rect x="20" y="20" width="60" height="20" fill="#8B5CF6" rx="6" />
      <rect x="32" y="42" width="36" height="20" fill="#A78BFA" rx="4" />
      <rect x="40" y="64" width="20" height="12" fill="#FDE68A" rx="3" />
      <rect x="54" y="70" width="10" height="10" fill="#F97316" />
      <rect x="23" y="52" width="12" height="8" fill="#7C3AED" />
      <rect x="66" y="52" width="12" height="8" fill="#7C3AED" />
    </svg>
  );
}

function PixelGamer({ size = 38 }: PresetProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <rect x="18" y="22" width="64" height="56" fill="#111827" rx="10" />
      <rect x="28" y="34" width="44" height="8" fill="#3B82F6" rx="4" />
      <rect x="28" y="50" width="10" height="10" fill="#FBBF24" />
      <rect x="46" y="50" width="8" height="10" fill="#F97316" />
      <rect x="60" y="50" width="10" height="10" fill="#34D399" />
      <rect x="40" y="30" width="20" height="10" fill="#E5E7EB" rx="3" />
      <rect x="22" y="68" width="56" height="8" fill="#64748B" rx="4" />
    </svg>
  );
}

export const AVATAR_PRESETS: Record<string, { component: PresetComponent; label: string; color: string }> = {
  cyberKnight: { component: CyberKnight, label: 'Cyber Knight', color: '#54D1FF' },
  neonRogue: { component: NeonRogue, label: 'Neon Rogue', color: '#F472B6' },
  arcadePilot: { component: ArcadePilot, label: 'Arcade Pilot', color: '#7C3AED' },
  starGamer: { component: StarGamer, label: 'Star Gamer', color: '#FACC15' },
  pinkMage: { component: PinkMage, label: 'Pink Mage', color: '#F472B6' },
  glitterPrincess: { component: GlitterPrincess, label: 'Glitter Princess', color: '#FDE68A' },
  pastelSiren: { component: PastelSiren, label: 'Pastel Siren', color: '#A78BFA' },
  yellowCockatiel: { component: YellowCockatiel, label: 'Yellow Cockatiel', color: '#FDE047' },
  pixelKnight: { component: PixelKnight, label: 'Pixel Knight', color: '#94A3B8' },
  pixelMage: { component: PixelMage, label: 'Pixel Mage', color: '#8B5CF6' },
  pixelGamer: { component: PixelGamer, label: 'Pixel Gamer', color: '#3B82F6' },
};

export function AvatarPresetIcon({ presetId, size = 38 }: { presetId: string; size?: number }) {
  const preset = AVATAR_PRESETS[presetId];
  if (!preset) return null;
  const Component = preset.component;
  return <Component size={size} />;
}
