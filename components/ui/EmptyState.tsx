interface EmptyStateProps {
  message?: string;
  className?: string;
}

export default function EmptyState({ message = "тут поки нічого", className = "" }: EmptyStateProps) {
  return (
    <div className={`text-center py-24 ${className}`}>
      <p className="heading-sub text-hairline-dark mb-4">:(</p>
      <p className="text-on-primary-mute">
        брєдік в чат нє пішем — {message}
      </p>
    </div>
  );
}
