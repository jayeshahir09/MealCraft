/**
 * Standardized Date Utilities for MealCraft
 * Ensures consistent Monday weekStart calculation across all timezones.
 */

export function getMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  // If Sunday (0), go back 6 days to Monday. Otherwise, go to Monday of current week.
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatWeekStart(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatWeekStartUTC(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}
