import { Check, Clock, X, Minus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatMoney, formatShortDate, firstName } from '../utils/format';
import Badge from './Badge';
import Section from './Section';

const CELL = {
  Verified: { cls: 'bg-emerald-100 text-emerald-700', icon: Check, label: 'Verified' },
  Pending: { cls: 'bg-amber-100 text-amber-700', icon: Clock, label: 'Waiting for admin review' },
  Rejected: { cls: 'bg-red-100 text-red-700', icon: X, label: 'Receipt rejected' },
  Due: { cls: 'bg-sky-100 text-sky-700', text: 'Due', label: 'Payment due' },
  Overdue: { cls: 'bg-red-600 text-white', text: 'Overdue', label: 'Overdue' },
  Upcoming: { cls: 'bg-slate-100 text-slate-400', icon: Minus, label: 'Not due yet' },
};

const PAYOUT = {
  Sent: { tone: 'amber', label: 'Sent' },
  Confirmed: { tone: 'green', label: 'Paid' },
  Disputed: { tone: 'red', label: 'Disputed' },
};

function Cell({ payment }) {
  const c = CELL[payment.status];
  const Icon = c.icon;
  return (
    <span
      title={c.label + (payment.isLate && payment.status === 'Verified' ? ' (paid late)' : '')}
      className={`inline-flex h-7 min-w-14 items-center justify-center gap-1 rounded-md px-2 text-xs font-semibold ${c.cls}`}
    >
      {Icon ? <Icon className="h-4 w-4" /> : c.text}
      {payment.isLate && payment.status === 'Verified' && (
        <span className="text-[10px] font-bold uppercase">late</span>
      )}
    </span>
  );
}

export default function Ledger({ data }) {
  const { user } = useAuth();
  const { circle, currentMonth, months, members } = data;
  const current = (month) => (month === currentMonth ? 'bg-accent/15' : '');

  return (
    <Section title="Ledger">
      <p className="mb-4 text-sm text-slate-500">
        Who has paid each month. Receipts stay private, only statuses are shown here.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white px-3 py-2 text-left font-medium text-slate-500">
                Member
              </th>
              {months.map((m) => (
                <th key={m.month} className={`px-2 py-2 text-center font-semibold ${current(m.month)}`}>
                  M{m.month}
                </th>
              ))}
            </tr>
            <tr>
              <th className="sticky left-0 bg-white px-3 pb-2 text-left text-xs font-normal text-slate-500">
                Due date
              </th>
              {months.map((m) => (
                <th
                  key={m.month}
                  className={`px-2 pb-2 text-center text-xs font-normal text-slate-500 ${current(m.month)}`}
                >
                  {formatShortDate(m.dueDate)}
                </th>
              ))}
            </tr>
            <tr>
              <th className="sticky left-0 bg-white px-3 pb-2 text-left text-xs font-normal text-slate-500">
                Receives
              </th>
              {months.map((m) => {
                const mine = m.recipient && m.recipient.userId === user.id;
                return (
                  <th
                    key={m.month}
                    title={m.recipient?.name}
                    className={`px-2 pb-2 text-center text-xs ${current(m.month)} ${
                      mine ? 'font-bold text-accent-dark' : 'font-normal text-slate-600'
                    }`}
                  >
                    {mine ? 'You' : firstName(m.recipient?.name)}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {members.map((member) => {
              const isMe = member.userId === user.id;
              const rowBg = isMe ? 'bg-emerald-50' : 'bg-white';
              return (
                <tr key={member.userId}>
                  <td
                    className={`sticky left-0 whitespace-nowrap border-t border-slate-100 px-3 py-2 font-medium ${rowBg}`}
                  >
                    {member.name}
                    {isMe && ' (you)'}
                    <span className="ml-2 text-xs font-normal text-slate-400">#{member.payoutTurn}</span>
                  </td>
                  {member.payments.map((p) => (
                    <td
                      key={p.month}
                      className={`border-t border-slate-100 px-2 py-2 text-center ${
                        isMe ? 'bg-emerald-50' : current(p.month)
                      }`}
                    >
                      <Cell payment={p} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr>
              <td className="sticky left-0 border-t border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500">
                Paid
              </td>
              {months.map((m) => {
                const paid = Math.round(m.collected / circle.monthlyInstallment);
                return (
                  <td
                    key={m.month}
                    title={`${formatMoney(m.collected)} of ${formatMoney(m.expected)}`}
                    className={`border-t border-slate-200 px-2 py-2 text-center text-xs font-semibold ${current(m.month)}`}
                  >
                    {paid}/{members.length}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="sticky left-0 bg-white px-3 py-2 text-xs font-medium text-slate-500">
                Payout
              </td>
              {months.map((m) => {
                const p = PAYOUT[m.payoutStatus];
                return (
                  <td key={m.month} className={`px-2 py-2 text-center ${current(m.month)}`}>
                    {p ? <Badge tone={p.tone}>{p.label}</Badge> : <span className="text-slate-300">—</span>}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
        {Object.entries(CELL).map(([key, c]) => {
          const Icon = c.icon;
          return (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded px-1 ${c.cls}`}>
                {Icon ? <Icon className="h-3 w-3" /> : null}
              </span>
              {key}
            </span>
          );
        })}
      </div>
    </Section>
  );
}