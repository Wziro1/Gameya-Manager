import { useState } from 'react';
import { api } from '../api/client';
import { formatMoney } from '../utils/format';
import Modal from './Modal';
import Button from './Button';
import ImagePicker from './ImagePicker';

export default function SendPayoutModal({
  circleId,
  month,
  recipientName,
  collected,
  expected,
  resend,
  onClose,
  onDone,
}) {
  const [file, setFile] = useState(null);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const partial = collected < expected;

  const submit = async () => {
    if (!file) {
      setError('Upload the transfer proof first');
      return;
    }
    if (partial && !agree) {
      setError('Please confirm that you want to send the partial amount');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('circleId', circleId);
    formData.append('monthNumber', String(month));
    formData.append('allowShortfall', String(partial));
    formData.append('receipt', file);

    try {
      const res = await api('/payouts', { method: 'POST', formData });
      onDone(res);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <Modal title={`${resend ? 'Send again' : 'Send payout'} · Month ${month}`} onClose={onClose}>
      <p className="text-slate-700">
        Send <strong>{formatMoney(collected)}</strong> to <strong>{recipientName}</strong>, then upload
        the proof of your transfer.
      </p>
      {resend && (
        <p className="mt-2 text-sm text-slate-500">This replaces your previous proof for this month.</p>
      )}

      {partial ? (
        <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">Only part of this month was collected</p>
          <p className="mt-1">
            {formatMoney(collected)} of {formatMoney(expected)} was verified, so the recipient would
            receive {formatMoney(expected - collected)} less than the full pot.
          </p>
          <label className="mt-3 flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-emerald-600"
            />
            <span>I understand and want to send the partial amount.</span>
          </label>
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Every member paid for this month.
        </p>
      )}

      <div className="mt-4">
        <ImagePicker file={file} onChange={setFile} onError={setError} />
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" fullWidth={false} onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button fullWidth={false} loading={loading} onClick={submit}>
          {resend ? 'Send again' : 'Send payout'}
        </Button>
      </div>
    </Modal>
  );
}