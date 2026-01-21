import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Plus, Search, MoreVertical, LogIn, LogOut, Trash2, QrCode, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Vehicle } from '@/types/vehicle';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function Vehicles() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select(`
        *,
        gate:gates(*),
        location:locations(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch vehicles');
    } else {
      setVehicles(data as unknown as Vehicle[]);
    }
    setLoading(false);
  };

  const handleCheckIn = async (vehicle: Vehicle) => {
    const { error } = await supabase
      .from('vehicles')
      .update({
        status: 'checked_in',
        check_in_time: new Date().toISOString(),
      })
      .eq('id', vehicle.id);

    if (error) {
      toast.error('Failed to check in vehicle');
    } else {
      toast.success(`${vehicle.vehicle_number} checked in`);
      fetchVehicles();
    }
  };

  const handleCheckOut = async (vehicle: Vehicle) => {
    const { error } = await supabase
      .from('vehicles')
      .update({
        status: 'checked_out',
        check_out_time: new Date().toISOString(),
      })
      .eq('id', vehicle.id);

    if (error) {
      toast.error('Failed to check out vehicle');
    } else {
      toast.success(`${vehicle.vehicle_number} checked out`);
      fetchVehicles();
    }
  };

  const handleDelete = async (vehicle: Vehicle) => {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', vehicle.id);

    if (error) {
      toast.error('Failed to delete vehicle');
    } else {
      toast.success('Vehicle deleted');
      fetchVehicles();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'checked_in':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Checked In</Badge>;
      case 'checked_out':
        return <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20">Checked Out</Badge>;
      default:
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Registered</Badge>;
    }
  };

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.driver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: vehicles.length,
    checkedIn: vehicles.filter((v) => v.status === 'checked_in').length,
    checkedOut: vehicles.filter((v) => v.status === 'checked_out').length,
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Truck className="h-6 w-6" />
              Vehicle Management
            </h1>
            <p className="text-muted-foreground">
              Track and manage commercial vehicles
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/vehicles/report')}>
              <FileText className="h-4 w-4 mr-2" />
              Report
            </Button>
            <Button variant="outline" onClick={() => navigate('/vehicles/gate')}>
              <QrCode className="h-4 w-4 mr-2" />
              Gate Entry
            </Button>
            <Button onClick={() => navigate('/vehicles/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Vehicle
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Vehicles</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Currently Inside</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">{stats.checkedIn}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Checked Out Today</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-600">{stats.checkedOut}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by vehicle number, driver, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle ID</TableHead>
                  <TableHead>Vehicle Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check-in Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                      No vehicles found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-mono text-sm">{vehicle.vehicle_id}</TableCell>
                      <TableCell className="font-medium">{vehicle.vehicle_number}</TableCell>
                      <TableCell>{vehicle.vehicle_type}</TableCell>
                      <TableCell>
                        <div>
                          <p>{vehicle.driver_name}</p>
                          {vehicle.driver_phone && (
                            <p className="text-xs text-muted-foreground">{vehicle.driver_phone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{vehicle.company || '-'}</TableCell>
                      <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                      <TableCell>
                        {vehicle.check_in_time
                          ? format(new Date(vehicle.check_in_time), 'dd MMM, hh:mm a')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {vehicle.status !== 'checked_in' && (
                              <DropdownMenuItem onClick={() => handleCheckIn(vehicle)}>
                                <LogIn className="h-4 w-4 mr-2" />
                                Check In
                              </DropdownMenuItem>
                            )}
                            {vehicle.status === 'checked_in' && (
                              <DropdownMenuItem onClick={() => handleCheckOut(vehicle)}>
                                <LogOut className="h-4 w-4 mr-2" />
                                Check Out
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDelete(vehicle)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
