interface StatusBadgeProps {
  label: string;
  colorClass: string;
}

export default function StatusBadge({ label, colorClass }: StatusBadgeProps) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}
