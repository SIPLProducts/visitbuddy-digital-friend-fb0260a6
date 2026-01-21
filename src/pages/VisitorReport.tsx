import { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { 
  FileText, Search, Download, Users, UserCheck, UserX, Laptop, 
  CalendarIcon, Upload, FileDown 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Visitor } from '@/types/database';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';

export default function VisitorReport() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [stats, setStats] = useState({
    total: 0,
    checkedIn: 0,
    checkedOut: 0,
    withLaptop: 0,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (dateRange?.from) {
      fetchVisitors();
    }
  }, [dateRange]);

  const fetchVisitors = async () => {
    setLoading(true);

    let query = supabase
      .from('visitors')
      .select(`
        *,
        host:employees(*, department:departments(*)),
        department:departments(*)
      `)
      .order('created_at', { ascending: false });

    if (dateRange?.from) {
      query = query.gte('created_at', dateRange.from.toISOString());
    }
    if (dateRange?.to) {
      const endOfDay = new Date(dateRange.to);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte('created_at', endOfDay.toISOString());
    }

    const { data } = await query;

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
    const headers = ['Name', 'Visitor ID', 'Email', 'Phone', 'Company', 'Purpose', 'Host', 'Status', 'Check In', 'Check Out'];
    const rows = visitors.map((v) => [
      v.name,
      v.visitor_id,
      v.email || '',
      v.phone || '',
      v.company || '',
      v.purpose || '',
      v.host?.name || '',
      v.status,
      v.check_in_time ? format(new Date(v.check_in_time), 'yyyy-MM-dd HH:mm:ss') : '',
      v.check_out_time ? format(new Date(v.check_out_time), 'yyyy-MM-dd HH:mm:ss') : '',
    ]);

    const escapeCsvField = (field: string) => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };

    const csv = [
      headers.join(','), 
      ...rows.map((r) => r.map(escapeCsvField).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visitor-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    const headers = ['Name', 'Email', 'Phone', 'Company', 'Purpose'];
    const sampleRows = [
      ['John Doe', 'john@example.com', '+919876543210', 'TechCorp', 'Meeting'],
      ['Jane Smith', 'jane@example.com', '+919123456789', 'ABC Ltd', 'Interview'],
    ];

    const csv = [
      headers.join(','),
      ...sampleRows.map((r) => r.join(',')),
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'visitor-upload-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const generateVisitorId = () => {
    const uuid1 = crypto.randomUUID().replace(/-/g, '');
    const uuid2 = crypto.randomUUID().replace(/-/g, '');
    return `VIS-${uuid1.substring(0, 8).toUpperCase()}-${uuid2.substring(0, 4).toUpperCase()}`;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setUploading(true);
    
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('CSV file is empty or has no data rows');
        setUploading(false);
        return;
      }

      const visitorsToInsert = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        
        if (values.length < 1 || !values[0]) continue;
        
        visitorsToInsert.push({
          visitor_id: generateVisitorId(),
          name: values[0] || 'Unknown',
          email: values[1] || null,
          phone: values[2] || null,
          company: values[3] || null,
          purpose: values[4] || null,
          status: 'scheduled' as const,
        });
      }

      if (visitorsToInsert.length === 0) {
        toast.error('No valid data rows found');
        setUploading(false);
        return;
      }

      const { error } = await supabase.from('visitors').insert(visitorsToInsert);

      if (error) {
        toast.error('Failed to import visitors: ' + error.message);
      } else {
        toast.success(`Successfully imported ${visitorsToInsert.length} visitors`);
        fetchVisitors();
      }
    } catch (err) {
      toast.error('Failed to parse CSV file');
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'checked_out':
        return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
      default:
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Visitor Report</h1>
            </div>
            <p className="text-muted-foreground">
              View, import, and export visitor history
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={downloadTemplate} className="gap-2">
              <FileDown className="h-4 w-4" />
              Template
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {uploading ? 'Importing...' : 'Import CSV'}
            </Button>
            <Button onClick={exportToCsv} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Visitors</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.checkedIn}</p>
                  <p className="text-sm text-muted-foreground">Checked In</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-500/10 text-slate-600">
                  <UserX className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.checkedOut}</p>
                  <p className="text-sm text-muted-foreground">Checked Out</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600">
                  <Laptop className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.withLaptop}</p>
                  <p className="text-sm text-muted-foreground">With Laptop</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
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
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="checked_in">Checked In</SelectItem>
              <SelectItem value="checked_out">Checked Out</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal min-w-[240px]",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd MMM")} - {format(dateRange.to, "dd MMM yyyy")}
                    </>
                  ) : (
                    format(dateRange.from, "dd MMM yyyy")
                  )
                ) : (
                  <span>Pick date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                className={cn("p-3 pointer-events-auto")}
              />
              <div className="border-t p-3 flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
                >
                  Last 7 days
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
                >
                  Last 30 days
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateRange({ from: subDays(new Date(), 90), to: new Date() })}
                >
                  Last 90 days
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Visitor History */}
        <Card>
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
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                        ? format(new Date(visitor.check_in_time), 'dd MMM, hh:mm a')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {visitor.check_out_time
                        ? format(new Date(visitor.check_out_time), 'dd MMM, hh:mm a')
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
        </Card>
      </div>
    </MainLayout>
  );
}
