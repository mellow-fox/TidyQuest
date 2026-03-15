import React from 'react';
import { getHealthColor } from '../../utils/health';

interface RingGaugeProps {
  value: number;
  size?: number;
  strokeWidth?: number;
}

const RingGauge: React.FC<RingGaugeProps> = ({
  value,
  size = 140,
  strokeWidth = 12,
}) => {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = getHealthColor(value);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--warm-border-subtle)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition:
              'stroke-dashoffset 1s cubic-bezier(.4,2,.6,1), stroke 0.5s ease',
          }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 800,
            color,
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--warm-text-light)',
            fontWeight: 600,
            marginTop: 2,
          }}
        >
          / 100
        </div>
      </div>
    </div>
  );
};

export { RingGauge };
export default RingGauge;
