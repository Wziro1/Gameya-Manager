export default function Spinner({ className = '' }) {
  return (
    <div className={`flex justify-center py-16 ${className}`}>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-accent" />
    </div>
  );
}