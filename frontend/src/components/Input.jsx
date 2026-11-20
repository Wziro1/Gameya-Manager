export default function Input({ label, id, error, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-primary">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-primary outline-none transition focus:ring-2 focus:ring-accent ${
          error ? 'border-red-500' : 'border-slate-300'
        }`}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}