import type React from 'react';

// Sistema de diseño "Retro cocina" — usado en toda la app.
export const COLORS = {
  bg: '#FBEFDD',
  ink: '#26201A',
  yellow: '#FFD35C',
  orange: '#F2622A',
  orangeText: '#D8451C',
  teal: '#1F8A70',
  tealText: '#166B57',
  muted: '#7A6A50',
  mutedLight: '#8C7B5C',
  mutedLighter: '#9A8A6C',
  dashed: '#C9B98F',
  card: '#fff',
  cardAlt: '#FFFCF6',
  danger: '#D8451C',
};

export const FONT_HEAD = "'Space Grotesk', sans-serif";
export const FONT_BODY = "'Manrope', sans-serif";

export const shadow = (offset = 4): string => `${offset}px ${offset}px 0 ${COLORS.ink}`;

export const border = (width = 2.5, color: string = COLORS.ink): string => `${width}px solid ${color}`;

/** Estilo base de tarjeta retro: fondo blanco, borde grueso y sombra desplazada. */
export const cardStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
  backgroundColor: COLORS.card,
  border: border(),
  borderRadius: 14,
  boxShadow: shadow(),
  ...extra,
});
