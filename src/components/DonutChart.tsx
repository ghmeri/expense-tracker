import React, { useState } from 'react';
import { COLORS, FONT_HEAD, border } from '../theme';

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
  icon?: string;
}

interface Props {
  slices: DonutSlice[];
  /** Texto central superior (p.ej. "Total"). */
  centerLabel?: string;
  /** Valor central, ya formateado (p.ej. "123,45 €"). */
  centerValue?: string;
}

const SIZE = 200;
const STROKE = 34;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP_DEG = 2.2; // separación visual entre segmentos, en grados

/** Donut SVG genérico: segmentos con hueco entre ellos, leyenda con swatch+valor+%, hover con tooltip. */
export default function DonutChart({ slices, centerLabel, centerValue }: Props) {
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  const nonZero = slices.filter(s => s.value > 0);

  if (total <= 0 || nonZero.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: COLORS.mutedLighter, padding: '32px 0', fontSize: 14 }}>
        Sin datos en este período
      </div>
    );
  }

  let cursorDeg = -90; // empieza arriba
  const arcs = nonZero.map(slice => {
    const fraction = slice.value / total;
    const grossDeg = fraction * 360;
    const gap = nonZero.length > 1 ? GAP_DEG : 0;
    const drawDeg = Math.max(grossDeg - gap, 0);
    const startDeg = cursorDeg + gap / 2;
    cursorDeg += grossDeg;
    const dash = (drawDeg / 360) * CIRCUMFERENCE;
    return {
      ...slice,
      fraction,
      dashArray: `${dash} ${CIRCUMFERENCE - dash}`,
      dashOffset: -((startDeg + 90) / 360) * CIRCUMFERENCE,
    };
  });

  const hovered = arcs.find(a => a.key === hoverKey);

  return (
    <div>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* Donut */}
        <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            {/* Pista de fondo */}
            <circle
              cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
              fill="none" stroke={COLORS.dashed} strokeWidth={STROKE * 0.35}
            />
            {arcs.map(arc => (
              <circle
                key={arc.key}
                cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
                fill="none"
                stroke={arc.color}
                strokeWidth={hoverKey === arc.key ? STROKE + 6 : STROKE}
                strokeDasharray={arc.dashArray}
                strokeDashoffset={arc.dashOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-width 0.15s ease', cursor: 'pointer' }}
                onMouseEnter={() => setHoverKey(arc.key)}
                onMouseLeave={() => setHoverKey(null)}
                onClick={() => setHoverKey(prev => prev === arc.key ? null : arc.key)}
              />
            ))}
          </svg>
          {/* Centro */}
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', textAlign: 'center', pointerEvents: 'none',
          }}>
            {hovered ? (
              <>
                <div style={{ fontSize: 20 }}>{hovered.icon}</div>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 700, color: COLORS.ink, marginTop: 2 }}>
                  {(hovered.fraction * 100).toFixed(0)}%
                </div>
                <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 1, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {hovered.label}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 11.5, color: COLORS.muted, fontWeight: 600 }}>{centerLabel}</div>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 19, fontWeight: 700, color: COLORS.ink, marginTop: 2 }}>
                  {centerValue}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Leyenda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 160, flex: '1 1 200px' }}>
          {arcs.sort((a, b) => b.value - a.value).map(arc => (
            <div
              key={arc.key}
              onMouseEnter={() => setHoverKey(arc.key)}
              onMouseLeave={() => setHoverKey(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer',
                padding: '4px 6px', borderRadius: 8,
                backgroundColor: hoverKey === arc.key ? COLORS.cardAlt : 'transparent',
              }}
            >
              <span style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: arc.color, flexShrink: 0, border: border(1, COLORS.ink) }} />
              {arc.icon && <span style={{ fontSize: 14, flexShrink: 0 }}>{arc.icon}</span>}
              <span style={{ fontSize: 13, color: COLORS.ink, fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {arc.label}
              </span>
              <span style={{ fontSize: 12.5, color: COLORS.muted, fontWeight: 700, flexShrink: 0 }}>
                {(arc.fraction * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
