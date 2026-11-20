import { useState, useEffect } from 'react';
import { api } from '../api/client';

// Loads GET `path` (pass null to skip). Re-fetches when the path changes,
// on reload() (shows the spinner again) or on refresh() (silent, keeps data on screen).
export function useApi(path) {
  const [result, setResult] = useState({ path: null, data: null, error: '' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!path) return undefined;
    let cancelled = false;

    api(path)
      .then((data) => {
        if (!cancelled) setResult({ path, data, error: '' });
      })
      .catch((err) => {
        if (!cancelled) setResult({ path, data: null, error: err.message });
      });

    return () => {
      cancelled = true; // ignore results from outdated requests
    };
  }, [path, reloadKey]);

  const reload = () => {
    setResult({ path: null, data: null, error: '' });
    setReloadKey((k) => k + 1);
  };

  const refresh = () => setReloadKey((k) => k + 1);

  return {
    data: path ? result.data : null,
    error: path ? result.error : '',
    loading: Boolean(path) && result.path !== path,
    reload,
    refresh,
  };
}