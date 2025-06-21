import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface FormState {
  email: string;
  password: string;
  confirm?: string;
}

const SignInPage: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState<FormState>({ email: '', password: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isRegister) {
        if (form.password !== form.confirm) {
          setError('Passwords do not match');
          return;
        }
        await register({ email: form.email, password: form.password });
      } else {
        await login({ email: form.email, password: form.password });
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
      <button
        className="absolute top-4 left-4 text-gray-300 hover:text-white"
        onClick={() => navigate('/')}
      >
        &larr; Back to Chat
      </button>

      <div className="w-full max-w-md bg-gray-800 rounded-lg p-8 shadow-md">
        <h2 className="text-2xl font-semibold text-center mb-6 text-blue-500">
          {isRegister ? 'Create Account' : 'Sign In'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={form.password}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          {isRegister && (
            <div>
              <label className="block text-sm mb-1" htmlFor="confirm">Confirm Password</label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                required
                value={form.confirm}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-medium transition-colors"
          >
            {isRegister ? 'Register' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          {isRegister ? (
            <>Already have an account?{' '}
              <button className="text-blue-400 hover:underline" onClick={() => setIsRegister(false)}>
                Sign in
              </button>
            </>
          ) : (
            <>Need an account?{' '}
              <button className="text-blue-400 hover:underline" onClick={() => setIsRegister(true)}>
                Register
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
