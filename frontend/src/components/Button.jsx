const VARIANTS = {
  primary: 'bg-accent text-primary hover:bg-accent-dark',
  outline: 'border border-slate-300 bg-white text-primary hover:bg-surface',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

const SIZES = {
  md: 'px-4 py-2.5',
  sm: 'px-3 py-1.5 text-sm',
};

export default function Button({
  children,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  fullWidth = true,
  className = '',
  ...props
}) {
  return (
    <button
      {...props}
      disabled={loading || disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
        fullWidth ? 'w-full' : ''
      } ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}