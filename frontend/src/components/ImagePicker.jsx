import { useMemo, useEffect } from 'react';

const MAX_SIZE = 5 * 1024 * 1024; // same limit as the server
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ImagePicker({ file, onChange, onError }) {
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handle = (e) => {
    const picked = e.target.files[0];
    onError('');

    if (!picked) {
      onChange(null);
      return;
    }
    if (!TYPES.includes(picked.type)) {
      onError('Please choose a JPG, PNG or WebP image');
      onChange(null);
      return;
    }
    if (picked.size > MAX_SIZE) {
      onError('The image must be smaller than 5 MB');
      onChange(null);
      return;
    }
    onChange(picked);
  };

  return (
    <>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handle}
        className="block w-full text-sm file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-accent file:px-4 file:py-2 file:font-semibold file:text-primary hover:file:bg-accent-dark"
      />
      {preview && (
        <img
          src={preview}
          alt="Preview"
          className="mt-4 max-h-64 w-full rounded-lg border border-slate-200 object-contain"
        />
      )}
    </>
  );
}