import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Mail, Lock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Logo } from '../../components/ui/Logo';
import { useSession } from '../../app/session';

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useSession();
  const navigate = useNavigate();

  const schema = z.object({
    email: z.string().email(t('auth.validation.email')),
    password: z.string().min(6, t('auth.validation.password')),
  });
  type Form = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: Form) => {
    await new Promise((r) => setTimeout(r, 300));
    const name = data.email.split('@')[0].replace(/[._]+/g, ' ').replace(/\b\w/g, (s) => s.toUpperCase());
    login(name || 'Farmer', data.email);
    toast.success(t('auth.welcome', { name: name || 'Farmer' }));
    navigate('/app/dashboard');
  };

  return (
    <AuthShell>
      <Card className="mx-auto w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="text-center text-2xl font-bold text-ink">{t('auth.login.title')}</h1>
        <p className="mt-1 text-center text-sm text-ink-muted">{t('auth.login.subtitle')}</p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4">
          <Input
            label={t('auth.login.email')}
            type="email"
            leadingIcon={<Mail size={16} />}
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label={t('auth.login.password')}
            type="password"
            leadingIcon={<Lock size={16} />}
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
            {t('auth.login.submit')}
          </Button>
        </form>
        <div className="mt-6 text-center text-sm text-ink-muted">
          {t('auth.login.noAccount')}{' '}
          <Link to="/signup" className="font-semibold text-brand hover:underline">
            {t('auth.login.createAccount')}
          </Link>
        </div>
      </Card>
    </AuthShell>
  );
}

export function SignupPage() {
  const { t } = useTranslation();
  const { login } = useSession();
  const navigate = useNavigate();

  const schema = z.object({
    name: z.string().min(2, t('auth.validation.name')),
    email: z.string().email(t('auth.validation.email')),
    password: z.string().min(6, t('auth.validation.password')),
  });
  type Form = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (data: Form) => {
    await new Promise((r) => setTimeout(r, 300));
    login(data.name, data.email);
    toast.success(t('auth.welcome', { name: data.name }));
    navigate('/app/dashboard');
  };

  return (
    <AuthShell>
      <Card className="mx-auto w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="text-center text-2xl font-bold text-ink">{t('auth.signup.title')}</h1>
        <p className="mt-1 text-center text-sm text-ink-muted">{t('auth.signup.subtitle')}</p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4">
          <Input
            label={t('auth.signup.name')}
            autoComplete="name"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label={t('auth.login.email')}
            type="email"
            leadingIcon={<Mail size={16} />}
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label={t('auth.login.password')}
            type="password"
            leadingIcon={<Lock size={16} />}
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
            {t('auth.signup.submit')}
          </Button>
        </form>
        <div className="mt-6 text-center text-sm text-ink-muted">
          {t('auth.signup.haveAccount')}{' '}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            {t('auth.signup.login')}
          </Link>
        </div>
      </Card>
    </AuthShell>
  );
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-16rem)] bg-gradient-to-br from-brand-50 via-white to-surface-2 py-12 md:py-20">
      <div className="container-page">{children}</div>
    </div>
  );
}
