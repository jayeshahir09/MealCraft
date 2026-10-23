/**
 * Formats a user's full name to clean title case with trimmed whitespace.
 * e.g. "jayesh ahir " -> "Jayesh Ahir"
 */
export function formatDisplayName(name) {
  if (!name || typeof name !== 'string') return 'Chef';
  const trimmed = name.trim();
  if (!trimmed) return 'Chef';
  return trimmed
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Returns a polite, professional time-of-day greeting.
 */
export function getTimeOfDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}
