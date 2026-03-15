interface NavIconProps {
  active: boolean;
}

export function HomeIcon({ active }: NavIconProps) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <path
        d="M4 11.5L13 4L22 11.5V21C22 21.55 21.55 22 21 22H5C4.45 22 4 21.55 4 21V11.5Z"
        fill={active ? "var(--warm-accent)" : "none"}
        stroke={active ? "var(--warm-accent)" : "var(--warm-text-light)"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 22V14H16V22"
        stroke={active ? "#fff" : "var(--warm-text-light)"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RoomsIcon({ active }: NavIconProps) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <rect
        x="3" y="3" width="8.5" height="8.5" rx="3"
        fill={active ? "var(--warm-accent)" : "none"}
        stroke={active ? "var(--warm-accent)" : "var(--warm-text-light)"}
        strokeWidth="2"
      />
      <rect
        x="14.5" y="3" width="8.5" height="8.5" rx="3"
        fill={active ? "#F9731666" : "none"}
        stroke={active ? "var(--warm-accent)" : "var(--warm-text-light)"}
        strokeWidth="2"
      />
      <rect
        x="3" y="14.5" width="8.5" height="8.5" rx="3"
        fill={active ? "#F9731666" : "none"}
        stroke={active ? "var(--warm-accent)" : "var(--warm-text-light)"}
        strokeWidth="2"
      />
      <rect
        x="14.5" y="14.5" width="8.5" height="8.5" rx="3"
        fill={active ? "#F9731644" : "none"}
        stroke={active ? "var(--warm-accent)" : "var(--warm-text-light)"}
        strokeWidth="2"
      />
    </svg>
  );
}

export function TrophyIcon({ active }: NavIconProps) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <path
        d="M8 4H18V12C18 14.76 15.76 17 13 17C10.24 17 8 14.76 8 12V4Z"
        fill={active ? "var(--warm-accent)" : "none"}
        stroke={active ? "var(--warm-accent)" : "var(--warm-text-light)"}
        strokeWidth="2"
      />
      <path
        d="M8 6H5C5 9 6.5 10 8 10"
        stroke={active ? "var(--warm-accent)" : "var(--warm-text-light)"}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M18 6H21C21 9 19.5 10 18 10"
        stroke={active ? "var(--warm-accent)" : "var(--warm-text-light)"}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10 22H16"
        stroke={active ? "var(--warm-accent)" : "var(--warm-text-light)"}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M13 17V22"
        stroke={active ? "var(--warm-accent)" : "var(--warm-text-light)"}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CalendarIcon({ active }: NavIconProps) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <rect
        x="3" y="5" width="20" height="18" rx="3"
        fill={active ? "var(--warm-accent)" : "none"}
        stroke={active ? "var(--warm-accent)" : "var(--warm-text-light)"}
        strokeWidth="2"
      />
      <path
        d="M3 11H23"
        stroke={active ? "#fff" : "var(--warm-text-light)"}
        strokeWidth="2"
      />
      <path
        d="M8 3V7"
        stroke={active ? "var(--warm-accent)" : "var(--warm-text-light)"}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M18 3V7"
        stroke={active ? "var(--warm-accent)" : "var(--warm-text-light)"}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="9" cy="16" r="1.5" fill={active ? "#fff" : "var(--warm-text-light)"} />
      <circle cx="13" cy="16" r="1.5" fill={active ? "#fff" : "var(--warm-text-light)"} />
    </svg>
  );
}

export function ActivityIcon({ active }: NavIconProps) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <rect
        x="4" y="4" width="18" height="18" rx="4"
        fill={active ? "var(--warm-accent)" : "none"}
        stroke={active ? "var(--warm-accent)" : "var(--warm-text-light)"}
        strokeWidth="2"
      />
      <path d="M8 10H18" stroke={active ? "#fff" : "var(--warm-text-light)"} strokeWidth="2" strokeLinecap="round" />
      <path d="M8 14H18" stroke={active ? "#fff" : "var(--warm-text-light)"} strokeWidth="2" strokeLinecap="round" />
      <path d="M8 18H14" stroke={active ? "#fff" : "var(--warm-text-light)"} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function AchievementsIcon({ active }: NavIconProps) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <circle cx="13" cy="11" r="7" fill={active ? "var(--warm-accent)" : "none"} stroke={active ? "var(--warm-accent)" : "var(--warm-text-light)"} strokeWidth="2" />
      <path d="M13 7L14.3 10.2L17.8 10.4L15.1 12.7L16 16.1L13 14.2L10 16.1L10.9 12.7L8.2 10.4L11.7 10.2L13 7Z" fill={active ? "#fff" : "var(--warm-text-light)"} />
      <path d="M10 18L8.5 22L13 20.5L17.5 22L16 18" stroke={active ? "var(--warm-accent)" : "var(--warm-text-light)"} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function SettingsIcon({ active }: NavIconProps) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <circle
        cx="13" cy="13" r="4"
        fill={active ? "var(--warm-accent)" : "none"}
        stroke={active ? "var(--warm-accent)" : "var(--warm-text-light)"}
        strokeWidth="2"
      />
      <path
        d="M13 3V5M13 21V23M3 13H5M21 13H23M5.6 5.6L7 7M19 19L20.4 20.4M20.4 5.6L19 7M7 19L5.6 20.4"
        stroke={active ? "var(--warm-accent)" : "var(--warm-text-light)"}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function RewardsIcon({ active }: NavIconProps) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <rect
        x="4" y="8" width="18" height="12" rx="3"
        fill={active ? "var(--warm-accent)" : "none"}
        stroke={active ? "var(--warm-accent)" : "var(--warm-text-light)"}
        strokeWidth="2"
      />
      <path d="M4 12H22" stroke={active ? "#fff" : "var(--warm-text-light)"} strokeWidth="2" />
      <circle cx="13" cy="14.5" r="1.8" fill={active ? "#fff" : "var(--warm-text-light)"} />
      <path d="M8 8C8 6.5 9.2 5.5 10.6 5.8C11.8 6 12.4 7 13 8" stroke={active ? "var(--warm-accent)" : "var(--warm-text-light)"} strokeWidth="2" strokeLinecap="round" />
      <path d="M18 8C18 6.5 16.8 5.5 15.4 5.8C14.2 6 13.6 7 13 8" stroke={active ? "var(--warm-accent)" : "var(--warm-text-light)"} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
