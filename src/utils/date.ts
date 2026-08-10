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

export const getTodayISO = (): string => toISODate(new Date());

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

/** Devuelve "27 jul" para el día `index` (0=lunes..6=domingo) de la semana. */
export const getDayDateLabel = (weekStartISO: string, index: number): string => {
  const d = new Date(weekStartISO + 'T00:00:00');
  d.setDate(d.getDate() + index);
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]}`;
};

export const isToday = (weekStartISO: string, index: number): boolean => {
  const d = new Date(weekStartISO + 'T00:00:00');
  d.setDate(d.getDate() + index);
  return toISODate(d) === toISODate(new Date());
};

const MONTHS_LONG_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const getMonthLabel = (monthDate: Date): string =>
  `${MONTHS_LONG_ES[monthDate.getMonth()]} ${monthDate.getFullYear()}`;

export const addMonths = (monthDate: Date, delta: number): Date => {
  const d = new Date(monthDate);
  d.setDate(1);
  d.setMonth(d.getMonth() + delta);
  return d;
};

export interface MonthDayCell {
  dateISO: string;
  day: number;
  inCurrentMonth: boolean;
  weekStart: string; // lunes de la semana a la que pertenece este día
  dayIndex: number;  // 0=lunes..6=domingo
}

/** Cuadrícula completa del mes (semanas de lunes a domingo, con días de meses vecinos). */
export const getMonthGrid = (monthDate: Date): MonthDayCell[] => {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = new Date(getMondayISO(firstOfMonth) + 'T00:00:00');

  const lastOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const lastWeekStart = new Date(getMondayISO(lastOfMonth) + 'T00:00:00');
  const gridEnd = new Date(lastWeekStart);
  gridEnd.setDate(gridEnd.getDate() + 6);

  const cells: MonthDayCell[] = [];
  const cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    const weekStart = getMondayISO(cursor);
    const dayIndex = (cursor.getDay() + 6) % 7; // 0=lunes..6=domingo
    cells.push({
      dateISO: toISODate(cursor),
      day: cursor.getDate(),
      inCurrentMonth: cursor.getMonth() === monthDate.getMonth(),
      weekStart,
      dayIndex,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return cells;
};
