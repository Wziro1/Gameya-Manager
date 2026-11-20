import { useState, useEffect } from 'react';
import { apiBlobUrl } from '../api/client';
import Modal from './Modal';
import Spinner from './Spinner';

export default function ReceiptViewer({ path, title = 'Receipt', onClose }) {
  const [state, setState] = useState({ url: null, error: '' });

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;

    apiBlobUrl(path)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setState({ url, error: '' });
      })
      .catch((err) => {
        if (!cancelled) setState({ url: null, error: err.message });
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl); // free the memory
    };
  }, [path]);

  return (
    <Modal title={title} onClose={onClose}>
      {!state.url && !state.error && <Spinner />}
      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.url && (
        <img
          src={state.url}
          alt="Uploaded receipt"
          className="max-h-[70vh] w-full rounded-lg object-contain"
        />
      )}
    </Modal>
  );
}