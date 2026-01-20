import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileText, Search, Download, Users, UserCheck, UserX, Laptop } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Visitor } from '@/types/database';
import { cn } from '@/lib/utils';

export default function VisitorReport() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('7');
  const [stats, setStats] = useState({
    total: 0,
    checkedIn: 0,
    checkedOut: 0,
    withLaptop: 0,
  });

  useEffect(() => {
    fetchVisitors();
  }, [dateFilter]);

  const fetchVisitors = async () => {
    setLoading(true);
    
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(dateFilter));

    const { data } = await supabase
      .from('visitors')
      .select(`
        *,
        host:employees(*, department:departments(*)),
        department:departments(*)
      `)
      .gte('created_at', daysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (data) {
      const typedData = data as unknown as Visitor[];
      setVisitors(typedData);
      
      setStats({
        total: typedData.length,
        checkedIn: typedData.filter((v) => v.status === 'checked_in').length,
        checkedOut: typedData.filter((v) => v.status === 'checked_out').length,
        withLaptop: typedData.filter((v) => v.has_laptop).length,
      });
    }
    setLoading(false);
  };

  const exportToCsv = () => {
    const headers = ['Name', 'ID', 'Company', 'Host', 'Status', 'Check In', 'Check Out', 'Laptop'];
    const rows = visitors.map((v) => [
      v.name,
      v.visitor_id,
      v.company || '',
      v.host?.name || '',
      v.status,
      v.check_in_time || '',
      v.check_out_time || '',
      v.has_laptop ? `${v.laptop_brand} - ${v.laptop_serial}` : 'No',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visitor-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredVisitors = visitors.filter((visitor) => {
    const matchesSearch =
      visitor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visitor.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visitor.host?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || visitor.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked_in':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'checked_out':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Visitor Report</h1>
            </div>
            <p className="text-muted-foreground">
              View and export visitor history and analytics
            </p>
          </div>
          <Button onClick={exportToCsv} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Visitors</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.checkedIn}</p>
                <p className="text-sm text-muted-foreground">Checked In</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                <UserX className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.checkedOut}</p>
                <p className="text-sm text-muted-foreground">Checked Out</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-100 text-sky-700">
                <Laptop className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.withLaptop}</p>
                <p className="text-sm text-muted-foreground">With Laptop</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, company, host, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="checked_in">Checked In</SelectItem>
              <SelectItem value="checked_out">Checked Out</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Visitor History */}
        <div className="bg-card rounded-xl border border-border">
          <div className="p-6 border-b border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Visitor History
              <Badge variant="secondary">{filteredVisitors.length} records</Badge>
            </h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Visitor</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Laptop</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredVisitors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No visitors found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredVisitors.map((visitor) => (
                  <TableRow key={visitor.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{visitor.name}</p>
                        <code className="text-xs text-muted-foreground">
                          {visitor.visitor_id}
                        </code>
                      </div>
                    </TableCell>
                    <TableCell>{visitor.company || '—'}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{visitor.host?.name || '—'}</p>
                        <p className="text-xs text-muted-foreground">
                          {visitor.department?.name}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(getStatusColor(visitor.status))}
                      >
                        {visitor.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {visitor.check_in_time
                        ? new Date(visitor.check_in_time).toLocaleString()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {visitor.check_out_time
                        ? new Date(visitor.check_out_time).toLocaleString()
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {visitor.has_laptop ? (
                        <div className="text-sm">
                          <p>{visitor.laptop_brand}</p>
                          <code className="text-xs text-muted-foreground">
                            {visitor.laptop_serial}
                          </code>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
}
