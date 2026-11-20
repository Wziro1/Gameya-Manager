import { Link } from 'react-router';
import { Plus } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { formatMoney, plural } from '../utils/format';
import Badge from '../components/Badge';
import Spinner from '../components/Spinner';
import ErrorBox from '../components/ErrorBox';

const STATUS_TONE = { Recruiting: 'blue', Active: 'green', Completed: 'slate' };

const newCircleLink =
  'inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 font-semibold text-primary transition hover:bg-accent-dark';

export default function MyCircles() {
  const { data, error, loading, reload } = useApi('/circles/my');

  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const circles = data.circles;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">My Circles</h1>
          <p className="mt-1 text-slate-600">Circles you created and manage as group admin.</p>
        </div>
        <Link to="/circles/new" className={newCircleLink}>
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">New circle</span>
        </Link>
      </header>

      {circles.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold">You have not created a circle yet</h2>
          <p className="mx-auto mt-2 max-w-md text-slate-600">
            Set the monthly amount and the number of months, then invite the people you trust.
          </p>
          <Link to="/circles/new" className={`${newCircleLink} mt-6`}>
            <Plus className="h-5 w-5" />
            Create your first circle
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {circles.map((c) => {
            const members = c.status === 'Recruiting' ? c.activeCount : c.participants.length;
            return (
              <Link
                key={c._id}
                to={`/circles/${c._id}`}
                className="block rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="truncate text-lg font-semibold">{c.name}</h2>
                  <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  {formatMoney(c.monthlyInstallment)} / month · {c.durationMonths} months
                </p>
                <p className="text-sm text-slate-500">Monthly pot: {formatMoney(c.totalAmount)}</p>

                <div className="mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Members</span>
                    <span className="font-medium">
                      {members}/{c.durationMonths}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.min(100, (members / c.durationMonths) * 100)}%` }}
                    />
                  </div>
                </div>

                {c.status === 'Recruiting' && c.pendingCount > 0 && (
                  <div className="mt-3">
                    <Badge tone="amber">{plural(c.pendingCount, 'join request')}</Badge>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}