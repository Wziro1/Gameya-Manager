import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';
import Input from '../components/Input';
import Button from '../components/Button';

const validate = (f) => {
  const errs = {};
  if (f.name.trim().length < 2) errs.name = 'Please enter your full name';
  if (!/^\S+@\S+\.\S+$/.test(f.email)) errs.email = 'Enter a valid email address';
  if (!/^\+?\d{10,15}$/.test(f.phone.replace(/[\s-]/g, ''))) errs.phone = 'Enter a valid phone number';
  if (f.password.length < 6) errs.password = 'Password must be at least 6 characters';
  if (f.password !== f.confirm) errs.confirm = 'Passwords do not match';
  return errs;
};

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });
    } catch (err) {
      setServerError(err.message);
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="One account for every circle you create or join."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-accent-dark hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {serverError && (
          <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </div>
        )}
        <Input id="name" name="name" label="Full name" autoComplete="name"
          value={form.name} onChange={handleChange} error={errors.name} />
        <Input id="email" name="email" type="email" label="Email" autoComplete="email"
          value={form.email} onChange={handleChange} error={errors.email} />
        <Input id="phone" name="phone" type="tel" label="Phone" autoComplete="tel"
          value={form.phone} onChange={handleChange} error={errors.phone} />
        <Input id="password" name="password" type="password" label="Password" autoComplete="new-password"
          value={form.password} onChange={handleChange} error={errors.password} />
        <Input id="confirm" name="confirm" type="password" label="Confirm password" autoComplete="new-password"
          value={form.confirm} onChange={handleChange} error={errors.confirm} />
        <Button type="submit" loading={loading}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}