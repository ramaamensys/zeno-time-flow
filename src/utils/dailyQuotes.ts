// Professional motivational quotes for daily inspiration
const professionalQuotes = [
  {
    quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill"
  },
  {
    quote: "The way to get started is to quit talking and begin doing.",
    author: "Walt Disney"
  },
  {
    quote: "Don't be afraid to give up the good to go for the great.",
    author: "John D. Rockefeller"
  },
  {
    quote: "Innovation distinguishes between a leader and a follower.",
    author: "Steve Jobs"
  },
  {
    quote: "The future belongs to those who believe in the beauty of their dreams.",
    author: "Eleanor Roosevelt"
  },
  {
    quote: "It is during our darkest moments that we must focus to see the light.",
    author: "Aristotle"
  },
  {
    quote: "Success is walking from failure to failure with no loss of enthusiasm.",
    author: "Winston Churchill"
  },
  {
    quote: "The only impossible journey is the one you never begin.",
    author: "Tony Robbins"
  },
  {
    quote: "In the middle of difficulty lies opportunity.",
    author: "Albert Einstein"
  },
  {
    quote: "Believe you can and you're halfway there.",
    author: "Theodore Roosevelt"
  },
  {
    quote: "Your limitation—it's only your imagination.",
    author: "Unknown"
  },
  {
    quote: "Push yourself, because no one else is going to do it for you.",
    author: "Unknown"
  },
  {
    quote: "Great things never come from comfort zones.",
    author: "Unknown"
  },
  {
    quote: "Dream it. Wish it. Do it.",
    author: "Unknown"
  },
  {
    quote: "Success doesn't just find you. You have to go out and get it.",
    author: "Unknown"
  },
  {
    quote: "The harder you work for something, the greater you'll feel when you achieve it.",
    author: "Unknown"
  },
  {
    quote: "Dream bigger. Do bigger.",
    author: "Unknown"
  },
  {
    quote: "Don't stop when you're tired. Stop when you're done.",
    author: "Unknown"
  },
  {
    quote: "Wake up with determination. Go to bed with satisfaction.",
    author: "Unknown"
  },
  {
    quote: "Do something today that your future self will thank you for.",
    author: "Sean Patrick Flanery"
  },
  {
    quote: "Little things make big days.",
    author: "Unknown"
  },
  {
    quote: "It's going to be hard, but hard does not mean impossible.",
    author: "Unknown"
  },
  {
    quote: "Don't wait for opportunity. Create it.",
    author: "Unknown"
  },
  {
    quote: "Sometimes we're tested not to show our weaknesses, but to discover our strengths.",
    author: "Unknown"
  },
  {
    quote: "The key to success is to focus on goals, not obstacles.",
    author: "Unknown"
  },
  {
    quote: "Dream it. Believe it. Build it.",
    author: "Unknown"
  },
  {
    quote: "Your potential is endless.",
    author: "Unknown"
  },
  {
    quote: "Great things happen to those who don't stop believing, trying, learning, and being grateful.",
    author: "Roy T. Bennett"
  },
  {
    quote: "Be yourself; everyone else is already taken.",
    author: "Oscar Wilde"
  },
  {
    quote: "Productivity is never an accident. It is always the result of a commitment to excellence, intelligent planning, and focused effort.",
    author: "Paul J. Meyer"
  },
  {
    quote: "The most effective way to do it, is to do it.",
    author: "Amelia Earhart"
  }
];

export const getDailyQuote = () => {
  // Get the current date as a string (YYYY-MM-DD) to ensure same quote all day
  const today = new Date();
  const dateString = today.toISOString().split('T')[0];
  
  // Create a simple hash from the date string to get a consistent index
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Get a positive index within the quotes array length
  const index = Math.abs(hash) % professionalQuotes.length;
  
  return professionalQuotes[index];
};