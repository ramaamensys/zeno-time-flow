// Generate consistent colors for users based on their user_id
export const getUserColor = (userId: string): string => {
  // Create a hash from the user ID to ensure consistent colors
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Use the hash to pick from a predefined set of nice colors
  const colors = [
    'bg-blue-500',     // Blue
    'bg-green-500',    // Green  
    'bg-purple-500',   // Purple
    'bg-pink-500',     // Pink
    'bg-indigo-500',   // Indigo
    'bg-teal-500',     // Teal
    'bg-orange-500',   // Orange
    'bg-red-500',      // Red
    'bg-cyan-500',     // Cyan
    'bg-emerald-500',  // Emerald
    'bg-violet-500',   // Violet
    'bg-amber-500',    // Amber
    'bg-lime-500',     // Lime
    'bg-rose-500',     // Rose
    'bg-fuchsia-500',  // Fuchsia
    'bg-sky-500',      // Sky
  ];

  return colors[Math.abs(hash) % colors.length];
};

// Get a lighter variant for hover states
export const getUserColorHover = (userId: string): string => {
  const baseColor = getUserColor(userId);
  return baseColor.replace('-500', '-400');
};

// Get priority-specific styling that can overlay user colors
export const getPriorityOverlay = (priority: string, isOverdue: boolean): string => {
  if (isOverdue) return 'ring-2 ring-red-600 ring-offset-1';
  
  switch (priority) {
    case 'urgent': return 'ring-2 ring-red-500 ring-offset-1';
    case 'high': return 'ring-1 ring-orange-400';
    case 'low': return 'opacity-75';
    default: return '';
  }
};