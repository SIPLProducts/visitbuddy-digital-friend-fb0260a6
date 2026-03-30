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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Plus, Search, MoreVertical, LogIn, LogOut, Trash2, QrCode, FileText, History, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Vehicle, VehicleEntry } from '@/types/vehicle';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

export default function Vehicles() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [vehicleEntries, setVehicleEntries] = useState<VehicleEntry[]>([]);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    // Fetch vehicles with their active entry (entry without exit_time)
    const { data: vehiclesData, error: vehiclesError } = await supabase
      .from('vehicles')
      .select(`
        *,
        gate:gates(*),
        location:locations(*),
        department:departments(id, name),
        employee:employees(id, name)
      `)
      .order('created_at', { ascending: false });

    if (vehiclesError) {
      toast.error('Failed to fetch vehicles');
      setLoading(false);
      return;
    }

    // Fetch active entries (inside premises)
    const { data: activeEntries } = await supabase
      .from('vehicle_entries')
      .select('*')
      .is('exit_time', null);

    // Fetch entry counts per vehicle
    const { data: entryCounts } = await supabase
      .from('vehicle_entries')
      .select('vehicle_id');

    // Map vehicles with their active entry and count
    const vehiclesWithEntries = (vehiclesData || []).map((vehicle: any) => {
      const activeEntry = activeEntries?.find(e => e.vehicle_id === vehicle.id);
      const count = entryCounts?.filter(e => e.vehicle_id === vehicle.id).length || 0;
      return {
        ...vehicle,
        active_entry: activeEntry || null,
        entry_count: count,
        // Update status based on active entry
        status: activeEntry ? 'checked_in' : (count > 0 ? 'checked_out' : 'registered'),
      };
    });

    setVehicles(vehiclesWithEntries as unknown as Vehicle[]);
    setLoading(false);
  };

  const handleCheckIn = async (vehicle: Vehicle) => {
    // Create a new entry record
    const { error } = await supabase
      .from('vehicle_entries')
      .insert({
        vehicle_id: vehicle.id,
        gate_id: vehicle.gate_id,
        location_id: vehicle.location_id,
        entry_time: new Date().toISOString(),
        purpose: vehicle.purpose,
      });

    if (error) {
      toast.error('Failed to check in vehicle');
    } else {
      // Update vehicle status
      await supabase
        .from('vehicles')
        .update({
          status: 'checked_in',
          check_in_time: new Date().toISOString(),
          check_out_time: null,
        })
        .eq('id', vehicle.id);

      toast.success(`${vehicle.vehicle_number} checked in`);
      fetchVehicles();
    }
  };

  const handleCheckOut = async (vehicle: Vehicle) => {
    // Find and update the active entry
    const { error } = await supabase
      .from('vehicle_entries')
      .update({
        exit_time: new Date().toISOString(),
      })
      .eq('vehicle_id', vehicle.id)
      .is('exit_time', null);

    if (error) {
      toast.error('Failed to check out vehicle');
    } else {
      // Update vehicle status
      await supabase
        .from('vehicles')
        .update({
          status: 'checked_out',
          check_out_time: new Date().toISOString(),
        })
        .eq('id', vehicle.id);

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

  const handleViewHistory = async (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowHistoryDialog(true);
    setLoadingHistory(true);

    const { data, error } = await supabase
      .from('vehicle_entries')
      .select(`
        *,
        gate:gates(name),
        location:locations(name)
      `)
      .eq('vehicle_id', vehicle.id)
      .order('entry_time', { ascending: false });

    if (error) {
      toast.error('Failed to load entry history');
    } else {
      setVehicleEntries(data as unknown as VehicleEntry[]);
    }
    setLoadingHistory(false);
  };

  const getStatusBadge = (vehicle: Vehicle) => {
    const badges = [];
    if (vehicle.auto_allow) {
      badges.push(<Badge key="auto" className="bg-purple-500/10 text-purple-600 border-purple-500/20">Auto</Badge>);
    }
    if (vehicle.active_entry) {
      badges.push(<Badge key="status" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Inside</Badge>);
    } else if (vehicle.entry_count && vehicle.entry_count > 0) {
      badges.push(<Badge key="status" className="bg-slate-500/10 text-slate-600 border-slate-500/20">Outside</Badge>);
    } else {
      badges.push(<Badge key="status" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Registered</Badge>);
    }
    return <div className="flex gap-1">{badges}</div>;
  };

  const formatDuration = (entry: VehicleEntry) => {
    if (!entry.exit_time) {
      return formatDistanceToNow(new Date(entry.entry_time), { addSuffix: false });
    }
    const start = new Date(entry.entry_time);
    const end = new Date(entry.exit_time);
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.driver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: vehicles.length,
    inside: vehicles.filter((v) => v.active_entry).length,
    totalEntries: vehicles.reduce((sum, v) => sum + (v.entry_count || 0), 0),
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
              Track and manage commercial vehicles with entry history
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
              <p className="text-2xl font-bold text-emerald-600">{stats.inside}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{stats.totalEntries}</p>
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
                  <TableHead>Registered On</TableHead>
                  <TableHead>Last Entry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Entries</TableHead>
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
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(vehicle.created_at), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {vehicle.check_in_time
                          ? format(new Date(vehicle.check_in_time), 'dd/MM/yyyy HH:mm')
                          : '—'}
                      </TableCell>
                      <TableCell>{getStatusBadge(vehicle)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-muted-foreground hover:text-foreground"
                          onClick={() => handleViewHistory(vehicle)}
                        >
                          <History className="h-3 w-3" />
                          {vehicle.entry_count || 0}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewHistory(vehicle)}>
                              <History className="h-4 w-4 mr-2" />
                              View History
                            </DropdownMenuItem>
                            {!vehicle.active_entry && (
                              <DropdownMenuItem onClick={() => handleCheckIn(vehicle)}>
                                <LogIn className="h-4 w-4 mr-2" />
                                Check In
                              </DropdownMenuItem>
                            )}
                            {vehicle.active_entry && (
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

        {/* Entry History Dialog */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Entry History - {selectedVehicle?.vehicle_number}
              </DialogTitle>
              <DialogDescription>
                {selectedVehicle?.driver_name} • {selectedVehicle?.company || 'No company'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto">
              {loadingHistory ? (
                <div className="text-center py-8 text-muted-foreground">Loading history...</div>
              ) : vehicleEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No entry records found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vehicleEntries.map((entry, index) => (
                    <div
                      key={entry.id}
                      className={`p-4 rounded-lg border ${!entry.exit_time ? 'border-emerald-500/50 bg-emerald-500/5' : 'bg-muted/30'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            Entry #{vehicleEntries.length - index}
                          </span>
                          {!entry.exit_time && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 text-xs">
                              Currently Inside
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDuration(entry)}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Entry Time</p>
                          <p className="font-medium">
                            {format(new Date(entry.entry_time), 'dd MMM yyyy, hh:mm a')}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Exit Time</p>
                          <p className="font-medium">
                            {entry.exit_time
                              ? format(new Date(entry.exit_time), 'dd MMM yyyy, hh:mm a')
                              : '—'}
                          </p>
                        </div>
                        {entry.location && (
                          <div>
                            <p className="text-muted-foreground">Location</p>
                            <p className="font-medium">{(entry.location as any).name}</p>
                          </div>
                        )}
                        {entry.gate && (
                          <div>
                            <p className="text-muted-foreground">Gate</p>
                            <p className="font-medium">{(entry.gate as any).name}</p>
                          </div>
                        )}
                      </div>
                      
                      {entry.purpose && (
                        <div className="mt-2 text-sm">
                          <p className="text-muted-foreground">Purpose</p>
                          <p>{entry.purpose}</p>
                        </div>
                      )}
                      {entry.remarks && (
                        <div className="mt-2 text-sm">
                          <p className="text-muted-foreground">Remarks</p>
                          <p>{entry.remarks}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
