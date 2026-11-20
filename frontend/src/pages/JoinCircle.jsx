import { useState } from 'react';
import { Link } from 'react-router';
import { Check } from 'lucide-react';
import { api } from '../api/client';
import Button from '../components/Button';

const CODE_LENGTH = 6; // matches the backend's invite code generator

export default function JoinCircle() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(null);

  const handleChange = (e) =>
    setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (code.length !== CODE_LENGTH) {
      setError(`The invite code has ${CODE_LENGTH} characters`);
      return;
    }

    setLoading(true);
    try {
      const result = await api('/circles/join', { method: 'POST', body: { inviteCode: code } });
      setJoined(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (joined) {
    return (
      <div className="mx-auto max-w-md rounded-xl bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Check className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Request sent</h1>
        <p className="mt-2 text-slate-600">
          Your request to join <strong>{joined.name}</strong> was sent. The group admin has to approve
          it before you become a member.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            to={`/circles/${joined.circleId}`}
            className="rounded-lg bg-accent px-4 py-2.5 font-semibold text-primary transition hover:bg-accent-dark"
          >
            View circle
          </Link>
          <button
            onClick={() => {
              setJoined(null);
              setCode('');
            }}
            className="rounded-lg border border-slate-300 px-4 py-2.5 font-semibold transition hover:bg-surface"
          >
            Join another circle
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold sm:text-3xl">Join a circle</h1>
      <p className="mt-1 text-slate-600">
        Enter the invite code you received from the group admin.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl bg-white p-5 shadow-sm sm:p-6">
        {error && (
          <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="code" className="mb-1 block text-sm font-medium">
            Invite code
          </label>
          <input
            id="code"
            value={code}
            onChange={handleChange}
            placeholder="K7M2XQ"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-center font-mono text-2xl font-bold tracking-widest outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <Button type="submit" loading={loading}>
          Request to join
        </Button>
      </form>
    </div>
  );
}