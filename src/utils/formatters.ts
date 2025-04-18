// Format a number as currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Format a timestamp as a date string
export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

// Format a timestamp as a time string
export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
};

// Format a timestamp as a date and time string
export const formatDateTime = (timestamp: number): string => {
  return `${formatDate(timestamp)} at ${formatTime(timestamp)}`;
};
