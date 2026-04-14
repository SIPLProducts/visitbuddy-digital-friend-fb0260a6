import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { FileText, Download, AlertTriangle, Clock, ShieldCheck, Users, Calendar, BarChart3 } from 'lucide-react';
import { format, subDays } from 'date-fns';

export default function ComplianceReport() {
  const [visitors, setVisitors] = useState<any[]>([]);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  useEffect(() => { fetchData(); }, [period]);

  const fetchData = async () => {
    setLoading(true);
    const since = subDays(new Date(), parseInt(period)).toISOString();
    const [vRes, aRes] = await Promise.all([
      supabase.from('visitors').select('id, name, status, check_in_time, check_out_time, govt_id_number, created_at, gate:gates(name)').gte('created_at', since).order('created_at', { ascending: false }),
      supabase.from('visitor_agreements').select('*').gte('created_at', since),
    ]);
    setVisitors((vRes.data as any) || []);
    setAgreements((aRes.data as any) || []);
    setLoading(false);
  };

  const stats = useMemo(() => {
    const total = visitors.length;
    const withId = visitors.filter(v => v.govt_id_number).length;
    const withNda = agreements.length;
    const overstayed = visitors.filter(v => {
      if (v.status !== 'checked_in' || !v.check_in_time) return false;
      return (Date.now() - new Date(v.check_in_time).getTime()) / (1000 * 60 * 60) > 8;
    }).length;
    const noCheckout = visitors.filter(v => v.status === 'checked_in' && v.check_in_time).length;
    const idComplianceRate = total > 0 ? Math.round((withId / total) * 100) : 0;
    const ndaComplianceRate = total > 0 ? Math.round((withNda / total) * 100) : 0;
    return { total, withId, withNda, overstayed, noCheckout, idComplianceRate, ndaComplianceRate };
  }, [visitors, agreements]);

  const violations = useMemo(() => {
    const items: { type: string; severity: string; visitor: string; detail: string; date: string }[] = [];
    visitors.forEach(v => {
      if (!v.govt_id_number) {
        items.push({ type: 'Missing ID', severity: 'high', visitor: v.name, detail: 'No government ID recorded', date: v.created_at });
      }
      if (v.status === 'checked_in' && v.check_in_time) {
        const hours = (Date.now() - new Date(v.check_in_time).getTime()) / (1000 * 60 * 60);
        if (hours > 8) {
          items.push({ type: 'Overstay', severity: 'medium', visitor: v.name, detail: `${Math.round(hours)}h since check-in`, date: v.check_in_time });
        }
      }
    });
    return items;
  }, [visitors]);

  const exportReport = () => {
    let csv = 'Compliance Report\nPeriod: Last ' + period + ' days\nGenerated: ' + format(new Date(), 'dd/MM/yyyy HH:mm') + '\n\n';
    csv += 'SUMMARY\nTotal Visitors,' + stats.total + '\nWith ID,' + stats.withId + '\nNDA Signed,' + stats.withNda + '\nOverstayed,' + stats.overstayed + '\nID Compliance,' + stats.idComplianceRate + '%\n\n';
    csv += 'VIOLATIONS\nType,Severity,Visitor,Detail,Date\n';
    violations.forEach(v => { csv += `"${v.type}","${v.severity}","${v.visitor}","${v.detail}","${format(new Date(v.date), 'dd/MM/yyyy')}"\n`; });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `compliance-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
      <div className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Compliance Report</h1>
            <p className="text-sm text-muted-foreground mt-1">Security compliance metrics, policy violations, and audit summary</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-36"><Calendar className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportReport} className="gap-1.5"><Download className="h-4 w-4" /> Export</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><p className="text-xs text-muted-foreground">Total Visitors</p></div><p className="text-2xl font-bold mt-1">{stats.total}</p></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /><p className="text-xs text-muted-foreground">ID Compliance</p></div><p className="text-2xl font-bold mt-1">{stats.idComplianceRate}%</p><Progress value={stats.idComplianceRate} className="mt-2 h-1.5" /></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-blue-600" /><p className="text-xs text-muted-foreground">NDA Compliance</p></div><p className="text-2xl font-bold mt-1">{stats.ndaComplianceRate}%</p><Progress value={stats.ndaComplianceRate} className="mt-2 h-1.5" /></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /><p className="text-xs text-muted-foreground">Violations</p></div><p className="text-2xl font-bold mt-1 text-amber-600">{violations.length}</p></CardContent></Card>
        </div>

        {/* Violations Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Policy Violations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Visitor</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10">Loading...</TableCell></TableRow>
                  ) : violations.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No violations found — great compliance!</TableCell></TableRow>
                  ) : violations.map((v, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm">{v.type}</TableCell>
                      <TableCell>
                        <Badge className={v.severity === 'high' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}>{v.severity}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{v.visitor}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{v.detail}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(v.date), 'dd/MM/yyyy')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
  );
}
