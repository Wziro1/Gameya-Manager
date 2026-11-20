import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../api/client';
import { formatMoney } from '../utils/format';
import Input from '../components/Input';
import Button from '../components/Button';

export default function CreateCircle() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', monthlyInstallment: '', durationMonths: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const installment = Number(form.monthlyInstallment);
  const months = Number(form.durationMonths);
  const amountsValid = installment > 0 && Number.isInteger(months) && months >= 2 && months <= 60;

  const validate = () => {
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Give your circle a name';
    if (!(installment > 0)) errs.monthlyInstallment = 'Enter an amount greater than 0';
    if (!Number.isInteger(months) || months < 2 || months > 60) {
      errs.durationMonths = 'Enter a whole number between 2 and 60';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const { circle } = await api('/circles', {
        method: 'POST',
        body: { name: form.name.trim(), monthlyInstallment: installment, durationMonths: months },
      });
      navigate(`/circles/${circle._id}`);
    } catch (err) {
      setServerError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold sm:text-3xl">New circle</h1>
      <p className="mt-1 text-slate-600">
        Each member pays the same amount every month, and one member receives the full pot each month.
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-6 space-y-4 rounded-xl bg-white p-5 shadow-sm sm:p-6"
      >
        {serverError && (
          <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <Input id="name" name="name" label="Circle name" placeholder="e.g. Office Gameya"
          value={form.name} onChange={handleChange} error={errors.name} />
        <Input id="monthlyInstallment" name="monthlyInstallment" type="number" inputMode="decimal"
          min="1" label="Monthly installment (EGP)" placeholder="e.g. 1000"
          value={form.monthlyInstallment} onChange={handleChange} error={errors.monthlyInstallment} />
        <Input id="durationMonths" name="durationMonths" type="number" inputMode="numeric"
          min="2" max="60" step="1" label="Duration in months (= number of members)" placeholder="e.g. 10"
          value={form.durationMonths} onChange={handleChange} error={errors.durationMonths} />

        {amountsValid && (
          <div className="rounded-lg bg-surface p-4 text-sm text-slate-700">
            <p>
              Every member pays <strong>{formatMoney(installment)}</strong> each month.
            </p>
            <p className="mt-1">
              Each month one member receives <strong>{formatMoney(installment * months)}</strong> (
              {formatMoney(installment)} × {months} members).
            </p>
            <p className="mt-1">
              The circle runs for <strong>{months} months</strong> and needs exactly {months} members.
            </p>
          </div>
        )}

        <Button type="submit" loading={loading}>
          Create circle
        </Button>
      </form>
    </div>
  );
}