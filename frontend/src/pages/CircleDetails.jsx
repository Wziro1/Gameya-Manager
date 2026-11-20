import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';
import { formatMoney, formatDate, trustTone } from '../utils/format';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Section from '../components/Section';
import Spinner from '../components/Spinner';
import ErrorBox from '../components/ErrorBox';
import CirclePayments from '../components/CirclePayments';

const STATUS_TONE = { Recruiting: 'blue', Active: 'green', Completed: 'slate' };

// Today's date as YYYY-MM-DD for the date picker's minimum
const todayISO = () => new Date().toISOString().slice(0, 10);

function InviteCard({ circle }) {
  const [copied, setCopied] = useState('');

  const copy = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      setCopied('error');
    }
  };

  const message = `Join my savings circle "${circle.name}" on Gameya Manager. Invite code: ${circle.inviteCode}`;

  return (
    <Section title="Invite members">
      <p className="text-sm text-slate-600">
        Share this code with people you trust. They request to join, and you approve them.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <span className="rounded-lg bg-surface px-4 py-3 font-mono text-3xl font-bold tracking-widest">
          {circle.inviteCode}
        </span>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" fullWidth={false} onClick={() => copy('code', circle.inviteCode)}>
            {copied === 'code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied === 'code' ? 'Copied' : 'Copy code'}
          </Button>
          <Button size="sm" variant="outline" fullWidth={false} onClick={() => copy('message', message)}>
            {copied === 'message' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied === 'message' ? 'Copied' : 'Copy invite message'}
          </Button>
        </div>
      </div>
      {copied === 'error' && (
        <p className="mt-2 text-sm text-red-600">Copy failed. Select the code and copy it manually.</p>
      )}
    </Section>
  );
}

function MemberRow({ p, circle, isMe, showPhone, actions }) {
  const isOwner = p.user._id === circle.creator._id;
  const subtitle = [isOwner && 'Admin', showPhone && p.user.phone].filter(Boolean).join(' · ');

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-white">
          {p.user.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">
            {p.user.name}
            {isMe && ' (you)'}
          </p>
          <p className="truncate text-sm text-slate-500">{subtitle || 'Member'}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {p.payoutTurn && <Badge tone="blue">Turn {p.payoutTurn}</Badge>}
        <Badge tone={trustTone(p.user.trustScore)}>Trust {p.user.trustScore}</Badge>
        {actions}
      </div>
    </div>
  );
}

export default function CircleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, error, loading, reload, refresh } = useApi(`/circles/${id}`);
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const [startDate, setStartDate] = useState('');

  const backButton = (
    <button
      onClick={() => navigate(-1)}
      className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-primary"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </button>
  );

  if (loading) return <Spinner />;
  if (error) {
    return (
      <div>
        {backButton}
        <ErrorBox message={error} onRetry={reload} />
      </div>
    );
  }

  const { circle, role } = data;
  const isAdmin = role === 'admin';
  const required = circle.durationMonths;
  const pending = circle.participants.filter((p) => p.status === 'Pending');
  const members = circle.participants.filter((p) => p.status !== 'Pending');
  const me = circle.participants.find((p) => p.user._id === user.id);
  const isFull = members.length === required;

  const respond = async (userId, action) => {
    setBusy(`${userId}-${action}`);
    setActionError('');
    try {
      await api(`/circles/${circle._id}/participants/${userId}`, {
        method: 'PATCH',
        body: { action },
      });
      refresh();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy('');
    }
  };

  const startCircle = async () => {
    const ok = window.confirm(
      'Start the circle now? The member list will be locked and payout turns will be assigned randomly.'
    );
    if (!ok) return;

    setBusy('start');
    setActionError('');
    try {
      await api(`/circles/${circle._id}/start`, {
        method: 'POST',
        body: startDate ? { startDate } : {},
      });
      refresh();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        {backButton}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{circle.name}</h1>
            <p className="mt-1 text-slate-600">
              {formatMoney(circle.monthlyInstallment)} per month · {required} months · monthly pot{' '}
              {formatMoney(circle.totalAmount)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={STATUS_TONE[circle.status]}>{circle.status}</Badge>
            <Badge>{isAdmin ? 'You are the admin' : `Admin: ${circle.creator.name}`}</Badge>
          </div>
        </div>
      </div>

      {actionError && (
        <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {!isAdmin && me?.status === 'Pending' && (
        <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          Your request is waiting for the admin&apos;s approval.
        </div>
      )}

      {circle.status === 'Completed' && (
        <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          This circle is completed. Every payout was confirmed.
        </div>
      )}

      {circle.status !== 'Recruiting' && (
        <CirclePayments circleId={circle._id} isAdmin={isAdmin} onCircleChanged={refresh} />
      )}

      {isAdmin && circle.status === 'Recruiting' && circle.inviteCode && <InviteCard circle={circle} />}

      {isAdmin && pending.length > 0 && (
        <Section title={`Join requests (${pending.length})`}>
          <div className="space-y-2">
            {pending.map((p) => (
              <MemberRow
                key={p.user._id}
                p={p}
                circle={circle}
                isMe={false}
                showPhone
                actions={
                  <>
                    <Button
                      size="sm"
                      fullWidth={false}
                      loading={busy === `${p.user._id}-approve`}
                      disabled={Boolean(busy) || isFull}
                      onClick={() => respond(p.user._id, 'approve')}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      fullWidth={false}
                      variant="outline"
                      loading={busy === `${p.user._id}-reject`}
                      disabled={Boolean(busy)}
                      onClick={() => respond(p.user._id, 'reject')}
                    >
                      Reject
                    </Button>
                  </>
                }
              />
            ))}
          </div>
          {isFull && (
            <p className="mt-3 text-sm text-slate-500">
              The circle is full. Reject the extra requests, or start the circle (pending requests are
              removed automatically).
            </p>
          )}
        </Section>
      )}

      <Section title={`Members (${members.length}/${required})`}>
        <div className="space-y-2">
          {members.map((p) => (
            <MemberRow
              key={p.user._id}
              p={p}
              circle={circle}
              isMe={p.user._id === user.id}
              showPhone={isAdmin}
            />
          ))}
        </div>
      </Section>

      {isAdmin && circle.status === 'Recruiting' && (
        <Section title="Start the circle">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Approved members</span>
            <span className="font-medium">
              {members.length} of {required}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.min(100, (members.length / required) * 100)}%` }}
            />
          </div>

          {!isFull && (
            <p className="mt-3 text-sm text-slate-600">
              The circle can start when it has exactly {required} approved members.
            </p>
          )}

          <div className="mt-4 max-w-xs">
            <label htmlFor="startDate" className="mb-1 block text-sm font-medium">
              Start date (optional)
            </label>
            <input
              id="startDate"
              type="date"
              min={todayISO()}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-accent"
            />
            <p className="mt-1 text-xs text-slate-500">
              Month 1 payments are due on this date. Leave empty to start today.
            </p>
          </div>

          <div className="mt-4 max-w-xs">
            <Button disabled={!isFull} loading={busy === 'start'} onClick={startCircle}>
              Start circle
            </Button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Starting locks the member list, assigns payout turns randomly, and removes any pending
            requests.
          </p>
        </Section>
      )}

      {circle.startDate && (
        <Section title="Payout schedule">
          <p className="mb-3 text-sm text-slate-500">
            Started on {formatDate(circle.startDate)}. Each month one member receives{' '}
            {formatMoney(circle.totalAmount)}.
          </p>
          <div className="space-y-2">
            {members.map((p) => (
              <div
                key={p.user._id}
                className={`flex items-center justify-between rounded-lg border p-3 ${
                  p.user._id === user.id ? 'border-accent bg-emerald-50' : 'border-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                    {p.payoutTurn}
                  </span>
                  <span className="font-medium">
                    {p.user.name}
                    {p.user._id === user.id && ' (you)'}
                  </span>
                </div>
                <span className="text-sm text-slate-600">{formatDate(p.payoutDate)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      
    </div>
  );
}