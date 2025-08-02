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

  // Use light colors for better visibility
  const colors = [
    'bg-blue-300',     // Light Blue
    'bg-green-300',    // Light Green  
    'bg-purple-300',   // Light Purple
    'bg-pink-300',     // Light Pink
    'bg-indigo-300',   // Light Indigo
    'bg-teal-300',     // Light Teal
    'bg-orange-300',   // Light Orange
    'bg-cyan-300',     // Light Cyan
    'bg-emerald-300',  // Light Emerald
    'bg-violet-300',   // Light Violet
    'bg-amber-300',    // Light Amber
    'bg-lime-300',     // Light Lime
    'bg-rose-300',     // Light Rose
    'bg-fuchsia-300',  // Light Fuchsia
    'bg-sky-300',      // Light Sky
  ];

  return colors[Math.abs(hash) % colors.length];
};

// Get a lighter variant for hover states
export const getUserColorHover = (userId: string): string => {
  const baseColor = getUserColor(userId);
  return baseColor.replace('-300', '-200');
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