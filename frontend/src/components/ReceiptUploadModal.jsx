import { useState, useMemo, useEffect } from 'react';
import { api } from '../api/client';
import { formatMoney } from '../utils/format';
import Modal from './Modal';
import Button from './Button';

const MAX_SIZE = 5 * 1024 * 1024; // same limit as the server
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ReceiptUploadModal({ circleId, month, amount, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFile = (e) => {
    const picked = e.target.files[0];
    setError('');

    if (!picked) {
      setFile(null);
      return;
    }
    if (!TYPES.includes(picked.type)) {
      setError('Please choose a JPG, PNG or WebP image');
      setFile(null);
      return;
    }
    if (picked.size > MAX_SIZE) {
      setError('The image must be smaller than 5 MB');
      setFile(null);
      return;
    }
    setFile(picked);
  };

  const submit = async () => {
    if (!file) {
      setError('Choose your receipt image first');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('circleId', circleId);
    formData.append('monthNumber', String(month));
    formData.append('receipt', file);

    try {
      await api('/payments', { method: 'POST', formData });
      onDone();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <Modal title={`Upload receipt · Month ${month}`} onClose={onClose}>
      <p className="text-sm text-slate-600">
        Amount to pay: <strong>{formatMoney(amount)}</strong>. Upload a screenshot or photo of your
        transfer so the admin can verify it.
      </p>

      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        className="mt-4 block w-full text-sm file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-accent file:px-4 file:py-2 file:font-semibold file:text-primary hover:file:bg-accent-dark"
      />

      {preview && (
        <img
          src={preview}
          alt="Receipt preview"
          className="mt-4 max-h-64 w-full rounded-lg border border-slate-200 object-contain"
        />
      )}

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
          Submit receipt
        </Button>
      </div>
    </Modal>
  );
}