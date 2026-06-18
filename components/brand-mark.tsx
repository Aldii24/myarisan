export function BrandMark({ className = "size-10" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 40 40"
    >
      <rect fill="#13795B" height="40" rx="12" width="40" />
      <path
        d="M12 20a8 8 0 0 1 13.4-5.9"
        stroke="#D9D2FF"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <path
        d="M28 20a8 8 0 0 1-13.4 5.9"
        stroke="#D7F3E8"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <circle cx="20" cy="20" fill="#FFF9F0" r="4.5" />
      <circle cx="20" cy="20" fill="#13795B" r="1.8" />
    </svg>
  )
}
