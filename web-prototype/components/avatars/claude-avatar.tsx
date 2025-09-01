export function ClaudeAvatar({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="rounded-full ring-1 ring-border"
    >
      <rect width="32" height="32" rx="16" fill="#8b5cf6" />
      
      {/* Claude "C" letter stylized */}
      <path
        d="M20.5 8.5c-2.5-1-5-1-7.5 0C11 9.5 9.5 11 8.5 13c-1 2-1 4 0 6 1 2 2.5 3.5 4.5 4.5 2.5 1 5 1 7.5 0 1.5-.5 2.8-1.5 3.8-2.8"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Dot for a more distinctive look */}
      <circle cx="23" cy="16" r="1.5" fill="white" />
    </svg>
  );
}