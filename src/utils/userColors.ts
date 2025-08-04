// Get event color based on priority and timing
export const getEventColor = (startTime: string, priority: string): string => {
  const now = new Date();
  const eventDate = new Date(startTime);
  const timeDiff = eventDate.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  // Overdue events - red
  if (hoursDiff < 0) {
    return 'bg-red-500';
  }
  
  // Events coming very close (within 2 hours) - light red
  if (hoursDiff <= 2) {
    return 'bg-red-300';
  }
  
  // Events coming soon (within 24 hours) - orange
  if (hoursDiff <= 24) {
    return 'bg-orange-300';
  }
  
  // Events further out - green (light)
  return 'bg-green-300';
};

// Generate consistent light colors for users based on their user_id (fallback)
export const getUserColor = (userId: string): string => {
  // Create a hash from the user ID to ensure consistent colors
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Use very light colors like Google Calendar
  const colors = [
    'bg-blue-100',     // Very Light Blue
    'bg-green-100',    // Very Light Green  
    'bg-purple-100',   // Very Light Purple
    'bg-pink-100',     // Very Light Pink
    'bg-indigo-100',   // Very Light Indigo
    'bg-teal-100',     // Very Light Teal
    'bg-orange-100',   // Very Light Orange
    'bg-cyan-100',     // Very Light Cyan
    'bg-emerald-100',  // Very Light Emerald
    'bg-violet-100',   // Very Light Violet
    'bg-amber-100',    // Very Light Amber
    'bg-lime-100',     // Very Light Lime
    'bg-rose-100',     // Very Light Rose
    'bg-fuchsia-100',  // Very Light Fuchsia
    'bg-sky-100',      // Very Light Sky
  ];

  return colors[Math.abs(hash) % colors.length];
};

// Get a slightly darker variant for hover states
export const getUserColorHover = (userId: string): string => {
  const baseColor = getUserColor(userId);
  return baseColor.replace('-100', '-200');
};

// Get priority-specific styling that can overlay colors
export const getPriorityOverlay = (priority: string, isOverdue: boolean): string => {
  if (isOverdue) return 'ring-2 ring-red-600 ring-offset-1';
  
  switch (priority) {
    case 'urgent': return 'ring-2 ring-red-500 ring-offset-1';
    case 'high': return 'ring-1 ring-orange-400';
    case 'low': return 'opacity-75';
    default: return '';
  }
};