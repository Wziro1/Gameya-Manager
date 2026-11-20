export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-1/2 flex-col justify-between bg-primary p-12 text-white lg:flex">
        <h1 className="text-2xl font-bold">
          Gameya <span className="text-accent">Manager</span>
        </h1>
        <div>
          <p className="text-4xl font-bold leading-tight">
            Save together,
            <br />
            without the spreadsheets.
          </p>
          <p className="mt-4 max-w-md text-slate-300">
            Digital savings circles with transparent ledgers and a trust score everyone can rely on.
          </p>
        </div>
        <span />
      </aside>

      <main className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <h1 className="mb-6 text-xl font-bold text-primary lg:hidden">
            Gameya <span className="text-accent">Manager</span>
          </h1>
          <h2 className="text-2xl font-bold text-primary">{title}</h2>
          <p className="mt-1 text-slate-600">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 text-center text-sm text-slate-600">{footer}</div>
        </div>
      </main>
    </div>
  );
}