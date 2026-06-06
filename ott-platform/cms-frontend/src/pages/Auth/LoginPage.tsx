import React, { useState } from 'react';
import { useNavigate }       from 'react-router-dom';
import { useForm }           from 'react-hook-form';
import { zodResolver }       from '@hookform/resolvers/zod';
import { z }                 from 'zod';
import { PlaySquare, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { authApi }           from '@/api/endpoints';
import { useAuthStore }      from '@/stores/auth.store';
import { Button, Input }     from '@/components/UI';
import toast                 from 'react-hot-toast';

const schema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate        = useNavigate();
  const { setAuth }     = useAuthStore();
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const result = await authApi.login(data.email, data.password);

      if (result.user.role === 'user') {
        toast.error('Access denied. Admin accounts only.');
        return;
      }

      setAuth(result.user, result.tokens.accessToken, result.tokens.refreshToken);
      toast.success(`Welcome back, ${result.user.displayName || result.user.email}`);
      navigate('/');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Invalid email or password';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-900 px-4">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-brand-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/20 border border-brand-500/30">
            <PlaySquare size={36} className="text-brand-500" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">OTT Admin</h1>
          <p className="mt-2 text-sm text-surface-300">Sign in to manage your platform</p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-surface-700 bg-surface-800 p-8 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            <Input
              label="Email Address"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="admin@ssooss.store"
              leftIcon={<Mail size={15} />}
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-surface-100">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-300" />
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`w-full rounded-lg border bg-surface-700 pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-surface-300 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
                    errors.password ? 'border-red-500' : 'border-surface-500 hover:border-surface-400'
                  }`}
                  {...register('password')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              size="lg"
              loading={isLoading}
              className="w-full"
            >
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-surface-400">
            Admin access only. If you don't have an account, contact your system administrator.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-surface-500">
          ssooss.store OTT Platform · Admin Panel v1.0
        </p>
      </div>
    </div>
  );
}
