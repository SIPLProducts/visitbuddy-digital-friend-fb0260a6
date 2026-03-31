import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
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
import { Building2, Palette, Shield, FileText, Database, Save, Check, Bell, HelpCircle, RotateCcw, Settings as SettingsIcon, Clock, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { logAudit } from '@/lib/auditLog';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { languages } from '@/i18n';

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
  checkout_warning_hour: number;
  security_contact_number: string | null;
}

export default function Settings() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('tenant_settings').select('*').limit(1).single()
      .then(({ data }) => {
        if (data) setSettings({ ...data, checkout_warning_hour: (data as any).checkout_warning_hour ?? 18, security_contact_number: (data as any).security_contact_number ?? null } as any);
        setLoading(false);
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

  const update = (key: keyof TenantSettings, value: any) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
  };

  if (loading || !settings) {
    return <MainLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div></MainLayout>;
  }

  return (
    <MainLayout>
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
            <TabsTrigger value="data" className="gap-1.5"><Database className="h-4 w-4" /> {t('settings.data')}</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5"><Bell className="h-4 w-4" /> {t('settings.notifications')}</TabsTrigger>
            <TabsTrigger value="help" className="gap-1.5"><HelpCircle className="h-4 w-4" /> {t('settings.help')}</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Organization Details</CardTitle>
                <CardDescription>Configure your organization's basic information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input value={settings.company_name} onChange={e => update('company_name', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Company Logo URL</Label>
                    <Input value={settings.logo_url || ''} onChange={e => update('logo_url', e.target.value)} placeholder="https://..." />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Timezone</Label>
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
                    <Label>Date Format</Label>
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Branding Tab */}
          <TabsContent value="branding">
            <Card>
              <CardHeader>
                <CardTitle>White-Label Branding</CardTitle>
                <CardDescription>Customize how VisiGuard appears for your organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <div className="flex gap-2">
                      <input type="color" value={settings.primary_color} onChange={e => update('primary_color', e.target.value)} className="h-10 w-12 rounded border cursor-pointer" />
                      <Input value={settings.primary_color} onChange={e => update('primary_color', e.target.value)} className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary Color</Label>
                    <div className="flex gap-2">
                      <input type="color" value={settings.secondary_color} onChange={e => update('secondary_color', e.target.value)} className="h-10 w-12 rounded border cursor-pointer" />
                      <Input value={settings.secondary_color} onChange={e => update('secondary_color', e.target.value)} className="flex-1" />
                    </div>
                  </div>
                </div>
                <Separator />
                <h3 className="text-sm font-semibold">Badge Customization</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Badge Logo URL</Label><Input value={settings.badge_logo_url || ''} onChange={e => update('badge_logo_url', e.target.value)} placeholder="https://..." /></div>
                  <div className="space-y-2"><Label>Badge Footer Text</Label><Input value={settings.badge_footer_text} onChange={e => update('badge_footer_text', e.target.value)} /></div>
                </div>
                <Separator />
                <h3 className="text-sm font-semibold">Email Customization</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Email Header Text</Label><Input value={settings.email_header_text} onChange={e => update('email_header_text', e.target.value)} /></div>
                  <div className="space-y-2"><Label>Email Footer Text</Label><Input value={settings.email_footer_text} onChange={e => update('email_footer_text', e.target.value)} /></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Policies Tab */}
          <TabsContent value="policies">
            <Card>
              <CardHeader>
                <CardTitle>Visitor Policies & NDA</CardTitle>
                <CardDescription>Configure agreements visitors must accept during check-in</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">Enable NDA / Policy Agreement</p><p className="text-sm text-muted-foreground">Require visitors to sign a policy agreement during check-in</p></div>
                  <Switch checked={settings.enable_nda} onCheckedChange={v => update('enable_nda', v)} />
                </div>
                <div className="space-y-2">
                  <Label>Agreement Text</Label>
                  <Textarea value={settings.nda_text} onChange={e => update('nda_text', e.target.value)} rows={6} />
                  <p className="text-xs text-muted-foreground">This text will be shown to visitors during check-in</p>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">Enable Photo Capture</p><p className="text-sm text-muted-foreground">Require visitor photo during check-in</p></div>
                  <Switch checked={settings.enable_photo_capture} onCheckedChange={v => update('enable_photo_capture', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">Enable Watchlist Check</p><p className="text-sm text-muted-foreground">Automatically check visitors against the security watchlist</p></div>
                  <Switch checked={settings.enable_watchlist_check} onCheckedChange={v => update('enable_watchlist_check', v)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Session management, auto-checkout, and warning thresholds</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">Session Timeout</p><p className="text-sm text-muted-foreground">Auto-logout after inactivity</p></div>
                  <Select value={String(settings.session_timeout_minutes)} onValueChange={v => update('session_timeout_minutes', parseInt(v))}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="0">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">Auto Check-Out</p><p className="text-sm text-muted-foreground">Automatically check out visitors after specified hours</p></div>
                  <Select value={String(settings.auto_checkout_hours)} onValueChange={v => update('auto_checkout_hours', parseInt(v))}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="8">8 hours</SelectItem>
                      <SelectItem value="10">10 hours</SelectItem>
                      <SelectItem value="12">12 hours</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium flex items-center gap-2"><Clock className="h-4 w-4 text-amber-400" /> Checkout Warning Time</p>
                    <p className="text-sm text-muted-foreground">Show dashboard warning & send notifications for visitors still checked in after this time</p>
                  </div>
                  <Select value={String(settings.checkout_warning_hour)} onValueChange={v => update('checkout_warning_hour', parseInt(v))}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="16">4:00 PM</SelectItem>
                      <SelectItem value="17">5:00 PM</SelectItem>
                      <SelectItem value="18">6:00 PM</SelectItem>
                      <SelectItem value="19">7:00 PM</SelectItem>
                      <SelectItem value="20">8:00 PM</SelectItem>
                      <SelectItem value="21">9:00 PM</SelectItem>
                      <SelectItem value="22">10:00 PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Security Contact Number</Label>
                  <Input value={settings.security_contact_number || ''} onChange={e => update('security_contact_number', e.target.value)} placeholder="+91 98765 43210" />
                  <p className="text-xs text-muted-foreground">This number is shared with visitors in auto-checkout notifications so they can contact security if still on premises</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Tab */}
          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle>Data Retention & Compliance</CardTitle>
                <CardDescription>Configure data lifecycle and privacy settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">Data Retention Period</p><p className="text-sm text-muted-foreground">Automatically archive visitor records after this period</p></div>
                  <Select value={String(settings.data_retention_days)} onValueChange={v => update('data_retention_days', parseInt(v))}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="p-4 rounded-lg border bg-muted/30">
                  <h4 className="font-medium text-sm">GDPR & Privacy Compliance</h4>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                    <li>• Visitor data is automatically archived after the retention period</li>
                    <li>• NDA signatures are stored securely and linked to visitor records</li>
                    <li>• Audit trail maintains full compliance history</li>
                    <li>• Data export available via Visitor Report for subject access requests</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Configure how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">New Visitor Check-ins</p><p className="text-sm text-muted-foreground">Get notified when a new visitor checks in</p></div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">Appointment Reminders</p><p className="text-sm text-muted-foreground">Receive reminders for upcoming appointments</p></div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">Overstay Alerts</p><p className="text-sm text-muted-foreground">Get notified when visitors exceed expected duration</p></div>
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
      </div>
    </MainLayout>
  );
}
