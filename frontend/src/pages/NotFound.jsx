import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-6xl font-bold text-accent-dark">404</p>
      <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-slate-600">
        The page you are looking for does not exist or was moved.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 font-semibold text-primary transition hover:bg-accent-dark"
      >
        Go to Home
      </Link>
    </div>
  );
}