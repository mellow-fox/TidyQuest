import React from 'react';

interface EffortDotsProps {
  effort: number;
}

const FilledStar: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path
      d="M7 1L8.5 5H12.5L9.5 7.5L10.5 11.5L7 9L3.5 11.5L4.5 7.5L1.5 5H5.5L7 1Z"
      fill="var(--warm-coin)"
      stroke="var(--warm-coin)"
      strokeWidth="0.5"
    />
  </svg>
);

const EmptyStar: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path
      d="M7 1L8.5 5H12.5L9.5 7.5L10.5 11.5L7 9L3.5 11.5L4.5 7.5L1.5 5H5.5L7 1Z"
      fill="none"
      stroke="var(--warm-border)"
      strokeWidth="1"
    />
  </svg>
);

const EffortDots: React.FC<EffortDotsProps> = ({ effort }) => (
  <div style={{ display: 'flex', gap: 1 }}>
    {Array.from({ length: 5 }, (_, i) => (
      <span key={i}>{i < effort ? <FilledStar /> : <EmptyStar />}</span>
    ))}
  </div>
);

export { EffortDots };
export default EffortDots;
