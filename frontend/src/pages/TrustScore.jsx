import { TrendingUp, TrendingDown } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { formatDate } from '../utils/format';
import Badge from '../components/Badge';
import Section from '../components/Section';
import Spinner from '../components/Spinner';
import ErrorBox from '../components/ErrorBox';

const LEVEL = {
  Excellent: { tone: 'green', stroke: 'stroke-emerald-500', text: 'Members can rely on you. Keep paying on time.' },
  Good: { tone: 'blue', stroke: 'stroke-sky-500', text: 'A solid record with a few late or missed payments.' },
  Fair: { tone: 'amber', stroke: 'stroke-amber-500', text: 'Admins may hesitate to accept you. Pay on time to recover.' },
  Low: { tone: 'red', stroke: 'stroke-red-500', text: 'Several missed payments. On-time payments will raise your score step by step.' },
};

const deltaTone = (d) => (d > 0 ? 'green' : Math.abs(d) >= 10 ? 'red' : 'amber');

function ScoreRing({ score, max, stroke }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, score / max));

  return (
    <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
      <svg
        viewBox="0 0 120 120"
        className="h-36 w-36 -rotate-90"
        role="img"
        aria-label={`Trust score ${score} out of ${max}`}
      >
        <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="10" className="stroke-slate-100" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className={`${stroke} transition-all duration-700`}
        />
      </svg>
      <span className="absolute text-4xl font-bold">{score}</span>
    </div>
  );
}

export default function TrustScore() {
  const me = useApi('/trust/me');
  const rulesData = useApi('/trust/rules');

  if (me.loading || rulesData.loading) return <Spinner />;
  if (me.error || rulesData.error) {
    return (
      <ErrorBox
        message={me.error || rulesData.error}
        onRetry={() => {
          me.reload();
          rulesData.reload();
        }}
      />
    );
  }

  const { trustScore, level, history } = me.data;
  const { max, rules, levels, rejectedGraceDays } = rulesData.data;
  const style = LEVEL[level] || LEVEL.Low;

  // Level bands, for example Excellent 90-100, Good 75-89
  const bands = levels.map((l, i) => ({
    label: l.label,
    from: l.min,
    to: i === 0 ? max : levels[i - 1].min - 1,
  }));

  const descriptions = {
    OnTimePayment: 'Your receipt was submitted on or before the due day and the admin verified it.',
    LatePayment: 'Your receipt was submitted after the due day and then verified.',
    MissedPayment: `The due day passed with no receipt, or a rejected receipt was not replaced within ${rejectedGraceDays} days.`,
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Trust score</h1>
        <p className="mt-1 text-slate-600">
          Your payment reputation. Circle admins and members can see it when you join.
        </p>
      </header>

      <section className="flex flex-col items-center gap-6 rounded-xl bg-white p-6 shadow-sm sm:flex-row">
        <ScoreRing score={trustScore} max={max} stroke={style.stroke} />
        <div className="text-center sm:text-left">
          <Badge tone={style.tone}>{level}</Badge>
          <p className="mt-2 text-2xl font-bold">
            {trustScore} <span className="text-base font-normal text-slate-500">out of {max}</span>
          </p>
          <p className="mt-1 max-w-md text-slate-600">{style.text}</p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {bands.map((b) => (
          <div
            key={b.label}
            className={`rounded-xl bg-white p-4 text-center shadow-sm ${
              b.label === level ? 'ring-2 ring-accent' : ''
            }`}
          >
            <p className="font-semibold">{b.label}</p>
            <p className="text-sm text-slate-500">
              {b.from}–{b.to}
            </p>
          </div>
        ))}
      </div>

      <Section title="How your score works">
        <div className="space-y-2">
          {Object.entries(rules).map(([type, rule]) => (
            <div
              key={type}
              className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 p-3"
            >
              <div>
                <p className="font-medium">{rule.label}</p>
                <p className="text-sm text-slate-500">{descriptions[type]}</p>
              </div>
              <Badge tone={deltaTone(rule.delta)}>
                {rule.delta > 0 ? '+' : ''}
                {rule.delta}
              </Badge>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Each month counts once per circle. If a month is already marked as missed, paying later does not
          change your score again. Your score stays between 0 and {max}.
        </p>
      </Section>

      <Section title="Score history">
        {history.length === 0 ? (
          <p className="text-sm text-slate-500">
            No changes yet. Your score starts at {max} and changes when your payments are verified or
            missed.
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      e.delta > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {e.delta > 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{e.label}</p>
                    <p className="truncate text-sm text-slate-500">
                      {e.circle || 'Circle'} · Month {e.monthNumber} · {formatDate(e.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <Badge tone={deltaTone(e.delta)}>
                    {e.delta > 0 ? '+' : ''}
                    {e.delta}
                  </Badge>
                  {typeof e.scoreBefore === 'number' && typeof e.scoreAfter === 'number' && (
                    <p className="mt-1 text-xs text-slate-500">
                      {e.scoreBefore} → {e.scoreAfter}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {history.length >= 30 && (
          <p className="mt-3 text-xs text-slate-500">Showing your latest 30 changes.</p>
        )}
      </Section>
    </div>
  );
}