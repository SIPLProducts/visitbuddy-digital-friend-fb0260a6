import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, ArrowRightLeft, CheckCircle2, AlertTriangle, Search } from 'lucide-react';
import reslLogo from '@/assets/resl-logo.png';

type Status = 'loading' | 'ready' | 'transferring' | 'done' | 'error' | 'already_processed';

interface Visitor {
  id: string;
  visitor_id: string;
  name: string;
  company: string | null;
  purpose: string | null;
  status: string;
  host_id: string | null;
  gate_id: string | null;
}

interface HostOption {
  id: string;
  name: string;
  email: string | null;
  department_id: string | null;
}

export default function TransferApproval() {
  const [searchParams] = useSearchParams();
  const visitorId = searchParams.get('id');

  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [currentHostName, setCurrentHostName] = useState<string>('');
  const [hosts, setHosts] = useState<HostOption[]>([]);
  const [search, setSearch] = useState('');
  const [selectedHostId, setSelectedHostId] = useState<string | null>(null);
  const [newHostName, setNewHostName] = useState<string>('');

  useEffect(() => {
    if (!visitorId) {
      setStatus('error');
      setErrorMsg('Missing visitor id');
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitorId]);

  const load = async () => {
    try {
      const { data: v, error: vErr } = await supabase
        .from('visitors')
        .select('id, visitor_id, name, company, purpose, status, host_id, gate_id')
        .eq('id', visitorId!)
        .maybeSingle();
      if (vErr) throw vErr;
      if (!v) {
        setStatus('error');
        setErrorMsg('Visitor not found.');
        return;
      }
      setVisitor(v as Visitor);

      if (v.status !== 'pending_approval') {
        setStatus('already_processed');
        return;
      }

      // Resolve gate -> location
      let locationId: string | null = null;
      if (v.gate_id) {
        const { data: g } = await supabase
          .from('gates')
          .select('location_id')
          .eq('id', v.gate_id)
          .maybeSingle();
        locationId = g?.location_id ?? null;
      }

      // Current host name
      if (v.host_id) {
        const { data: h } = await supabase
          .from('employees')
          .select('name')
          .eq('id', v.host_id)
          .maybeSingle();
        setCurrentHostName(h?.name || '');
      }

      // Eligible hosts: same location, is_host true, not current
      let query = supabase
        .from('employees')
        .select('id, name, email, department_id, location_id, is_host')
        .eq('is_host', true)
        .order('name', { ascending: true });
      if (locationId) query = query.eq('location_id', locationId);
      const { data: emps, error: eErr } = await query;
      if (eErr) throw eErr;

      const filtered = (emps || [])
        .filter((e: any) => e.id !== v.host_id)
        .map((e: any) => ({
          id: e.id,
          name: e.name,
          email: e.email,
          department_id: e.department_id,
        }));
      setHosts(filtered);
      setStatus('ready');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err?.message || 'Failed to load visitor');
    }
  };

  const visibleHosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return hosts.slice(0, 50);
    return hosts
      .filter(h => h.name.toLowerCase().includes(q) || (h.email || '').toLowerCase().includes(q))
      .slice(0, 50);
  }, [hosts, search]);

  const handleTransfer = async () => {
    if (!selectedHostId || !visitorId) return;
    setStatus('transferring');
    try {
      const { data, error } = await supabase.functions.invoke('transfer-visitor-approval', {
        body: { visitorId, newHostId: selectedHostId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setNewHostName(data?.newHostName || hosts.find(h => h.id === selectedHostId)?.name || 'new host');
      setStatus('done');
      toast.success('Approval transferred');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Transfer failed');
      setStatus('ready');
    }
  };

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading visitor details...</p>
        </div>
      );
    }

    if (status === 'already_processed') {
      return (
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold">Already Processed</h2>
          <p className="text-muted-foreground mt-2">
            This visitor request has already been actioned and can no longer be transferred.
          </p>
          {visitor && (
            <p className="mt-4 text-sm">
              Current status: <span className="font-medium capitalize">{visitor.status?.replace('_', ' ')}</span>
            </p>
          )}
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-destructive">Error</h2>
          <p className="text-muted-foreground mt-2">{errorMsg || 'Unable to load visitor details.'}</p>
        </div>
      );
    }

    if (status === 'done') {
      return (
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-emerald-600">Approval Transferred</h2>
          <p className="text-muted-foreground mt-2">
            The approval request has been forwarded to <span className="font-medium text-foreground">{newHostName}</span>.
            They will receive an email and WhatsApp message to approve or reject this visit.
          </p>
        </div>
      );
    }

    // ready / transferring
    const isBusy = status === 'transferring';
    return (
      <div className="space-y-5">
        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <ArrowRightLeft className="h-8 w-8 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold">Transfer Approval</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Forward this visitor's approval request to another host at your location.
          </p>
        </div>

        {visitor && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Visitor:</span><span className="font-medium">{visitor.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">ID:</span><span className="font-mono">{visitor.visitor_id}</span></div>
            {visitor.company && (<div className="flex justify-between"><span className="text-muted-foreground">Company:</span><span>{visitor.company}</span></div>)}
            {visitor.purpose && (<div className="flex justify-between"><span className="text-muted-foreground">Purpose:</span><span>{visitor.purpose}</span></div>)}
            {currentHostName && (<div className="flex justify-between"><span className="text-muted-foreground">Current host:</span><span>{currentHostName}</span></div>)}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Select new host</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              disabled={isBusy}
            />
          </div>

          <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
            {visibleHosts.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground text-center">No hosts found.</div>
            )}
            {visibleHosts.map((h) => (
              <button
                key={h.id}
                type="button"
                disabled={isBusy}
                onClick={() => setSelectedHostId(h.id)}
                className={`w-full text-left p-3 hover:bg-muted/60 transition flex items-center justify-between ${selectedHostId === h.id ? 'bg-primary/10' : ''}`}
              >
                <div>
                  <div className="font-medium text-sm">{h.name}</div>
                  {h.email && <div className="text-xs text-muted-foreground">{h.email}</div>}
                </div>
                {selectedHostId === h.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        </div>

        <Button
          className="w-full h-12"
          disabled={!selectedHostId || isBusy}
          onClick={handleTransfer}
        >
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRightLeft className="h-4 w-4 mr-2" />}
          Transfer Approval
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center border-b">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src={reslLogo} alt="Logo" className="h-10 w-10 object-contain" />
            <CardTitle className="text-lg">Re Sustainability</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">Visitor Approval System</p>
        </CardHeader>
        <CardContent className="pt-6">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}