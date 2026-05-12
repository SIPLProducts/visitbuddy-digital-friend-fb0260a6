import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building2, Palette, Shield, FileText, Database, Save, Check, Bell, HelpCircle, RotateCcw, Settings as SettingsIcon, Clock, Globe, Mail, Trash2, Send, Eye, EyeOff, AlertTriangle, MessageCircle, QrCode, Loader2, Power } from 'lucide-react';
import { toast } from 'sonner';
import { logAudit } from '@/lib/auditLog';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { languages } from '@/i18n';
import { useUserRoles } from '@/hooks/useUserRoles';
import { WhatsAppSettingsPanel } from '@/components/settings/WhatsAppSettingsPanel';

interface TenantSettings {
  id: string;
  company_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  badge_logo_url: string | null;
  badge_footer_text: string;
  email_header_text: string;
  email_footer_text: string;
  nda_text: string;
  session_timeout_minutes: number;
  data_retention_days: number;
  auto_checkout_hours: number;
  enable_nda: boolean;
  enable_photo_capture: boolean;
  enable_watchlist_check: boolean;
  whatsapp_provider: 'twilio' | 'whatsapp_web';
  public_app_url?: string | null;
}

interface EmailConfig {
  id?: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  sender_name: string;
  sender_email: string;
  use_tls: boolean;
}

const defaultEmailConfig: EmailConfig = {
  smtp_host: '',
  smtp_port: 587,
  smtp_username: '',
  smtp_password: '',
  sender_name: '',
  sender_email: '',
  use_tls: true,
};

export default function Settings() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { isHoAdmin, loading: rolesLoading } = useUserRoles();
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Email config state
  const [emailConfig, setEmailConfig] = useState<EmailConfig>(defaultEmailConfig);
  const [emailConfigLoading, setEmailConfigLoading] = useState(true);
  const [emailConfigExists, setEmailConfigExists] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    supabase.from('tenant_settings').select('*').limit(1).single()
      .then(({ data }) => {
        if (data) setSettings(data as any);
        setLoading(false);
      });

    // Load email config
    supabase.from('email_config' as any).select('*').limit(1).single()
      .then(({ data, error }: any) => {
        if (data && !error) {
          setEmailConfig(data);
          setEmailConfigExists(true);
        }
        setEmailConfigLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const { id, ...updates } = settings;
    const { error } = await supabase.from('tenant_settings').update(updates as any).eq('id', id);
    setSaving(false);
    if (error) {
      toast.error('Failed to save settings');
    } else {
      toast.success('Settings saved successfully');
      await logAudit({ action: 'settings_changed', entityType: 'settings', entityName: 'Tenant Settings', details: { updated_fields: Object.keys(updates) } });
    }
  };

  const handleSaveEmailConfig = async () => {
    if (!emailConfig.smtp_host || !emailConfig.smtp_username || !emailConfig.sender_email) {
      toast.error('Please fill in SMTP Host, Username, and Sender Email');
      return;
    }
    setSavingEmail(true);
    try {
      if (emailConfigExists && emailConfig.id) {
        const { id, ...updates } = emailConfig;
        const { error } = await (supabase.from('email_config' as any) as any).update(updates).eq('id', id);
        if (error) throw error;
      } else {
        const { id, ...insertData } = emailConfig;
        const { data, error } = await (supabase.from('email_config' as any) as any).insert(insertData).select().single();
        if (error) throw error;
        setEmailConfig(data);
        setEmailConfigExists(true);
      }
      toast.success('Email configuration saved successfully');
      await logAudit({ action: 'email_config_saved', entityType: 'settings', entityName: 'Email Configuration' });
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    }
    setSavingEmail(false);
  };

  const handleTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-smtp', {
        body: { to_email: testEmail },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data?.message || 'Test email sent successfully!');
      setTestDialogOpen(false);
      setTestEmail('');
    } catch (error: any) {
      toast.error(`Test failed: ${error.message}`);
    }
    setSendingTest(false);
  };

  const handleDeleteEmailConfig = async () => {
    if (!emailConfig.id) return;
    try {
      const { error } = await (supabase.from('email_config' as any) as any).delete().eq('id', emailConfig.id);
      if (error) throw error;
      setEmailConfig(defaultEmailConfig);
      setEmailConfigExists(false);
      setDeleteDialogOpen(false);
      toast.success('Email configuration deleted');
      await logAudit({ action: 'email_config_deleted', entityType: 'settings', entityName: 'Email Configuration' });
    } catch (error: any) {
      toast.error(`Failed to delete: ${error.message}`);
    }
  };

  const update = (key: keyof TenantSettings, value: any) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
  };

  // Immediately persist a single field to the DB (used for toggles where there's no Save button).
  const updateAndPersist = async (key: keyof TenantSettings, value: any) => {
    if (!settings) return;
    const previous = settings[key];
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
    const { error } = await supabase
      .from('tenant_settings')
      .update({ [key]: value } as any)
      .eq('id', settings.id);
    if (error) {
      // Revert on failure
      setSettings(prev => prev ? { ...prev, [key]: previous } : null);
      toast.error(`Failed to update ${String(key)}`);
      return;
    }
    if (key === 'whatsapp_provider') {
      toast.success(
        value === 'whatsapp_web'
          ? 'Switched to WhatsApp Web (Demo)'
          : 'Switched to Twilio (Production)'
      );
    }
    await logAudit({
      action: 'settings_changed',
      entityType: 'settings',
      entityName: 'Tenant Settings',
      details: { updated_fields: [String(key)], value },
    });
  };

  const updateEmail = (key: keyof EmailConfig, value: any) => {
    setEmailConfig(prev => ({ ...prev, [key]: value }));
  };

  if (loading || !settings) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div>;
  }

  return (
      <div className="max-w-4xl mx-auto space-y-6">
         <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><SettingsIcon className="h-6 w-6 text-primary" /> {t('settings.title')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t('settings.subtitle')}</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Check className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? t('settings.saving') : t('settings.saveAll')}
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="general" className="gap-1.5"><Building2 className="h-4 w-4" /> {t('settings.general')}</TabsTrigger>
            <TabsTrigger value="branding" className="gap-1.5"><Palette className="h-4 w-4" /> {t('settings.branding')}</TabsTrigger>
            <TabsTrigger value="policies" className="gap-1.5"><FileText className="h-4 w-4" /> {t('settings.policies')}</TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5"><Shield className="h-4 w-4" /> {t('settings.security')}</TabsTrigger>
            <TabsTrigger value="email" className="gap-1.5"><Mail className="h-4 w-4" /> Email</TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-1.5"><MessageCircle className="h-4 w-4" /> WhatsApp</TabsTrigger>
            <TabsTrigger value="data" className="gap-1.5"><Database className="h-4 w-4" /> {t('settings.data')}</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5"><Bell className="h-4 w-4" /> {t('settings.notifications')}</TabsTrigger>
            <TabsTrigger value="help" className="gap-1.5"><HelpCircle className="h-4 w-4" /> {t('settings.help')}</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.organizationDetails')}</CardTitle>
                <CardDescription>Configure your organization's basic information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('settings.companyName')}</Label>
                    <Input value={settings.company_name} onChange={e => update('company_name', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.companyLogo')}</Label>
                    <Input value={settings.logo_url || ''} onChange={e => update('logo_url', e.target.value)} placeholder="https://..." />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('settings.timezone')}</Label>
                    <Select defaultValue="asia-kolkata">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="asia-kolkata">Asia/Kolkata (IST)</SelectItem>
                        <SelectItem value="america-new_york">America/New_York (EST)</SelectItem>
                        <SelectItem value="europe-london">Europe/London (GMT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.dateFormat')}</Label>
                    <Select defaultValue="dd-mm-yyyy">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="dd-mm-yyyy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="mm-dd-yyyy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>{t('settings.language')}</Label>
                  <Select value={i18n.language} onValueChange={lng => i18n.changeLanguage(lng)}>
                    <SelectTrigger className="w-full md:w-64"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      {languages.map(l => <SelectItem key={l.code} value={l.code}>{l.nativeName} ({l.name})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Public app URL</Label>
                  <Input
                    value={settings.public_app_url || ''}
                    onChange={e => update('public_app_url', e.target.value)}
                    placeholder="https://vms.your-domain.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used in approval links sent by email / WhatsApp / SMS when the system can't detect the browser domain (e.g. cron jobs). Leave blank to auto-detect from the request origin.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Branding Tab */}
          <TabsContent value="branding">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.branding')}</CardTitle>
                <CardDescription>Customize the look and feel of the application</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('settings.primaryColor')}</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={settings.primary_color} onChange={e => update('primary_color', e.target.value)} className="w-12 h-10 p-1 cursor-pointer" />
                      <Input value={settings.primary_color} onChange={e => update('primary_color', e.target.value)} className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.secondaryColor')}</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={settings.secondary_color} onChange={e => update('secondary_color', e.target.value)} className="w-12 h-10 p-1 cursor-pointer" />
                      <Input value={settings.secondary_color} onChange={e => update('secondary_color', e.target.value)} className="flex-1" />
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('settings.badgeLogo')}</Label>
                    <Input value={settings.badge_logo_url || ''} onChange={e => update('badge_logo_url', e.target.value)} placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.badgeFooter')}</Label>
                    <Input value={settings.badge_footer_text} onChange={e => update('badge_footer_text', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('settings.emailHeader')}</Label>
                    <Input value={settings.email_header_text} onChange={e => update('email_header_text', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.emailFooter')}</Label>
                    <Input value={settings.email_footer_text} onChange={e => update('email_footer_text', e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Policies Tab */}
          <TabsContent value="policies">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.ndaSettings')}</CardTitle>
                <CardDescription>Configure visitor agreements and policies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div><p className="font-medium">{t('settings.enableNda')}</p><p className="text-sm text-muted-foreground">Require visitors to sign NDA</p></div>
                  <Switch checked={settings.enable_nda} onCheckedChange={v => update('enable_nda', v)} />
                </div>
                {settings.enable_nda && (
                  <div className="space-y-2">
                    <Label>{t('settings.ndaText')}</Label>
                    <Textarea rows={6} value={settings.nda_text} onChange={e => update('nda_text', e.target.value)} />
                  </div>
                )}
                <Separator />
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div><p className="font-medium">{t('settings.photoCapture')}</p><p className="text-sm text-muted-foreground">Capture visitor photos during check-in</p></div>
                  <Switch checked={settings.enable_photo_capture} onCheckedChange={v => update('enable_photo_capture', v)} />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div><p className="font-medium">{t('settings.watchlistCheck')}</p><p className="text-sm text-muted-foreground">Check visitors against watchlist</p></div>
                  <Switch checked={settings.enable_watchlist_check} onCheckedChange={v => update('enable_watchlist_check', v)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.sessionSettings')}</CardTitle>
                <CardDescription>Configure security and session parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('settings.sessionTimeout')}</Label>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Input type="number" value={settings.session_timeout_minutes} onChange={e => update('session_timeout_minutes', parseInt(e.target.value) || 30)} min={5} max={480} />
                      <span className="text-sm text-muted-foreground">min</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.autoCheckout')}</Label>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Input type="number" value={settings.auto_checkout_hours} onChange={e => update('auto_checkout_hours', parseInt(e.target.value) || 12)} min={1} max={72} />
                      <span className="text-sm text-muted-foreground">hrs</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Configuration Tab */}
          <TabsContent value="email">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Email Configuration</CardTitle>
                    <CardDescription>Configure SMTP settings for sending emails from the application</CardDescription>
                  </div>
                  {emailConfigExists && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">Configured</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium">SMTP Configuration</p>
                  <p className="text-xs text-muted-foreground">
                    All emails are sent via SMTP using the credentials below. For Gmail, you must use a 16-character{' '}
                    <strong>App Password</strong> (not your regular account password).
                  </p>
                </div>

                {emailConfigLoading ? (
                  <p className="text-muted-foreground">Loading email configuration...</p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>SMTP Host <span className="text-destructive">*</span></Label>
                        <Input
                          value={emailConfig.smtp_host}
                          onChange={e => updateEmail('smtp_host', e.target.value)}
                          placeholder="smtp.gmail.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>SMTP Port <span className="text-destructive">*</span></Label>
                        <Input
                          type="number"
                          value={emailConfig.smtp_port}
                          onChange={e => updateEmail('smtp_port', parseInt(e.target.value) || 587)}
                          placeholder="587"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>SMTP Username <span className="text-destructive">*</span></Label>
                        <Input
                          value={emailConfig.smtp_username}
                          onChange={e => updateEmail('smtp_username', e.target.value)}
                          placeholder="your-email@gmail.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>SMTP Password <span className="text-destructive">*</span></Label>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            value={emailConfig.smtp_password}
                            onChange={e => updateEmail('smtp_password', e.target.value)}
                            placeholder="••••••••"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Sender Name</Label>
                        <Input
                          value={emailConfig.sender_name}
                          onChange={e => updateEmail('sender_name', e.target.value)}
                          placeholder="VisiGuard VMS"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Sender Email <span className="text-destructive">*</span></Label>
                        <Input
                          type="email"
                          value={emailConfig.sender_email}
                          onChange={e => updateEmail('sender_email', e.target.value)}
                          placeholder="noreply@yourcompany.com"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div>
                        <p className="font-medium">Use TLS</p>
                        <p className="text-sm text-muted-foreground">Enable TLS encryption for SMTP connection</p>
                      </div>
                      <Switch checked={emailConfig.use_tls} onCheckedChange={v => updateEmail('use_tls', v)} />
                    </div>

                    <Separator />

                    {!rolesLoading && !isHoAdmin && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        Only HO Admins can manage email configuration.
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                      <Button onClick={handleSaveEmailConfig} disabled={savingEmail || !isHoAdmin} className="gap-1.5">
                        {savingEmail ? <Check className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {savingEmail ? 'Saving...' : emailConfigExists ? 'Update Configuration' : 'Save Configuration'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setTestDialogOpen(true)}
                        disabled={!emailConfigExists || !isHoAdmin}
                        className="gap-1.5"
                      >
                        <Send className="h-4 w-4" /> Send Test Email
                      </Button>
                      {emailConfigExists && (
                        <Button
                          variant="destructive"
                          onClick={() => setDeleteDialogOpen(true)}
                          disabled={!isHoAdmin}
                          className="gap-1.5"
                        >
                          <Trash2 className="h-4 w-4" /> Delete Configuration
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* WhatsApp Tab */}
          <TabsContent value="whatsapp">
            <WhatsAppSettingsPanel
              provider={settings.whatsapp_provider ?? 'twilio'}
              onProviderChange={(p) => updateAndPersist('whatsapp_provider', p)}
            />
          </TabsContent>


          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.dataRetention')}</CardTitle>
                <CardDescription>Manage data lifecycle and retention policies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>{t('settings.retentionPeriod')}</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" value={settings.data_retention_days} onChange={e => update('data_retention_days', parseInt(e.target.value) || 90)} min={30} max={365} />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Visitor records older than this will be auto-purged</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose how you'd like to be notified</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">Push Notifications</p><p className="text-sm text-muted-foreground">Receive browser push notifications</p></div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">Email Notifications</p><p className="text-sm text-muted-foreground">Receive daily summary via email</p></div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Help Tab */}
          <TabsContent value="help">
            <Card>
              <CardHeader>
                <CardTitle>Help & Support</CardTitle>
                <CardDescription>Get help and learn how to use VisiGuard</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                  <div><p className="font-medium">Product Tour</p><p className="text-sm text-muted-foreground">Restart the onboarding tour</p></div>
                  <Button variant="outline" className="gap-2" onClick={() => { localStorage.removeItem('visiguard_onboarding_completed'); toast.success('Tour reset! Refresh the page to start the tour.'); }}>
                    <RotateCcw className="h-4 w-4" /> Restart Tour
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div><p className="font-medium">Documentation</p><p className="text-sm text-muted-foreground">Read the complete user guide and FAQs</p></div>
                  <Button variant="outline">View Docs</Button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div><p className="font-medium">Contact Support</p><p className="text-sm text-muted-foreground">Get help from our support team</p></div>
                  <Button variant="outline">Contact Us</Button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-primary/5 to-info/5">
                  <div><p className="font-medium">Product Proposal</p><p className="text-sm text-muted-foreground">View and download the VisiGuard VMS proposal document</p></div>
                  <Button onClick={() => navigate('/proposal-document')} className="gap-2"><FileText className="h-4 w-4" /> View Proposal</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Test Email Dialog */}
        <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> Send Test Email</DialogTitle>
              <DialogDescription>Enter the recipient email address to send a test email.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Receiver Email</Label>
                <Input
                  type="email"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  onKeyDown={e => e.key === 'Enter' && handleTestEmail()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTestDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleTestEmail} disabled={sendingTest} className="gap-1.5">
                {sendingTest ? <Check className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sendingTest ? 'Sending...' : 'Send Test'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> Delete Email Configuration</DialogTitle>
              <DialogDescription>Are you sure you want to delete the email configuration? This will disable all email sending functionality in the application.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteEmailConfig} className="gap-1.5">
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
