import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Save, Database, Cloud, Mail, Shield, Smartphone } from 'lucide-react';
import { configApi }   from '@/api/endpoints';
import { Button, Input, Card } from '@/components/UI';
import toast from 'react-hot-toast';

interface ConfigSectionProps {
  title:    string;
  icon:     React.ReactNode;
  children: React.ReactNode;
}

function ConfigSection({ title, icon, children }: ConfigSectionProps) {
  return (
    <Card>
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-lg bg-surface-700 p-2.5 text-surface-200">{icon}</div>
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      {children}
    </Card>
  );
}

export default function SettingsPage() {
  const [localConfig, setLocalConfig] = useState<Record<string, string>>({});

  const { data: config = {}, isLoading } = useQuery<Record<string, string>>({
    queryKey: ['app-config'],
    queryFn:  configApi.getAll,
  });

  React.useEffect(() => {
    if (config && Object.keys(config).length > 0) {
      setLocalConfig((prev) => {
        // Merge so we don't wipe out unsaved changes if config refetches
        const merged = { ...config };
        Object.keys(prev).forEach((key) => {
          if (prev[key] !== undefined) {
            merged[key] = prev[key];
          }
        });
        return merged;
      });
    }
  }, [config]);

  // If localConfig is still empty but config is loaded, initialize it
  React.useEffect(() => {
    if (config && Object.keys(localConfig).length === 0) {
      setLocalConfig(config);
    }
  }, [config, localConfig]);

  const saveMutation = useMutation({
    mutationFn: async (updates: Record<string, string>) => {
      await Promise.all(
        Object.entries(updates).map(([key, value]) => configApi.set(key, value)),
      );
    },
    onSuccess: () => toast.success('Settings saved'),
    onError:   () => toast.error('Failed to save settings'),
  });

  const val = (key: string) => localConfig[key] ?? config[key] ?? '';
  const set = (key: string, value: string) =>
    setLocalConfig((prev) => ({ ...prev, [key]: value }));

  const save = (keys: string[]) => {
    const updates = Object.fromEntries(keys.map((k) => [k, localConfig[k] ?? '']));
    saveMutation.mutate(updates);
  };

  if (isLoading) {
    return <div className="py-16 text-center text-surface-300">Loading settings…</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* App Config */}
      <ConfigSection title="App Configuration" icon={<Smartphone size={18} />}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Minimum Android Version"
            value={val('min_android_version')}
            onChange={(e) => set('min_android_version', e.target.value)}
            placeholder="1.0.0"
            hint="Users below this version will be forced to update"
          />
          <Input
            label="Free Trial Days"
            type="number"
            value={val('free_trial_days')}
            onChange={(e) => set('free_trial_days', e.target.value)}
            hint="Number of days for new user free trial"
          />
          <Input
            label="Max Devices Per User"
            type="number"
            value={val('max_devices_per_user')}
            onChange={(e) => set('max_devices_per_user', e.target.value)}
          />
          <Input
            label="HLS Token TTL (seconds)"
            type="number"
            value={val('hls_token_ttl_seconds')}
            onChange={(e) => set('hls_token_ttl_seconds', e.target.value)}
            hint="Signed URL expiry for HLS streams"
          />
          <Input
            label="Max Concurrent Streams"
            type="number"
            value={val('max_concurrent_streams')}
            onChange={(e) => set('max_concurrent_streams', e.target.value)}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-100">
              Maintenance Mode
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={val('maintenance_mode') === 'true'}
                onClick={() =>
                  set('maintenance_mode', val('maintenance_mode') === 'true' ? 'false' : 'true')
                }
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  val('maintenance_mode') === 'true' ? 'bg-red-500' : 'bg-surface-500'
                }`}
              >
                <span className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  val('maintenance_mode') === 'true' ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
              <span className={`text-sm ${val('maintenance_mode') === 'true' ? 'text-red-400' : 'text-surface-300'}`}>
                {val('maintenance_mode') === 'true' ? 'App is in maintenance mode' : 'App is live'}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            icon={<Save size={15} />}
            loading={saveMutation.isPending}
            onClick={() => save(['min_android_version','free_trial_days','max_devices_per_user','hls_token_ttl_seconds','max_concurrent_streams','maintenance_mode'])}
          >
            Save App Config
          </Button>
        </div>
      </ConfigSection>

      {/* Cloudflare R2 */}
      <ConfigSection title="Cloudflare R2 Storage" icon={<Cloud size={18} />}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="R2 Bucket Name"
            value={val('r2_bucket')}
            onChange={(e) => set('r2_bucket', e.target.value)}
            placeholder="ott-media"
          />
          <Input
            label="R2 Public CDN URL"
            value={val('r2_cdn_url')}
            onChange={(e) => set('r2_cdn_url', e.target.value)}
            placeholder="https://ott-media.r2.dev"
          />
          <Input
            label="CF Account ID"
            value={val('cf_account_id')}
            onChange={(e) => set('cf_account_id', e.target.value)}
          />
          <Input
            label="CF Zone ID"
            value={val('cf_zone_id')}
            onChange={(e) => set('cf_zone_id', e.target.value)}
          />
        </div>
        <div className="mt-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-4 py-3">
          <p className="text-xs text-yellow-400">
            ⚠ R2 Access Key and Secret Key are set via environment variables for security. Restart the API container after changing them in .env.
          </p>
        </div>
        <div className="mt-4 flex justify-end">
          <Button icon={<Save size={15} />} loading={saveMutation.isPending}
            onClick={() => save(['r2_bucket','r2_cdn_url','cf_account_id','cf_zone_id'])}>
            Save R2 Config
          </Button>
        </div>
      </ConfigSection>

      {/* SMTP */}
      <ConfigSection title="Email (SMTP)" icon={<Mail size={18} />}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="SMTP Host"
            value={val('smtp_host')}
            onChange={(e) => set('smtp_host', e.target.value)}
            placeholder="smtp.gmail.com"
          />
          <Input
            label="SMTP Port"
            type="number"
            value={val('smtp_port')}
            onChange={(e) => set('smtp_port', e.target.value)}
            placeholder="587"
          />
          <Input
            label="From Address"
            type="email"
            value={val('smtp_from')}
            onChange={(e) => set('smtp_from', e.target.value)}
            placeholder="noreply@ssooss.store"
          />
          <Input
            label="SMTP Username"
            value={val('smtp_user')}
            onChange={(e) => set('smtp_user', e.target.value)}
          />
        </div>
        <p className="mt-2 text-xs text-surface-400">SMTP password is set via environment variable SMTP_PASS.</p>
        <div className="mt-4 flex justify-end">
          <Button icon={<Save size={15} />} loading={saveMutation.isPending}
            onClick={() => save(['smtp_host','smtp_port','smtp_from','smtp_user'])}>
            Save SMTP Config
          </Button>
        </div>
      </ConfigSection>

      {/* TMDB Integration */}
      <ConfigSection title="TMDB Integration" icon={<Database size={18} />}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="TMDB API Key (v3)"
            type="password"
            value={val('tmdb_api_key')}
            onChange={(e) => set('tmdb_api_key', e.target.value)}
            placeholder="Enter your TMDB API Key"
            hint="Used to import movie metadata, posters, and banners"
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button icon={<Save size={15} />} loading={saveMutation.isPending}
            onClick={() => save(['tmdb_api_key'])}>
            Save TMDB Config
          </Button>
        </div>
      </ConfigSection>

      {/* Security Info */}
      <ConfigSection title="Security" icon={<Shield size={18} />}>
        <div className="space-y-3 text-sm text-surface-300">
          {[
            { label: 'JWT Algorithm',         value: 'HS256 (HMAC-SHA256)' },
            { label: 'Access Token TTL',      value: '15 minutes' },
            { label: 'Refresh Token TTL',     value: '30 days' },
            { label: 'HLS Signing Algorithm', value: 'HMAC-SHA256' },
            { label: 'Device Fingerprinting', value: 'Enabled (CF-Connecting-IP + UA)' },
            { label: 'Rate Limiting',         value: 'ThrottlerGuard — 100 req/min' },
            { label: 'Auth Rate Limit',       value: '10 login attempts/min' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between rounded-lg bg-surface-700 px-4 py-2.5">
              <span className="text-surface-400">{label}</span>
              <span className="font-mono text-xs text-surface-100">{value}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-surface-400">
          These settings are configured at the environment level. To change them, update .env and restart the API container.
        </p>
      </ConfigSection>

    </div>
  );
}
