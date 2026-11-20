import { useState } from 'react';
import { Eye } from 'lucide-react';
import { api } from '../api/client';
import { formatMoney, formatDate, trustTone } from '../utils/format';
import Badge from './Badge';
import Button from './Button';
import Section from './Section';
import Spinner from './Spinner';
import ErrorBox from './ErrorBox';
import Modal from './Modal';
import ReceiptViewer from './ReceiptViewer';

const TRUST_LABEL = {
  OnTimePayment: 'on-time payment',
  LatePayment: 'late payment',
  MissedPayment: 'missed payment',
};

const describe = (res, payment) => {
  if (res.payment.status === 'Rejected') {
    return `Receipt from ${payment.user.name} rejected. They can upload a new one.`;
  }
  const t = res.trustChange;
  const trust = t ? ` Trust score ${t.delta > 0 ? '+' : ''}${t.delta} (${TRUST_LABEL[t.type]}).` : '';
  return `Payment from ${payment.user.name} verified.${trust}`;
};

function RejectModal({ payment, busy, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (reason.trim().length < 3) {
      setError('Please write a short reason (at least 3 characters)');
      return;
    }
    onSubmit(reason.trim());
  };

  return (
    <Modal title={`Reject ${payment.user.name}'s receipt`} onClose={onClose}>
      <label htmlFor="reason" className="mb-1 block text-sm font-medium">
        Reason
      </label>
      <textarea
        id="reason"
        rows={3}
        maxLength={200}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. The receipt is blurry or the amount does not match"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-accent"
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" fullWidth={false} onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="danger" fullWidth={false} loading={busy} onClick={submit}>
          Reject receipt
        </Button>
      </div>
    </Modal>
  );
}

export default function ReviewQueue({ queue, onChanged }) {
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  if (queue.loading) {
    return (
      <Section title="Receipts to review">
        <Spinner />
      </Section>
    );
  }
  if (queue.error) {
    return (
      <Section title="Receipts to review">
        <ErrorBox message={queue.error} onRetry={queue.reload} />
      </Section>
    );
  }

  const payments = queue.data.payments;
  if (payments.length === 0 && !notice && !error) return null;

  const review = async (payment, action, reason) => {
    setBusy(`${payment.id}-${action}`);
    setError('');
    setNotice('');
    try {
      const res = await api(`/payments/${payment.id}/review`, {
        method: 'PATCH',
        body: action === 'reject' ? { action, reason } : { action },
      });
      setRejecting(null);
      setNotice(describe(res, payment));
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <Section title={`Receipts to review (${payments.length})`}>
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
      {payments.length === 0 && <p className="text-sm text-slate-500">All receipts are reviewed.</p>}

      <div className="space-y-2">
        {payments.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 p-3"
          >
            <div className="min-w-0">
              <p className="font-medium">
                {p.user.name} · Month {p.monthNumber}
              </p>
              <p className="text-sm text-slate-500">
                {formatMoney(p.amount)} · sent {formatDate(p.submittedAt)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {p.isLate && <Badge tone="amber">Late</Badge>}
              <Badge tone={trustTone(p.user.trustScore)}>Trust {p.user.trustScore}</Badge>
              <Button size="sm" variant="outline" fullWidth={false} onClick={() => setViewing(p.id)}>
                <Eye className="h-4 w-4" />
                View
              </Button>
              <Button
                size="sm"
                fullWidth={false}
                loading={busy === `${p.id}-verify`}
                disabled={Boolean(busy)}
                onClick={() => review(p, 'verify')}
              >
                Verify
              </Button>
              <Button
                size="sm"
                variant="outline"
                fullWidth={false}
                disabled={Boolean(busy)}
                onClick={() => setRejecting(p)}
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>

      {viewing && (
        <ReceiptViewer
          path={`/payments/${viewing}/receipt`}
          title="Receipt"
          onClose={() => setViewing(null)}
        />
      )}

      {rejecting && (
        <RejectModal
          payment={rejecting}
          busy={busy === `${rejecting.id}-reject`}
          onClose={() => setRejecting(null)}
          onSubmit={(reason) => review(rejecting, 'reject', reason)}
        />
      )}
    </Section>
  );
}