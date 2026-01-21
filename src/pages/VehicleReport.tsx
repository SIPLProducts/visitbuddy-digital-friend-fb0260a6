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
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Search, Download, Truck, LogIn, LogOut, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Vehicle } from '@/types/vehicle';
import { cn } from '@/lib/utils';
import { format, differenceInMinutes } from 'date-fns';

export default function VehicleReport() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('7');
  const [stats, setStats] = useState({
    total: 0,
    checkedIn: 0,
    checkedOut: 0,
    avgDuration: '0h 0m',
  });

  useEffect(() => {
    fetchVehicles();
  }, [dateFilter]);

  const fetchVehicles = async () => {
    setLoading(true);
    
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(dateFilter));

    const { data } = await supabase
      .from('vehicles')
      .select(`
        *,
        gate:gates(*),
        location:locations(*)
      `)
      .gte('created_at', daysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (data) {
      const typedData = data as unknown as Vehicle[];
      setVehicles(typedData);
      
      // Calculate average duration for checked out vehicles
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

  const exportToCsv = () => {
    const headers = [
      'Vehicle ID',
      'Vehicle Number',
      'Type',
      'Driver Name',
      'Driver Phone',
      'Company',
      'Purpose',
      'Status',
      'Check In Time',
      'Check Out Time',
      'Duration (mins)',
      'Gate',
      'Location',
    ];
    
    const rows = vehicles.map((v) => {
      const duration = v.check_in_time && v.check_out_time
        ? differenceInMinutes(new Date(v.check_out_time), new Date(v.check_in_time))
        : '';
      
      return [
        v.vehicle_id,
        v.vehicle_number,
        v.vehicle_type,
        v.driver_name,
        v.driver_phone || '',
        v.company || '',
        v.purpose || '',
        v.status,
        v.check_in_time ? format(new Date(v.check_in_time), 'yyyy-MM-dd HH:mm:ss') : '',
        v.check_out_time ? format(new Date(v.check_out_time), 'yyyy-MM-dd HH:mm:ss') : '',
        duration.toString(),
        v.gate?.name || '',
        v.location?.name || '',
      ];
    });

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

  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesSearch =
      vehicle.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.driver_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.vehicle_id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || vehicle.status === statusFilter;

    return matchesSearch && matchesStatus;
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

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Vehicle Report</h1>
            </div>
            <p className="text-muted-foreground">
              View entry/exit logs and export vehicle history
            </p>
          </div>
          <Button onClick={exportToCsv} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
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
          <Card>
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
          <Card>
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
          <Card>
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

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-md">
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
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="registered">Registered</SelectItem>
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
              <SelectItem value="365">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
                <TableHead>Status</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredVehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No vehicles found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredVehicles.map((vehicle) => (
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
        </Card>
      </div>
    </MainLayout>
  );
}
