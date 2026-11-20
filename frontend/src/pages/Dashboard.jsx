import { useApi } from '../hooks/useApi';
import { Link } from 'react-router';
import { ShieldCheck, Users, Bell, CalendarDays, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatMoney, formatDate, firstName, plural } from '../utils/format';
import Badge from '../components/Badge';
import Spinner from '../components/Spinner';

const TRUST_TONE = { Excellent: 'green', Good: 'blue', Fair: 'amber', Low: 'red' };
const PAYMENT_TONE = { Due: 'amber', Overdue: 'red', Rejected: 'red' };
const PAYOUT_BADGE = {
  NotSent: { tone: 'slate', label: 'Upcoming' },
  Sent: { tone: 'amber', label: 'Sent' },
  Confirmed: { tone: 'green', label: 'Received' },
  Disputed: { tone: 'red', label: 'Disputed' },
};

function StatCard({ icon: Icon, label, children }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function TaskRow({ to, title, subtitle, badge }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 transition hover:border-accent hover:bg-surface"
    >
      <div className="min-w-0">
        <p className="truncate font-medium">{title}</p>
        {subtitle && <p className="truncate text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {badge}
        <ChevronRight className="h-4 w-4 text-slate-400" />
      </div>
    </Link>
  );
}

const CIRCLE_TONE = { Recruiting: 'blue', Active: 'green', Completed: 'slate' };

function JoinedCircles() {
  const { data, error, loading } = useApi('/circles/joined');

  if (loading) return null;
  if (error) {
    return <p className="text-sm text-red-600">Could not load your joined circles: {error}</p>;
  }
  if (data.circles.length === 0) return null;

  return (
    <Section title="Circles I joined">
      {data.circles.map((c) => (
        <TaskRow
          key={c._id}
          to={`/circles/${c._id}`}
          title={c.name}
          subtitle={`Admin: ${c.creator?.name} · ${formatMoney(c.monthlyInstallment)} / month`}
          badge={
            c.myStatus === 'Pending' ? (
              <Badge tone="amber">Pending</Badge>
            ) : (
              <Badge tone={CIRCLE_TONE[c.status]}>{c.status}</Badge>
            )
          }
        />
      ))}
    </Section>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi('/dashboard');

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div role="alert" className="rounded-xl bg-red-50 p-6 text-red-700">
        <p className="font-semibold">Could not load your dashboard</p>
        <p className="mt-1 text-sm">{error}</p>
        <button
          onClick={reload}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    );
  }

  const { user: me, summary, participant, admin } = data;
  const hasCircles = summary.activeCircles + summary.recruitingCircles > 0;

  const hasParticipantTasks =
    participant.paymentsDue.length +
      participant.payoutsToConfirm.length +
      participant.pendingJoinRequests.length >
    0;
  const hasAdminTasks =
    admin.joinRequests.length +
      admin.readyToStart.length +
      admin.receiptsToReview.length +
      admin.payoutsToSend.length >
    0;

  const n = summary.totalActions;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Hello, {firstName(user.name)}</h1>
        <p className="mt-1 text-slate-600">
          {n > 0
            ? `You have ${plural(n, 'thing')} that ${n === 1 ? 'needs' : 'need'} your attention.`
            : "You're all caught up."}
        </p>
      </header>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/trust" className="block transition hover:opacity-90">
          <StatCard icon={ShieldCheck} label="Trust score">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold">{me.trustScore}</span>
              <Badge tone={TRUST_TONE[me.level]}>{me.level}</Badge>
            </div>
          </StatCard>
        </Link>

        <StatCard icon={Users} label="Active circles">
          <span className="text-3xl font-bold">{summary.activeCircles}</span>
        </StatCard>

        <StatCard icon={Bell} label="Actions needed">
          <span className="text-3xl font-bold">{summary.totalActions}</span>
        </StatCard>

        <StatCard icon={CalendarDays} label="Next payout">
          {participant.nextPayout ? (
            <>
              <p className="text-xl font-bold">{formatMoney(participant.nextPayout.amount)}</p>
              <p className="truncate text-sm text-slate-500">
                {participant.nextPayout.circleName} · {formatDate(participant.nextPayout.payoutDate)}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500">No upcoming payout</p>
          )}
        </StatCard>
      </div>

      {/* New user with no circles */}
      {!hasCircles && (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold">You are not in any circle yet</h2>
          <p className="mx-auto mt-2 max-w-md text-slate-600">
            Create your own savings circle and invite people you trust, or join one with an invite
            code.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/circles"
              className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-primary transition hover:bg-accent-dark"
            >
              Create a circle
            </Link>
            <Link
              to="/join"
              className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold transition hover:bg-surface"
            >
              Join with a code
            </Link>
          </div>
        </div>
      )}

      {/* Participant tasks */}
      {hasCircles && (
        <Section title="Needs your attention">
          {!hasParticipantTasks && <p className="text-sm text-slate-500">Nothing to do right now.</p>}

          {participant.paymentsDue.map((p) => (
            <TaskRow
              key={`${p.circleId}-${p.monthNumber}`}
              to={`/circles/${p.circleId}`}
              title={`${p.circleName} · Month ${p.monthNumber}`}
              subtitle={
                p.status === 'Rejected'
                  ? `Receipt rejected: ${p.rejectionReason}`
                  : `${formatMoney(p.amount)} · due ${formatDate(p.dueDate)}`
              }
              badge={<Badge tone={PAYMENT_TONE[p.status]}>{p.status}</Badge>}
            />
          ))}

          {participant.payoutsToConfirm.map((p) => (
            <TaskRow
              key={p.payoutId}
              to={`/circles/${p.circleId}`}
              title={`${p.circleName} · Month ${p.monthNumber} payout`}
              subtitle={`${formatMoney(p.amount)} sent on ${formatDate(p.sentAt)}`}
              badge={<Badge tone="green">Confirm</Badge>}
            />
          ))}

          {participant.pendingJoinRequests.map((c) => (
            <TaskRow
              key={c.circleId}
              to={`/circles/${c.circleId}`}
              title={c.circleName}
              subtitle="Waiting for the admin to approve you"
              badge={<Badge>Pending</Badge>}
            />
          ))}
        </Section>
      )}

      {/* Admin tasks (hidden when there is nothing to do) */}
      {hasAdminTasks && (
        <Section title="As group admin">
          {admin.joinRequests.map((r) => (
            <TaskRow
              key={`jr-${r.circleId}`}
              to={`/circles/${r.circleId}`}
              title={r.circleName}
              subtitle={plural(r.count, 'join request')}
              badge={<Badge tone="amber">Review</Badge>}
            />
          ))}

          {admin.readyToStart.map((c) => (
            <TaskRow
              key={`rs-${c.circleId}`}
              to={`/circles/${c.circleId}`}
              title={c.circleName}
              subtitle="The circle is full and ready to start"
              badge={<Badge tone="green">Start</Badge>}
            />
          ))}

          {admin.receiptsToReview.map((r) => (
            <TaskRow
              key={`rr-${r.circleId}`}
              to={`/circles/${r.circleId}`}
              title={r.circleName}
              subtitle={`${plural(r.count, 'receipt')} to review`}
              badge={<Badge tone="amber">Review</Badge>}
            />
          ))}

          {admin.payoutsToSend.map((p) => (
            <TaskRow
              key={`ps-${p.circleId}-${p.monthNumber}`}
              to={`/circles/${p.circleId}`}
              title={`${p.circleName} · Month ${p.monthNumber}`}
              subtitle={
                p.disputed
                  ? `Disputed by ${p.recipientName}: ${p.disputeReason}`
                  : `Send ${formatMoney(p.collected)} of ${formatMoney(p.expected)} to ${p.recipientName}`
              }
              badge={
                p.disputed ? (
                  <Badge tone="red">Disputed</Badge>
                ) : p.fullyCollected ? (
                  <Badge tone="green">Ready</Badge>
                ) : (
                  <Badge tone="amber">Partial</Badge>
                )
              }
            />
          ))}
        </Section>
      )}

      {/* My payout turns */}
      {participant.payoutSchedule.length > 0 && (
        <Section title="My payout schedule">
          {participant.payoutSchedule.map((s) => {
            const b = PAYOUT_BADGE[s.payoutStatus];
            return (
              <TaskRow
                key={s.circleId}
                to={`/circles/${s.circleId}`}
                title={`${s.circleName} · Turn ${s.payoutTurn}`}
                subtitle={`${formatDate(s.payoutDate)} · ${formatMoney(s.amount)}`}
                badge={<Badge tone={b.tone}>{b.label}</Badge>}
              />
            );
          })}
        </Section>
      )}
      <JoinedCircles />
    </div>
  );
}