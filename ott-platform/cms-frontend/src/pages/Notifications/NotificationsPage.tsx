import React from 'react';
import { useForm }         from 'react-hook-form';
import { useMutation }     from '@tanstack/react-query';
import { Send, Bell, Users, Hash } from 'lucide-react';
import { notificationsApi }        from '@/api/endpoints';
import { Button, Input, Textarea, Select, Card } from '@/components/UI';
import toast from 'react-hot-toast';

interface NotifForm {
  title:    string;
  body:     string;
  type:     string;
  target:   'all' | 'topic' | 'users';
  topic:    string;
  userIds:  string;
}

export default function NotificationsPage() {
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<NotifForm>({
    defaultValues: { target: 'all', topic: 'general', type: 'general' },
  });

  const target = watch('target');

  const mutation = useMutation({
    mutationFn: (data: NotifForm) =>
      notificationsApi.send({
        title:   data.title,
        body:    data.body,
        type:    data.type,
        topic:   data.target === 'topic' ? data.topic : undefined,
        userIds: data.target === 'users'
          ? data.userIds.split('\n').map((s) => s.trim()).filter(Boolean)
          : undefined,
      }),
    onSuccess: () => {
      toast.success('Notification sent');
      reset();
    },
    onError: () => toast.error('Failed to send notification'),
  });

  const PRESETS = [
    { label: 'New Release', title: '🎬 New Content Added!', body: 'Check out the latest movies and series on OTT.' },
    { label: 'Continue Watching', title: '▶ Continue Watching', body: 'Pick up where you left off. Your watchlist is waiting.' },
    { label: 'Subscription Expiry', title: '⏰ Subscription Expiring Soon', body: 'Renew your subscription to keep watching unlimited content.' },
    { label: 'Weekend Special', title: '🎉 Weekend Special', body: 'Enjoy binge-worthy content this weekend. New series available!' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Compose Form */}
        <div className="lg:col-span-2">
          <Card>
            <h3 className="mb-5 font-semibold text-white">Send Push Notification</h3>

            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">

              <Input
                label="Title"
                required
                placeholder="Notification title…"
                error={errors.title?.message}
                {...register('title', { required: 'Title is required' })}
              />

              <Textarea
                label="Message"
                required
                placeholder="Notification body text…"
                rows={4}
                error={errors.body?.message}
                {...register('body', { required: 'Message is required' })}
              />

              <Select
                label="Notification Type"
                options={[
                  { value: 'general',      label: 'General' },
                  { value: 'new_content',  label: 'New Content' },
                  { value: 'promotion',    label: 'Promotion' },
                  { value: 'subscription', label: 'Subscription' },
                  { value: 'reminder',     label: 'Reminder' },
                ]}
                {...register('type')}
              />

              <div>
                <p className="mb-2 text-sm font-medium text-surface-100">Send To</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'all',   label: 'All Users',   icon: <Users size={14} /> },
                    { value: 'topic', label: 'Topic',       icon: <Hash size={14} /> },
                    { value: 'users', label: 'Specific Users', icon: <Bell size={14} /> },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-center transition-colors ${
                        target === opt.value
                          ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                          : 'border-surface-600 text-surface-300 hover:border-surface-500'
                      }`}
                    >
                      <input type="radio" value={opt.value} className="sr-only" {...register('target')} />
                      {opt.icon}
                      <span className="text-xs font-medium">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {target === 'topic' && (
                <Select
                  label="FCM Topic"
                  options={[
                    { value: 'general',        label: 'general — All users' },
                    { value: 'premium',        label: 'premium — Subscribers' },
                    { value: 'new_release',    label: 'new_release — Release alerts' },
                    { value: 'hindi',          label: 'hindi — Hindi content' },
                    { value: 'english',        label: 'english — English content' },
                  ]}
                  {...register('topic')}
                />
              )}

              {target === 'users' && (
                <Textarea
                  label="User IDs"
                  placeholder="One user UUID per line…"
                  rows={5}
                  hint="Paste one user ID per line. Max 500 users per batch."
                  {...register('userIds')}
                />
              )}

              <Button
                type="submit"
                icon={<Send size={16} />}
                loading={mutation.isPending}
                className="w-full"
              >
                Send Notification
              </Button>
            </form>
          </Card>
        </div>

        {/* Presets */}
        <div className="space-y-4">
          <Card>
            <h3 className="mb-4 font-semibold text-white">Quick Presets</h3>
            <div className="space-y-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    // fill the form with preset values via RHF setValue
                    document.dispatchEvent(new CustomEvent('preset', { detail: preset }));
                  }}
                  className="w-full rounded-lg border border-surface-600 px-4 py-3 text-left hover:border-brand-500/50 hover:bg-surface-700 transition-colors"
                >
                  <p className="text-sm font-medium text-white">{preset.label}</p>
                  <p className="mt-0.5 truncate text-xs text-surface-400">{preset.body}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="mb-3 font-semibold text-white">FCM Topics</h3>
            <div className="space-y-2 text-xs text-surface-300">
              <p>Users subscribe to topics in the Android app. Topics available:</p>
              <ul className="mt-2 space-y-1">
                {['general', 'premium', 'new_release', 'hindi', 'english', 'tamil', 'telugu'].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                    <code className="text-surface-200">{t}</code>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
