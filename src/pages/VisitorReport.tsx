import { useState, useEffect, useRef, useMemo } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, Search, Download, Users, UserCheck, UserX, Laptop, 
  CalendarIcon, Upload, FileDown, MapPin, TrendingUp, Building2,
  Filter, Crown, BarChart3, Briefcase, Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Visitor, Location } from '@/types/database';
import { cn } from '@/lib/utils';
import { format, subDays, eachDayOfInterval, startOfDay, differenceInMinutes, isToday, isThisWeek, startOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export default function VisitorReport() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [stats, setStats] = useState({
    total: 0,
    checkedIn: 0,
    checkedOut: 0,
    withLaptop: 0,
    avgDuration: '0h 0m',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (dateRange?.from) {
      fetchVisitors();
    }
  }, [dateRange]);

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .order('name');
    if (data) {
      setLocations(data as Location[]);
    }
  };

  const fetchVisitors = async () => {
    setLoading(true);

    let query = supabase
      .from('visitors')
      .select(`
        *,
        host:employees(*, department:departments(*)),
        department:departments(*),
        gate:gates(*, location:locations(*))
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
      
      // Calculate average duration
      const completedVisits = typedData.filter(
        (v) => v.check_in_time && v.check_out_time
      );
      
      let avgMinutes = 0;
      if (completedVisits.length > 0) {
        const totalMinutes = completedVisits.reduce((sum, v) => {
          const mins = differenceInMinutes(
            new Date(v.check_out_time!),
            new Date(v.check_in_time!)
          );
          return sum + mins;
        }, 0);
        avgMinutes = Math.round(totalMinutes / completedVisits.length);
      }
      
      const hours = Math.floor(avgMinutes / 60);
      const mins = avgMinutes % 60;
      
      setStats({
        total: typedData.length,
        checkedIn: typedData.filter((v) => v.status === 'checked_in').length,
        checkedOut: typedData.filter((v) => v.status === 'checked_out').length,
        withLaptop: typedData.filter((v) => v.has_laptop).length,
        avgDuration: `${hours}h ${mins}m`,
      });
    }
    setLoading(false);
  };

  // Chart data calculations
  const chartData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to || visitors.length === 0) {
      return { dailyTrend: [], companyStats: [], locationStats: [], statusDistribution: [], topVisitors: [] };
    }

    // Daily trend data
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    const dailyTrend = days.map(day => {
      const dayStart = startOfDay(day);
      const checkIns = visitors.filter(v => {
        if (!v.check_in_time) return false;
        const checkIn = startOfDay(new Date(v.check_in_time));
        return checkIn.getTime() === dayStart.getTime();
      });
      const checkOuts = visitors.filter(v => {
        if (!v.check_out_time) return false;
        const checkOut = startOfDay(new Date(v.check_out_time));
        return checkOut.getTime() === dayStart.getTime();
      });
      return {
        date: format(day, 'dd MMM'),
        checkIns: checkIns.length,
        checkOuts: checkOuts.length,
      };
    });

    // Company distribution (top 8)
    const companyMap = new Map<string, number>();
    visitors.forEach(v => {
      const company = v.company || 'Individual';
      companyMap.set(company, (companyMap.get(company) || 0) + 1);
    });
    const companyStats = Array.from(companyMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        fullName: name,
        value,
      }));

    // Location stats
    const locationMap = new Map<string, { checkIns: number; checkOuts: number }>();
    visitors.forEach(v => {
      const locName = v.gate?.location?.name || 'Unknown';
      const existing = locationMap.get(locName) || { checkIns: 0, checkOuts: 0 };
      if (v.status === 'checked_in') existing.checkIns++;
      if (v.status === 'checked_out') existing.checkOuts++;
      locationMap.set(locName, existing);
    });
    const locationStats = Array.from(locationMap.entries()).map(([name, data]) => ({
      name: name.length > 15 ? name.substring(0, 15) + '...' : name,
      checkIns: data.checkIns,
      checkOuts: data.checkOuts,
    }));

    // Status distribution
    const statusDistribution = [
      { name: 'Currently Inside', value: stats.checkedIn, color: '#10b981' },
      { name: 'Checked Out', value: stats.checkedOut, color: '#64748b' },
      { name: 'Scheduled', value: visitors.filter(v => v.status === 'scheduled').length, color: '#3b82f6' },
      { name: 'Pending Approval', value: visitors.filter(v => v.status === 'pending_approval').length, color: '#f59e0b' },
    ].filter(s => s.value > 0);

    // Top 10 visitors by visit count (grouped by name + company)
    const visitorFrequency = new Map<string, { name: string; company: string; visits: number; lastVisit: string }>();
    visitors.forEach(v => {
      const key = `${v.name.toLowerCase()}-${(v.company || '').toLowerCase()}`;
      const existing = visitorFrequency.get(key);
      if (existing) {
        existing.visits++;
        if (new Date(v.created_at) > new Date(existing.lastVisit)) {
          existing.lastVisit = v.created_at;
        }
      } else {
        visitorFrequency.set(key, {
          name: v.name,
          company: v.company || 'Individual',
          visits: 1,
          lastVisit: v.created_at,
        });
      }
    });
    const topVisitors = Array.from(visitorFrequency.values())
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 10);

    return { dailyTrend, companyStats, locationStats, statusDistribution, topVisitors };
  }, [visitors, dateRange, stats]);

  // Get unique companies for filter
  const companies = useMemo(() => {
    const companySet = new Set(visitors.map(v => v.company).filter(Boolean));
    return Array.from(companySet) as string[];
  }, [visitors]);

  const exportToCsv = () => {
    const headers = ['Name', 'Visitor ID', 'Email', 'Phone', 'Company', 'Purpose', 'Host', 'Location', 'Status', 'Check In', 'Check Out'];
    const rows = filteredVisitors.map((v) => [
      v.name,
      v.visitor_id,
      v.email || '',
      v.phone || '',
      v.company || '',
      v.purpose || '',
      v.host?.name || '',
      v.gate?.location?.name || '',
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
      visitor.host?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visitor.visitor_id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || visitor.status === statusFilter;

    const matchesLocation =
      locationFilter === 'all' || visitor.gate?.location?.id === locationFilter;

    const matchesCompany =
      companyFilter === 'all' || visitor.company === companyFilter;

    return matchesSearch && matchesStatus && matchesLocation && matchesCompany;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked_in':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'checked_out':
        return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
      case 'pending_approval':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      default:
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setLocationFilter('all');
    setCompanyFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || locationFilter !== 'all' || companyFilter !== 'all';

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Visitor Report Dashboard</h1>
            </div>
            <p className="text-muted-foreground">
              Analytics, trends, and visitor history with company insights
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

        {/* Date Range Picker - Prominent */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <span className="font-medium text-foreground">Date Range:</span>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal min-w-[280px] bg-background",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd MMM yyyy")} - {format(dateRange.to, "dd MMM yyyy")}
                        </>
                      ) : (
                        format(dateRange.from, "dd MMM yyyy")
                      )
                    ) : (
                      <span>Pick date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    className={cn("p-3 pointer-events-auto")}
                  />
                  <div className="border-t p-3 flex gap-2 flex-wrap">
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
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-l-4 border-l-primary">
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
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.checkedIn}</p>
                  <p className="text-sm text-muted-foreground">Currently Inside</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-slate-500">
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
          <Card className="border-l-4 border-l-sky-500">
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
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.avgDuration}</p>
                  <p className="text-sm text-muted-foreground">Avg. Duration</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                Daily Visitor Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {chartData.dailyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData.dailyTrend}>
                      <defs>
                        <linearGradient id="colorVisitorCheckIns" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorVisitorCheckOuts" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#64748b" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="checkIns"
                        name="Check-Ins"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorVisitorCheckIns)"
                      />
                      <Area
                        type="monotone"
                        dataKey="checkOuts"
                        name="Check-Outs"
                        stroke="#64748b"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorVisitorCheckOuts)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No data available for selected range
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Company Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="h-5 w-5 text-primary" />
                Top Visitor Companies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {chartData.companyStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.companyStats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={100}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number, name: string, props: { payload: { fullName: string } }) => [value, props.payload.fullName]}
                      />
                      <Bar dataKey="value" name="Visitors" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No company data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Location Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-primary" />
                Activity by Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {chartData.locationStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.locationStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="checkIns" name="Check-Ins" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="checkOuts" name="Check-Outs" fill="#64748b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No location data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
                Status Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {chartData.statusDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {chartData.statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No status data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top 10 Visitors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Crown className="h-5 w-5 text-amber-500" />
              Top 10 Frequent Visitors
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.topVisitors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {chartData.topVisitors.map((visitor, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-4 rounded-lg border",
                      index === 0 && "bg-amber-500/10 border-amber-500/30",
                      index === 1 && "bg-slate-400/10 border-slate-400/30",
                      index === 2 && "bg-amber-700/10 border-amber-700/30",
                      index > 2 && "bg-muted/50 border-border"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded",
                        index === 0 && "bg-amber-500 text-white",
                        index === 1 && "bg-slate-400 text-white",
                        index === 2 && "bg-amber-700 text-white",
                        index > 2 && "bg-muted-foreground/20 text-muted-foreground"
                      )}>
                        #{index + 1}
                      </span>
                      <span className="text-lg font-bold text-primary">{visitor.visits}</span>
                    </div>
                    <p className="font-semibold text-foreground truncate">{visitor.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{visitor.company}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last: {format(new Date(visitor.lastVisit), 'dd MMM yyyy')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No visitor data available for the selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filters Section */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                Filters & Search
              </span>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                  Clear all
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[250px]">
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
                <SelectContent className="bg-popover border border-border z-50">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="checked_in">Checked In</SelectItem>
                  <SelectItem value="checked_out">Checked Out</SelectItem>
                </SelectContent>
              </Select>

              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-48">
                  <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50 max-h-60">
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company} value={company}>
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-48">
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50">
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Visitor History Table */}
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
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Laptop</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                      Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredVisitors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No visitors found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredVisitors.slice(0, 50).map((visitor) => (
                  <TableRow key={visitor.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{visitor.name}</p>
                        <code className="text-xs text-muted-foreground">
                          {visitor.visitor_id}
                        </code>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{visitor.company || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{visitor.host?.name || '—'}</p>
                        <p className="text-xs text-muted-foreground">
                          {visitor.department?.name}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{visitor.gate?.location?.name || '—'}</p>
                        {visitor.gate?.name && (
                          <p className="text-xs text-muted-foreground">
                            {visitor.gate.name}
                          </p>
                        )}
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
          {filteredVisitors.length > 50 && (
            <div className="p-4 text-center text-sm text-muted-foreground border-t">
              Showing 50 of {filteredVisitors.length} records. Export to CSV for full data.
            </div>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
