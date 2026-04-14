import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Search, Filter, Clock, User, Activity, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, subDays, subHours } from 'date-fns';

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, unknown>;
  location_id: string | null;
  created_at: string;
}

const actionColors: Record<string, string> = {
  created: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  deleted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  check_in: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  check_out: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  login: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
};

function getActionColor(action: string) {
  const key = Object.keys(actionColors).find(k => action.includes(k));
  return key ? actionColors[key] : 'bg-muted text-muted-foreground';
}

function formatAction(action: string) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('24h');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    fetchLogs();
  }, [entityFilter, timeFilter, page]);

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (entityFilter !== 'all') {
      query = query.eq('entity_type', entityFilter);
    }

    const now = new Date();
    if (timeFilter === '1h') query = query.gte('created_at', subHours(now, 1).toISOString());
    else if (timeFilter === '24h') query = query.gte('created_at', subDays(now, 1).toISOString());
    else if (timeFilter === '7d') query = query.gte('created_at', subDays(now, 7).toISOString());
    else if (timeFilter === '30d') query = query.gte('created_at', subDays(now, 30).toISOString());

    const { data } = await query;
    setLogs((data as any) || []);
    setLoading(false);
  };

  const filteredLogs = logs.filter(log => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(s) ||
      log.entity_type.toLowerCase().includes(s) ||
      (log.entity_name || '').toLowerCase().includes(s)
    );
  });

  const exportCsv = () => {
    const header = 'Timestamp,Action,Entity Type,Entity Name,Details\n';
    const rows = filteredLogs.map(l =>
      `"${format(new Date(l.created_at), 'yyyy-MM-dd HH:mm:ss')}","${formatAction(l.action)}","${l.entity_type}","${l.entity_name || ''}","${JSON.stringify(l.details).replace(/"/g, '""')}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const entityTypes = ['visitor', 'vehicle', 'appointment', 'employee', 'department', 'gate', 'location', 'user', 'watchlist', 'system'];

  return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Audit Trail
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Complete activity log for compliance & security</p>
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Events', value: filteredLogs.length, icon: Activity },
            { label: 'Visitor Actions', value: filteredLogs.filter(l => l.entity_type === 'visitor').length, icon: User },
            { label: 'Security Events', value: filteredLogs.filter(l => ['watchlist', 'user'].includes(l.entity_type)).length, icon: Shield },
            { label: 'Time Range', value: timeFilter === '1h' ? 'Last Hour' : timeFilter === '24h' ? 'Last 24h' : timeFilter === '7d' ? 'Last 7 Days' : 'Last 30 Days', icon: Clock },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search actions, entities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(0); }}>
              <SelectTrigger className="w-40">
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">All Entities</SelectItem>
                {entityTypes.map(t => (
                  <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={timeFilter} onValueChange={(v) => { setTimeFilter(v); setPage(0); }}>
              <SelectTrigger className="w-36">
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Log Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Activity Log</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead className="w-[180px]">Action</TableHead>
                    <TableHead className="w-[120px]">Entity</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : filteredLogs.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No audit logs found</TableCell></TableRow>
                  ) : filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] font-medium ${getActionColor(log.action)}`}>
                          {formatAction(log.action)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium capitalize">{log.entity_type}</span>
                      </TableCell>
                      <TableCell className="text-sm">{log.entity_name || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {Object.keys(log.details || {}).length > 0
                          ? Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(', ')
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-xs text-muted-foreground">Page {page + 1}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={filteredLogs.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
