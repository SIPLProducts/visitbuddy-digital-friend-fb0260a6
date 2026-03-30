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
import { Building2, Palette, Shield, FileText, Clock, Database, Save, Upload, Check } from 'lucide-react';
import { toast } from 'sonner';
import { logAudit } from '@/lib/auditLog';

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
}

export default function BrandingSettings() {
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('tenant_settings').select('*').limit(1).single()
      .then(({ data }) => {
        if (data) setSettings(data as any);
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
            <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6 text-primary" /> Enterprise Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">Branding, policies, security, and data management</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Check className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save All'}
          </Button>
        </div>

        <Tabs defaultValue="branding">
          <TabsList className="flex-wrap">
            <TabsTrigger value="branding" className="gap-1.5"><Palette className="h-4 w-4" /> Branding</TabsTrigger>
            <TabsTrigger value="policies" className="gap-1.5"><FileText className="h-4 w-4" /> Policies</TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5"><Shield className="h-4 w-4" /> Security</TabsTrigger>
            <TabsTrigger value="data" className="gap-1.5"><Database className="h-4 w-4" /> Data Management</TabsTrigger>
          </TabsList>

          <TabsContent value="branding">
            <Card>
              <CardHeader>
                <CardTitle>White-Label Branding</CardTitle>
                <CardDescription>Customize how VisiGuard appears for your organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Company Name</Label><Input value={settings.company_name} onChange={e => update('company_name', e.target.value)} /></div>
                  <div>
                    <Label>Company Logo URL</Label>
                    <Input value={settings.logo_url || ''} onChange={e => update('logo_url', e.target.value)} placeholder="https://..." />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Primary Color</Label>
                    <div className="flex gap-2 mt-1">
                      <input type="color" value={settings.primary_color} onChange={e => update('primary_color', e.target.value)} className="h-10 w-12 rounded border cursor-pointer" />
                      <Input value={settings.primary_color} onChange={e => update('primary_color', e.target.value)} className="flex-1" />
                    </div>
                  </div>
                  <div>
                    <Label>Secondary Color</Label>
                    <div className="flex gap-2 mt-1">
                      <input type="color" value={settings.secondary_color} onChange={e => update('secondary_color', e.target.value)} className="h-10 w-12 rounded border cursor-pointer" />
                      <Input value={settings.secondary_color} onChange={e => update('secondary_color', e.target.value)} className="flex-1" />
                    </div>
                  </div>
                </div>
                <Separator />
                <h3 className="text-sm font-semibold">Badge Customization</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Badge Logo URL</Label><Input value={settings.badge_logo_url || ''} onChange={e => update('badge_logo_url', e.target.value)} placeholder="https://..." /></div>
                  <div><Label>Badge Footer Text</Label><Input value={settings.badge_footer_text} onChange={e => update('badge_footer_text', e.target.value)} /></div>
                </div>
                <Separator />
                <h3 className="text-sm font-semibold">Email Customization</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Email Header Text</Label><Input value={settings.email_header_text} onChange={e => update('email_header_text', e.target.value)} /></div>
                  <div><Label>Email Footer Text</Label><Input value={settings.email_footer_text} onChange={e => update('email_footer_text', e.target.value)} /></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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
                <div>
                  <Label>Agreement Text</Label>
                  <Textarea value={settings.nda_text} onChange={e => update('nda_text', e.target.value)} rows={6} className="mt-1" />
                  <p className="text-xs text-muted-foreground mt-1">This text will be shown to visitors during check-in</p>
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

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Session management and access control</CardDescription>
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
              </CardContent>
            </Card>
          </TabsContent>

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
        </Tabs>
      </div>
    </MainLayout>
  );
}
