import { WeekDay } from '../types';

export const WEEK_DAYS: { key: WeekDay; label: string }[] = [
  { key: 'mon', label: 'Lunes' },
  { key: 'tue', label: 'Martes' },
  { key: 'wed', label: 'Miércoles' },
  { key: 'thu', label: 'Jueves' },
  { key: 'fri', label: 'Viernes' },
  { key: 'sat', label: 'Sábado' },
  { key: 'sun', label: 'Domingo' },
];

const toISODate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getMondayISO = (date: Date): string => {
  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0=domingo..6=sábado
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + diffToMonday);
  return toISODate(d);
};

export const addWeeksISO = (weekStartISO: string, weeks: number): string => {
  const d = new Date(weekStartISO + 'T00:00:00');
  d.setDate(d.getDate() + weeks * 7);
  return toISODate(d);
};

const MONTHS_ES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

export const formatWeekRange = (weekStartISO: string): string => {
  const start = new Date(weekStartISO + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = `${start.getDate()}${sameMonth ? '' : ` ${MONTHS_ES[start.getMonth()]}`}`;
  const endLabel = `${end.getDate()} ${MONTHS_ES[end.getMonth()]}`;
  return `${startLabel} – ${endLabel}`;
};
