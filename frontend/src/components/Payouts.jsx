import { useState } from 'react';
import { Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { formatMoney, firstName } from '../utils/format';
import Badge from './Badge';
import Button from './Button';
import Section from './Section';
import Modal from './Modal';
import ReceiptViewer from './ReceiptViewer';
import SendPayoutModal from './SendPayoutModal';

function DisputeModal({ amount, busy, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (reason.trim().length < 3) {
      setError('Please explain what went wrong (at least 3 characters)');
      return;
    }
    onSubmit(reason.trim());
  };

  return (
    <Modal title="I did not receive this payout" onClose={onClose}>
      <p className="text-sm text-slate-600">
        The admin says they sent {formatMoney(amount)}. Tell them what is wrong, for example that
        nothing arrived or the amount is different. They can then send it again.
      </p>
      <label htmlFor="dispute-reason" className="mb-1 mt-4 block text-sm font-medium">
        What went wrong?
      </label>
      <textarea
        id="dispute-reason"
        rows={3}
        maxLength={200}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-accent"
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" fullWidth={false} onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="danger" fullWidth={false} loading={busy} onClick={submit}>
          Submit dispute
        </Button>
      </div>
    </Modal>
  );
}

export default function Payouts({ data, isAdmin, onChanged }) {
  const { user } = useAuth();
  const [sendFor, setSendFor] = useState(null); // month object
  const [disputeFor, setDisputeFor] = useState(null); // month object
  const [viewing, setViewing] = useState(null); // payout id
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const { circle, currentMonth, months } = data;
  const payableUpTo = Math.max(currentMonth, 1);

  // Admin sees every due month, a recipient only sees their own month
  const rows = months.filter((m) => {
    const mine = m.recipient && m.recipient.userId === user.id;
    if (!isAdmin && !mine) return false;
    return m.month <= payableUpTo || m.payoutStatus !== 'NotSent';
  });

  if (rows.length === 0 && !notice) return null;

  const confirmReceived = async (m) => {
    if (!window.confirm(`Confirm that you received ${formatMoney(m.payoutAmount)}?`)) return;

    setBusy(`${m.month}-confirm`);
    setError('');
    setNotice('');
    try {
      const res = await api(`/payouts/${m.payoutId}/respond`, {
        method: 'PATCH',
        body: { action: 'confirm' },
      });
      setNotice(res.message);
      onChanged(res.circleCompleted);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const dispute = async (reason) => {
    setBusy(`${disputeFor.month}-dispute`);
    setError('');
    setNotice('');
    try {
      const res = await api(`/payouts/${disputeFor.payoutId}/respond`, {
        method: 'PATCH',
        body: { action: 'dispute', reason },
      });
      setDisputeFor(null);
      setNotice(res.message);
      onChanged(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <Section title="Payouts">
      {notice && (
        <p role="status" className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="space-y-2">
        {rows.map((m) => {
          const mine = m.recipient && m.recipient.userId === user.id;
          const status = m.payoutStatus;
          const fullyCollected = m.collected >= m.expected;
          const active = circle.status === 'Active';

          const canSend =
            active && isAdmin && ((status === 'NotSent' && m.collected > 0) || status === 'Disputed');
          const canRespond = active && mine && status === 'Sent';
          const canViewProof = (isAdmin || mine) && m.payoutId && status !== 'NotSent';

          let badge;
          if (status === 'NotSent') {
            if (!isAdmin) badge = <Badge>Waiting for the admin</Badge>;
            else if (m.collected === 0) badge = <Badge>Waiting for payments</Badge>;
            else badge = fullyCollected ? <Badge tone="green">Ready to send</Badge> : <Badge tone="amber">Partial</Badge>;
          } else if (status === 'Sent') {
            badge = (
              <Badge tone="amber">
                {mine ? 'Awaiting your confirmation' : `Waiting for ${firstName(m.recipient.name)}`}
              </Badge>
            );
          } else if (status === 'Confirmed') {
            badge = <Badge tone="green">{mine ? 'Received' : 'Paid'}</Badge>;
          } else {
            badge = <Badge tone="red">Disputed</Badge>;
          }

          const subtitle =
            status === 'NotSent'
              ? `Collected ${formatMoney(m.collected)} of ${formatMoney(m.expected)}`
              : `${formatMoney(m.payoutAmount)} sent${
                  m.payoutAmount < m.expected ? ` (partial, the full pot is ${formatMoney(m.expected)})` : ''
                }`;

          return (
            <div key={m.month} className="rounded-lg border border-slate-100 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    Month {m.month} · {mine ? 'You receive' : `${m.recipient?.name} receives`}
                  </p>
                  <p className="text-sm text-slate-500">{subtitle}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {badge}

                  {canViewProof && (
                    <Button
                      size="sm"
                      variant="outline"
                      fullWidth={false}
                      onClick={() => setViewing(m.payoutId)}
                    >
                      <Eye className="h-4 w-4" />
                      Proof
                    </Button>
                  )}

                  {canRespond && (
                    <>
                      <Button
                        size="sm"
                        fullWidth={false}
                        loading={busy === `${m.month}-confirm`}
                        disabled={Boolean(busy)}
                        onClick={() => confirmReceived(m)}
                      >
                        Confirm received
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        fullWidth={false}
                        disabled={Boolean(busy)}
                        onClick={() => setDisputeFor(m)}
                      >
                        Not received
                      </Button>
                    </>
                  )}

                  {canSend && (
                    <Button size="sm" fullWidth={false} onClick={() => setSendFor(m)}>
                      {status === 'Disputed' ? 'Send again' : 'Send payout'}
                    </Button>
                  )}
                </div>
              </div>

              {status === 'Disputed' && m.disputeReason && (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  Disputed: {m.disputeReason}
                </p>
              )}
              {isAdmin && mine && status === 'NotSent' && m.collected > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  You are the recipient this month, so the payout is recorded as confirmed right away.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {sendFor && (
        <SendPayoutModal
          circleId={circle.id}
          month={sendFor.month}
          recipientName={sendFor.recipient?.name}
          collected={sendFor.collected}
          expected={sendFor.expected}
          resend={sendFor.payoutStatus === 'Disputed'}
          onClose={() => setSendFor(null)}
          onDone={(res) => {
            setSendFor(null);
            setError('');
            setNotice(res.message);
            onChanged(res.circleCompleted);
          }}
        />
      )}

      {disputeFor && (
        <DisputeModal
          amount={disputeFor.payoutAmount}
          busy={busy === `${disputeFor.month}-dispute`}
          onClose={() => setDisputeFor(null)}
          onSubmit={dispute}
        />
      )}

      {viewing && (
        <ReceiptViewer
          path={`/payouts/${viewing}/proof`}
          title="Transfer proof"
          onClose={() => setViewing(null)}
        />
      )}
    </Section>
  );
}