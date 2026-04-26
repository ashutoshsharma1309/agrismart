import { cn, getInitials } from '../../lib/utils';

export function Avatar({
  name,
  size = 36,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = getInitials(name);
  const fontSize = Math.max(11, Math.floor(size * 0.38));
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex select-none items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 font-semibold text-white',
        className,
      )}
      style={{ width: size, height: size, fontSize }}
    >
      {initials}
    </span>
  );
}
