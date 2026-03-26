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
  FileText, Search, Download, Truck, LogIn, LogOut, Clock, 
  CalendarIcon, Upload, FileDown, MapPin, TrendingUp, BarChart3,
  Filter, Building2, Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Vehicle } from '@/types/vehicle';
import { Location } from '@/types/database';
import { cn } from '@/lib/utils';
import { format, differenceInMinutes, subDays, eachDayOfInterval, startOfDay } from 'date-fns';
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

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function VehicleReport() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [stats, setStats] = useState({
    total: 0,
    checkedIn: 0,
    checkedOut: 0,
    avgDuration: '0h 0m',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (dateRange?.from) {
      fetchVehicles();
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

  const fetchVehicles = async () => {
    setLoading(true);
    
    let query = supabase
      .from('vehicles')
      .select(`
        *,
        gate:gates(*),
        location:locations(*)
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
      const typedData = data as unknown as Vehicle[];
      setVehicles(typedData);
      
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
        avgDuration: `${hours}h ${mins}m`,
      });
    }
    setLoading(false);
  };

  // Chart data calculations
  const chartData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to || vehicles.length === 0) {
      return { dailyTrend: [], vehicleTypes: [], locationStats: [], statusDistribution: [] };
    }

    // Daily trend data
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    const dailyTrend = days.map(day => {
      const dayStart = startOfDay(day);
      const dayVehicles = vehicles.filter(v => {
        const created = startOfDay(new Date(v.created_at));
        return created.getTime() === dayStart.getTime();
      });
      const checkIns = vehicles.filter(v => {
        if (!v.check_in_time) return false;
        const checkIn = startOfDay(new Date(v.check_in_time));
        return checkIn.getTime() === dayStart.getTime();
      });
      const checkOuts = vehicles.filter(v => {
        if (!v.check_out_time) return false;
        const checkOut = startOfDay(new Date(v.check_out_time));
        return checkOut.getTime() === dayStart.getTime();
      });
      return {
        date: format(day, 'dd MMM'),
        total: dayVehicles.length,
        checkIns: checkIns.length,
        checkOuts: checkOuts.length,
      };
    });

    // Vehicle type distribution
    const typeMap = new Map<string, number>();
    vehicles.forEach(v => {
      const type = v.vehicle_type || 'Unknown';
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    });
    const vehicleTypes = Array.from(typeMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));

    // Location stats
    const locationMap = new Map<string, { checkIns: number; checkOuts: number }>();
    vehicles.forEach(v => {
      const locName = v.location?.name || 'Unknown';
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
      { name: 'Registered', value: stats.total - stats.checkedIn - stats.checkedOut, color: '#3b82f6' },
    ].filter(s => s.value > 0);

    return { dailyTrend, vehicleTypes, locationStats, statusDistribution };
  }, [vehicles, dateRange, stats]);

  // Get unique vehicle types for filter
  const vehicleTypes = useMemo(() => {
    const types = new Set(vehicles.map(v => v.vehicle_type));
    return Array.from(types).filter(Boolean);
  }, [vehicles]);

  const exportToCsv = () => {
    const headers = [
      'Vehicle Number',
      'Type',
      'Driver Name',
      'Driver Phone',
      'Company',
      'Purpose',
      'Location',
      'Gate',
      'Status',
      'Check In',
      'Check Out',
    ];
    
    const rows = filteredVehicles.map((v) => [
      v.vehicle_number,
      v.vehicle_type,
      v.driver_name,
      `'${v.driver_phone || ''}`,
      v.company || '',
      v.purpose || '',
      v.location?.name || '',
      v.gate?.name || '',
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
      ...rows.map((r) => r.map(escapeCsvField).join(',')),
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vehicle-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    const headers = [
      'Vehicle Number',
      'Vehicle Type',
      'Driver Name',
      'Driver Phone',
      'Company',
      'Purpose',
    ];
    
    const sampleRows = [
      ['KA-01-AB-1234', 'Truck', 'John Doe', "'+919876543210", 'ABC Transport', 'Delivery'],
      ['MH-02-CD-5678', 'Van', 'Jane Smith', "'+919123456789", 'XYZ Logistics', 'Pickup'],
    ];

    const csv = [
      headers.join(','),
      ...sampleRows.map((r) => r.join(',')),
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vehicle-upload-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const generateVehicleId = () => {
    const uuid1 = crypto.randomUUID().replace(/-/g, '');
    const uuid2 = crypto.randomUUID().replace(/-/g, '');
    return `VEH-${uuid1.substring(0, 8).toUpperCase()}-${uuid2.substring(0, 4).toUpperCase()}`;
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

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const requiredHeaders = ['vehicle number', 'driver name'];
      const missingHeaders = requiredHeaders.filter(
        h => !headers.some(header => header.includes(h.replace(' ', '')))
      );
      
      if (missingHeaders.length > 0) {
        toast.error(`Missing required columns: ${missingHeaders.join(', ')}`);
        setUploading(false);
        return;
      }

      const vehiclesToInsert = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        
        if (values.length < 2 || !values[0]) continue;
        
        vehiclesToInsert.push({
          vehicle_id: generateVehicleId(),
          vehicle_number: values[0]?.toUpperCase() || '',
          vehicle_type: values[1] || 'Truck',
          driver_name: values[2] || 'Unknown',
          driver_phone: values[3] || null,
          company: values[4] || null,
          purpose: values[5] || null,
          status: 'registered',
        });
      }

      if (vehiclesToInsert.length === 0) {
        toast.error('No valid data rows found');
        setUploading(false);
        return;
      }

      const { error } = await supabase.from('vehicles').insert(vehiclesToInsert);

      if (error) {
        toast.error('Failed to import vehicles: ' + error.message);
      } else {
        toast.success(`Successfully imported ${vehiclesToInsert.length} vehicles`);
        fetchVehicles();
      }
    } catch (err) {
      toast.error('Failed to parse CSV file');
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesSearch =
      vehicle.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.driver_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.vehicle_id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || vehicle.status === statusFilter;

    const matchesLocation =
      locationFilter === 'all' || vehicle.location?.id === locationFilter;

    const matchesVehicleType =
      vehicleTypeFilter === 'all' || vehicle.vehicle_type === vehicleTypeFilter;

    return matchesSearch && matchesStatus && matchesLocation && matchesVehicleType;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'checked_in':
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            Checked In
          </Badge>
        );
      case 'checked_out':
        return (
          <Badge variant="outline" className="bg-slate-500/10 text-slate-600 border-slate-500/20">
            Checked Out
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            Registered
          </Badge>
        );
    }
  };

  const calculateDuration = (checkIn: string | null, checkOut: string | null) => {
    if (!checkIn) return '—';
    
    const endTime = checkOut ? new Date(checkOut) : new Date();
    const mins = differenceInMinutes(endTime, new Date(checkIn));
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMins}m`;
    }
    return `${remainingMins}m`;
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setLocationFilter('all');
    setVehicleTypeFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || locationFilter !== 'all' || vehicleTypeFilter !== 'all';

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Vehicle Report Dashboard</h1>
            </div>
            <p className="text-muted-foreground">
              Analytics, trends, and entry/exit logs for commercial vehicles
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Vehicles</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <LogIn className="h-5 w-5" />
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
                  <LogOut className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.checkedOut}</p>
                  <p className="text-sm text-muted-foreground">Checked Out</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                  <Clock className="h-5 w-5" />
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
                Daily Activity Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {chartData.dailyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData.dailyTrend}>
                      <defs>
                        <linearGradient id="colorCheckIns" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorCheckOuts" x1="0" y1="0" x2="0" y2="1">
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
                        fill="url(#colorCheckIns)"
                      />
                      <Area
                        type="monotone"
                        dataKey="checkOuts"
                        name="Check-Outs"
                        stroke="#64748b"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorCheckOuts)"
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

          {/* Vehicle Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Truck className="h-5 w-5 text-primary" />
                Vehicle Type Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {chartData.vehicleTypes.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.vehicleTypes}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {chartData.vehicleTypes.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No data available
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
                    <BarChart data={chartData.locationStats} layout="vertical">
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
                      />
                      <Legend />
                      <Bar dataKey="checkIns" name="Check-Ins" fill="#10b981" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="checkOuts" name="Check-Outs" fill="#64748b" radius={[0, 4, 4, 0]} />
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
                Current Status Overview
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
                        outerRadius={80}
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

        {/* Smart Filters */}
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-card border">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Zap className="h-4 w-4 text-primary" />
            Quick Filters:
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Currently Inside', value: 'checked_in', count: stats.checkedIn, icon: LogIn },
              { label: 'Checked Out', value: 'checked_out', count: stats.checkedOut, icon: LogOut },
              { label: 'Registered', value: 'registered', count: stats.total - stats.checkedIn - stats.checkedOut, icon: Truck },
            ].map((chip) => (
              <Button
                key={chip.value}
                variant={statusFilter === chip.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(statusFilter === chip.value ? 'all' : chip.value)}
                className="gap-1.5"
              >
                <chip.icon className="h-3.5 w-3.5" />
                {chip.label}
                <Badge variant="secondary" className={cn(
                  'ml-1 h-5 min-w-[20px] flex items-center justify-center text-[10px] font-bold px-1.5',
                  statusFilter === chip.value ? 'bg-primary-foreground/20 text-primary-foreground' : ''
                )}>
                  {chip.count}
                </Badge>
              </Button>
            ))}
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto text-muted-foreground gap-1">
              <Filter className="h-3.5 w-3.5" />
              Clear all
            </Button>
          )}
        </div>

        {/* Filters Section */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Search & Filter
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by vehicle number, driver, or company..."
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
                  <SelectItem value="registered">Registered</SelectItem>
                  <SelectItem value="checked_in">Checked In</SelectItem>
                  <SelectItem value="checked_out">Checked Out</SelectItem>
                </SelectContent>
              </Select>

              <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
                <SelectTrigger className="w-40">
                  <Truck className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50">
                  <SelectItem value="all">All Types</SelectItem>
                  {vehicleTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
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

        {/* Vehicle History Table */}
        <Card>
          <div className="p-6 border-b border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Entry/Exit Log
              <Badge variant="secondary">{filteredVehicles.length} records</Badge>
            </h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                      Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredVehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No vehicles found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredVehicles.slice(0, 50).map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{vehicle.vehicle_number}</p>
                        <code className="text-xs text-muted-foreground">
                          {vehicle.vehicle_id}
                        </code>
                      </div>
                    </TableCell>
                    <TableCell>{vehicle.vehicle_type}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{vehicle.driver_name}</p>
                        {vehicle.driver_phone && (
                          <p className="text-xs text-muted-foreground">
                            {vehicle.driver_phone}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{vehicle.company || '—'}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{vehicle.location?.name || '—'}</p>
                        {vehicle.gate?.name && (
                          <p className="text-xs text-muted-foreground">
                            {vehicle.gate.name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                    <TableCell className="text-sm">
                      {vehicle.check_in_time
                        ? format(new Date(vehicle.check_in_time), 'dd MMM, hh:mm a')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {vehicle.check_out_time
                        ? format(new Date(vehicle.check_out_time), 'dd MMM, hh:mm a')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {calculateDuration(vehicle.check_in_time, vehicle.check_out_time)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {filteredVehicles.length > 50 && (
            <div className="p-4 text-center text-sm text-muted-foreground border-t">
              Showing 50 of {filteredVehicles.length} records. Export to CSV for full data.
            </div>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
