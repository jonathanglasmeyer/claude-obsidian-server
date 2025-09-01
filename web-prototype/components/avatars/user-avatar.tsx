export function UserAvatar({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="rounded-full ring-1 ring-border"
    >
      <rect width="32" height="32" rx="16" fill="#3b82f6" />
      <circle cx="16" cy="12" r="5" fill="white" />
      <path
        d="M6 26c0-5.523 4.477-10 10-10s10 4.477 10 10"
        fill="white"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}