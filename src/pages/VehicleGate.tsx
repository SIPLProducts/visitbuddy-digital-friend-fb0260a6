import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Truck, LogIn, LogOut, QrCode, Clock, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Vehicle } from '@/types/vehicle';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { QrScanner } from '@/components/checkin/QrScanner';

export default function VehicleGate() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('vehicles')
      .select(`*, gate:gates(*), location:locations(*)`)
      .or(`vehicle_number.ilike.%${searchTerm}%,vehicle_id.eq.${searchTerm}`)
      .limit(1)
      .single();

    if (error || !data) {
      toast.error('Vehicle not found');
      setSelectedVehicle(null);
    } else {
      setSelectedVehicle(data as unknown as Vehicle);
    }
    setLoading(false);
  };

  const handleQrScan = async (data: { visitorId: string; name: string; timestamp: string }) => {
    setIsScanning(false);
    const vehicleId = data.visitorId;
    
    if (!vehicleId?.startsWith('VEH-')) {
      toast.error('Invalid vehicle QR code');
      return;
    }

    setLoading(true);
    const { data: vehicleData, error } = await supabase
      .from('vehicles')
      .select(`*, gate:gates(*), location:locations(*)`)
      .eq('vehicle_id', vehicleId)
      .single();

    if (error || !vehicleData) {
      toast.error('Vehicle not found');
    } else {
      setSelectedVehicle(vehicleData as unknown as Vehicle);
      toast.success(`Found: ${vehicleData.vehicle_number}`);
    }
    setLoading(false);
  };

  const handleCheckIn = async () => {
    if (!selectedVehicle) return;

    const { error } = await supabase
      .from('vehicles')
      .update({
        status: 'checked_in',
        check_in_time: new Date().toISOString(),
        check_out_time: null,
      })
      .eq('id', selectedVehicle.id);

    if (error) {
      toast.error('Failed to check in vehicle');
    } else {
      toast.success(`${selectedVehicle.vehicle_number} checked in successfully`);
      setSelectedVehicle({ ...selectedVehicle, status: 'checked_in', check_in_time: new Date().toISOString() });
    }
  };

  const handleCheckOut = async () => {
    if (!selectedVehicle) return;

    const { error } = await supabase
      .from('vehicles')
      .update({
        status: 'checked_out',
        check_out_time: new Date().toISOString(),
      })
      .eq('id', selectedVehicle.id);

    if (error) {
      toast.error('Failed to check out vehicle');
    } else {
      toast.success(`${selectedVehicle.vehicle_number} checked out successfully`);
      setSelectedVehicle({ ...selectedVehicle, status: 'checked_out', check_out_time: new Date().toISOString() });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'checked_in':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Inside Premises</Badge>;
      case 'checked_out':
        return <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20">Checked Out</Badge>;
      default:
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Registered</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/vehicles')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Truck className="h-6 w-6" />
              Vehicle Gate Entry
            </h1>
            <p className="text-muted-foreground">
              Check-in/out vehicles at the gate
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Search/Scan Section */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Find Vehicle</CardTitle>
                <CardDescription>
                  Search by vehicle number or scan QR code
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Enter vehicle number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10 uppercase"
                    />
                  </div>
                  <Button onClick={handleSearch} disabled={loading}>
                    Search
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or scan QR code</span>
                  </div>
                </div>

                <QrScanner 
                  onScan={handleQrScan} 
                  isScanning={isScanning}
                  onToggleScanning={setIsScanning}
                />
              </CardContent>
            </Card>
          </div>

          {/* Vehicle Details Section */}
          <div>
            {selectedVehicle ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      {selectedVehicle.vehicle_number}
                    </CardTitle>
                    {getStatusBadge(selectedVehicle.status)}
                  </div>
                  <CardDescription className="font-mono">
                    {selectedVehicle.vehicle_id}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Vehicle Type</p>
                      <p className="font-medium">{selectedVehicle.vehicle_type}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Driver</p>
                      <p className="font-medium">{selectedVehicle.driver_name}</p>
                    </div>
                    {selectedVehicle.driver_phone && (
                      <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p className="font-medium">{selectedVehicle.driver_phone}</p>
                      </div>
                    )}
                    {selectedVehicle.company && (
                      <div>
                        <p className="text-muted-foreground">Company</p>
                        <p className="font-medium">{selectedVehicle.company}</p>
                      </div>
                    )}
                  </div>

                  {selectedVehicle.check_in_time && (
                    <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-muted/50">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Checked in:</span>
                      <span className="font-medium">
                        {format(new Date(selectedVehicle.check_in_time), 'dd MMM yyyy, hh:mm a')}
                      </span>
                    </div>
                  )}

                  {selectedVehicle.check_out_time && (
                    <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-muted/50">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Checked out:</span>
                      <span className="font-medium">
                        {format(new Date(selectedVehicle.check_out_time), 'dd MMM yyyy, hh:mm a')}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    {selectedVehicle.status !== 'checked_in' && (
                      <Button className="flex-1" onClick={handleCheckIn}>
                        <LogIn className="h-4 w-4 mr-2" />
                        Check In
                      </Button>
                    )}
                    {selectedVehicle.status === 'checked_in' && (
                      <Button className="flex-1" variant="outline" onClick={handleCheckOut}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Check Out
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center min-h-[300px]">
                <CardContent className="text-center text-muted-foreground">
                  <Truck className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Search or scan a vehicle to see details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
