import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldAlert, Plus, Search, Edit2, Trash2, AlertTriangle, Ban, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { logAudit } from '@/lib/auditLog';

interface WatchlistEntry {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  govt_id_number: string | null;
  company: string | null;
  reason: string;
  severity: string;
  photo_url: string | null;
  is_active: boolean;
  created_at: string;
}

const severityConfig: Record<string, { label: string; color: string; icon: typeof AlertTriangle }> = {
  warning: { label: 'Warning', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', icon: AlertTriangle },
  blocked: { label: 'Blocked', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: Ban },
  watch: { label: 'Watch', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: Eye },
};

export default function Watchlist() {
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<WatchlistEntry | null>(null);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', govt_id_number: '', company: '', reason: '', severity: 'warning',
  });

  useEffect(() => { fetchEntries(); }, []);

  const fetchEntries = async () => {
    setLoading(true);
    const { data } = await supabase.from('visitor_watchlist').select('*').order('created_at', { ascending: false });
    setEntries((data as any) || []);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ name: '', email: '', phone: '', govt_id_number: '', company: '', reason: '', severity: 'warning' });
    setEditEntry(null);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.reason.trim()) {
      toast.error('Name and reason are required');
      return;
    }
    if (editEntry) {
      const { error } = await supabase.from('visitor_watchlist').update({
        name: form.name, email: form.email || null, phone: form.phone || null,
        govt_id_number: form.govt_id_number || null, company: form.company || null,
        reason: form.reason, severity: form.severity,
      } as any).eq('id', editEntry.id);
      if (error) { toast.error('Failed to update'); return; }
      await logAudit({ action: 'watchlist_updated', entityType: 'watchlist', entityId: editEntry.id, entityName: form.name });
      toast.success('Watchlist entry updated');
    } else {
      const { error } = await supabase.from('visitor_watchlist').insert({
        name: form.name, email: form.email || null, phone: form.phone || null,
        govt_id_number: form.govt_id_number || null, company: form.company || null,
        reason: form.reason, severity: form.severity,
      } as any);
      if (error) { toast.error('Failed to add'); return; }
      await logAudit({ action: 'watchlist_added', entityType: 'watchlist', entityName: form.name });
      toast.success('Added to watchlist');
    }
    setDialogOpen(false);
    resetForm();
    fetchEntries();
  };

  const handleDelete = async (entry: WatchlistEntry) => {
    await supabase.from('visitor_watchlist').delete().eq('id', entry.id);
    await logAudit({ action: 'watchlist_removed', entityType: 'watchlist', entityId: entry.id, entityName: entry.name });
    toast.success('Removed from watchlist');
    fetchEntries();
  };

  const openEdit = (entry: WatchlistEntry) => {
    setEditEntry(entry);
    setForm({
      name: entry.name, email: entry.email || '', phone: entry.phone || '',
      govt_id_number: entry.govt_id_number || '', company: entry.company || '',
      reason: entry.reason, severity: entry.severity,
    });
    setDialogOpen(true);
  };

  const filtered = entries.filter(e => {
    if (!search) return true;
    const s = search.toLowerCase();
    return e.name.toLowerCase().includes(s) || (e.company || '').toLowerCase().includes(s) || (e.phone || '').includes(s);
  });

  return (
    <MainLayout>
      <div className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-destructive" />
              Visitor Watchlist
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Flag or block individuals for enhanced security screening</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-1.5"><Plus className="h-4 w-4" /> Add to Watchlist</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editEntry ? 'Edit Watchlist Entry' : 'Add to Watchlist'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Name *</Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Severity *</Label>
                    <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="watch">Watch — Monitor Only</SelectItem>
                        <SelectItem value="warning">Warning — Alert on Check-in</SelectItem>
                        <SelectItem value="blocked">Blocked — Deny Entry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                  <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Govt ID Number</Label><Input value={form.govt_id_number} onChange={e => setForm(f => ({ ...f, govt_id_number: e.target.value }))} /></div>
                  <div><Label>Company</Label><Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} /></div>
                </div>
                <div>
                  <Label>Reason *</Label>
                  <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Why is this person being flagged?" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
                  <Button onClick={handleSave}>{editEntry ? 'Update' : 'Add to Watchlist'}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Entries</p><p className="text-2xl font-bold">{entries.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Blocked</p><p className="text-2xl font-bold text-destructive">{entries.filter(e => e.severity === 'blocked').length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Warnings</p><p className="text-2xl font-bold text-amber-600">{entries.filter(e => e.severity === 'warning').length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Watch Only</p><p className="text-2xl font-bold text-blue-600">{entries.filter(e => e.severity === 'watch').length}</p></CardContent></Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, company, phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Govt ID</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No watchlist entries</TableCell></TableRow>
                  ) : filtered.map(entry => {
                    const sev = severityConfig[entry.severity] || severityConfig.warning;
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.name}{entry.company && <span className="text-xs text-muted-foreground ml-1">({entry.company})</span>}</TableCell>
                        <TableCell><Badge className={sev.color}><sev.icon className="h-3 w-3 mr-1" />{sev.label}</Badge></TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{entry.reason}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{entry.phone || entry.email || '—'}</TableCell>
                        <TableCell className="text-xs">{entry.govt_id_number || '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{format(new Date(entry.created_at), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(entry)}><Edit2 className="h-3.5 w-3.5" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove from Watchlist?</AlertDialogTitle>
                                  <AlertDialogDescription>Remove {entry.name} from the watchlist. This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(entry)}>Remove</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
