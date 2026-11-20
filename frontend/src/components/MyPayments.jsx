import { useState } from 'react';
import { Upload, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatMoney, formatDate } from '../utils/format';
import Badge from './Badge';
import Button from './Button';
import Section from './Section';
import ReceiptUploadModal from './ReceiptUploadModal';
import ReceiptViewer from './ReceiptViewer';

const STATUS_TONE = { Verified: 'green', Pending: 'amber', Rejected: 'red', Due: 'blue', Overdue: 'red' };
const STATUS_LABEL = {
  Verified: 'Verified',
  Pending: 'Waiting for review',
  Rejected: 'Rejected',
  Due: 'Due',
  Overdue: 'Overdue',
};

export default function MyPayments({ data, onChanged }) {
  const { user } = useAuth();
  const [uploadFor, setUploadFor] = useState(null); // month number being paid
  const [viewing, setViewing] = useState(null); // payment id being viewed

  const { circle, months, members } = data;
  const me = members.find((m) => m.userId === user.id);
  if (!me) return null;

  const canUpload = circle.status === 'Active';
  const rows = me.payments.filter((p) => p.status !== 'Upcoming');
  if (rows.length === 0) return null;

  return (
    <Section title="My payments">
      <div className="space-y-2">
        {rows.map((p) => {
          const month = months.find((m) => m.month === p.month);
          const needsReceipt = canUpload && ['Due', 'Overdue', 'Rejected'].includes(p.status);

          return (
            <div key={p.month} className="rounded-lg border border-slate-100 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    Month {p.month} · {formatMoney(circle.monthlyInstallment)}
                  </p>
                  <p className="text-sm text-slate-500">Due {formatDate(month.dueDate)}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                  {p.status === 'Verified' && p.isLate && <Badge tone="amber">Paid late</Badge>}

                  {p.paymentId && (
                    <Button
                      size="sm"
                      variant="outline"
                      fullWidth={false}
                      onClick={() => setViewing(p.paymentId)}
                    >
                      <Eye className="h-4 w-4" />
                      Receipt
                    </Button>
                  )}

                  {needsReceipt && (
                    <Button size="sm" fullWidth={false} onClick={() => setUploadFor(p.month)}>
                      <Upload className="h-4 w-4" />
                      {p.status === 'Rejected' ? 'Upload again' : 'Upload receipt'}
                    </Button>
                  )}
                </div>
              </div>

              {p.status === 'Rejected' && p.rejectionReason && (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  Rejected: {p.rejectionReason}
                </p>
              )}
              {p.status === 'Overdue' && (
                <p className="mt-2 text-xs text-slate-500">
                  This month is overdue. Pay as soon as you can: late and missed payments lower your
                  trust score.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {uploadFor && (
        <ReceiptUploadModal
          circleId={circle.id}
          month={uploadFor}
          amount={circle.monthlyInstallment}
          onClose={() => setUploadFor(null)}
          onDone={() => {
            setUploadFor(null);
            onChanged();
          }}
        />
      )}

      {viewing && (
        <ReceiptViewer
          path={`/payments/${viewing}/receipt`}
          title="Your receipt"
          onClose={() => setViewing(null)}
        />
      )}
    </Section>
  );
}