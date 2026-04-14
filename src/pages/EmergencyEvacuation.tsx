import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Users, Truck, Phone, Download, RefreshCw, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { logAudit } from '@/lib/auditLog';

interface CheckedInVisitor {
  id: string;
  name: string;
  phone: string | null;
  company: string | null;
  check_in_time: string | null;
  host: { name: string } | null;
  department: { name: string } | null;
  gate: { name: string; location: { name: string } | null } | null;
}

interface CheckedInVehicle {
  id: string;
  vehicle_number: string;
  driver_name: string;
  driver_phone: string | null;
  vehicle_type: string;
  check_in_time: string | null;
  company: string | null;
  gate: { name: string } | null;
}

export default function EmergencyEvacuation() {
  const [visitors, setVisitors] = useState<CheckedInVisitor[]>([]);
  const [vehicles, setVehicles] = useState<CheckedInVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = async () => {
    setLoading(true);
    const [vRes, veRes] = await Promise.all([
      supabase.from('visitors').select('id, name, phone, company, check_in_time, host:employees(name), department:departments(name), gate:gates(name, location:locations(name))').eq('status', 'checked_in'),
      supabase.from('vehicles').select('id, vehicle_number, driver_name, driver_phone, vehicle_type, check_in_time, company, gate:gates(name)').eq('status', 'checked_in'),
    ]);
    setVisitors((vRes.data as any) || []);
    setVehicles((veRes.data as any) || []);
    setLastRefresh(new Date());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const exportReport = () => {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
    let report = `EMERGENCY EVACUATION HEADCOUNT REPORT\nGenerated: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}\n\n`;
    report += `TOTAL PEOPLE INSIDE: ${visitors.length}\nTOTAL VEHICLES INSIDE: ${vehicles.length}\n\n`;
    report += `--- VISITORS ---\nName,Phone,Company,Host,Department,Gate,Check-In Time\n`;
    visitors.forEach(v => {
      report += `"${v.name}","${v.phone || ''}","${v.company || ''}","${(v.host as any)?.name || ''}","${(v.department as any)?.name || ''}","${(v.gate as any)?.name || ''}","${v.check_in_time ? format(new Date(v.check_in_time), 'HH:mm') : ''}"\n`;
    });
    report += `\n--- VEHICLES ---\nVehicle No,Driver,Phone,Type,Company,Gate,Check-In Time\n`;
    vehicles.forEach(v => {
      report += `"${v.vehicle_number}","${v.driver_name}","${v.driver_phone || ''}","${v.vehicle_type}","${v.company || ''}","${(v.gate as any)?.name || ''}","${v.check_in_time ? format(new Date(v.check_in_time), 'HH:mm') : ''}"\n`;
    });
    const blob = new Blob([report], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `emergency-headcount-${timestamp}.csv`;
    a.click();
    logAudit({ action: 'visitor_check_in', entityType: 'system', entityName: 'Emergency Headcount Export', details: { visitors: visitors.length, vehicles: vehicles.length } });
  };

  return (
      <div className="space-y-5">
        {/* Emergency Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-orange-500 p-6 text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl animate-pulse">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Emergency Evacuation</h1>
                <p className="text-sm text-white/80">Real-time headcount of all personnel & vehicles on premises</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" className="gap-1.5 bg-white/20 hover:bg-white/30 text-white border-0" onClick={fetchData}>
                <RefreshCw className="h-4 w-4" /> Refresh
              </Button>
              <Button className="gap-1.5 bg-white text-red-600 hover:bg-white/90" onClick={exportReport}>
                <Download className="h-4 w-4" /> Export Report
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-red-200 dark:border-red-900/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30"><Users className="h-5 w-5 text-red-600" /></div>
              <div><p className="text-xs text-muted-foreground">Visitors Inside</p><p className="text-2xl font-bold">{visitors.length}</p></div>
            </CardContent>
          </Card>
          <Card className="border-orange-200 dark:border-orange-900/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30"><Truck className="h-5 w-5 text-orange-600" /></div>
              <div><p className="text-xs text-muted-foreground">Vehicles Inside</p><p className="text-2xl font-bold">{vehicles.length}</p></div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 dark:border-amber-900/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30"><Phone className="h-5 w-5 text-amber-600" /></div>
              <div><p className="text-xs text-muted-foreground">With Contact</p><p className="text-2xl font-bold">{visitors.filter(v => v.phone).length}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted"><Clock className="h-5 w-5 text-muted-foreground" /></div>
              <div><p className="text-xs text-muted-foreground">Last Updated</p><p className="text-sm font-bold">{format(lastRefresh, 'HH:mm:ss')}</p></div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="visitors">
          <TabsList>
            <TabsTrigger value="visitors" className="gap-1.5"><Users className="h-4 w-4" /> Visitors ({visitors.length})</TabsTrigger>
            <TabsTrigger value="vehicles" className="gap-1.5"><Truck className="h-4 w-4" /> Vehicles ({vehicles.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="visitors">
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Host</TableHead>
                        <TableHead>Gate / Location</TableHead>
                        <TableHead>Check-In</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-10">Loading...</TableCell></TableRow>
                      ) : visitors.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No visitors currently inside</TableCell></TableRow>
                      ) : visitors.map((v, i) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                          <TableCell className="font-medium">{v.name}</TableCell>
                          <TableCell>{v.phone ? <a href={`tel:${v.phone}`} className="text-primary underline text-sm">{v.phone}</a> : '—'}</TableCell>
                          <TableCell className="text-sm">{v.company || '—'}</TableCell>
                          <TableCell className="text-sm">{(v.host as any)?.name || '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{(v.gate as any)?.name || '—'}{(v.gate as any)?.location?.name && ` · ${(v.gate as any).location.name}`}</TableCell>
                          <TableCell className="text-xs">{v.check_in_time ? format(new Date(v.check_in_time), 'HH:mm') : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="vehicles">
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Vehicle No</TableHead>
                        <TableHead>Driver</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Check-In</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-10">Loading...</TableCell></TableRow>
                      ) : vehicles.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No vehicles currently inside</TableCell></TableRow>
                      ) : vehicles.map((v, i) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                          <TableCell className="font-medium">{v.vehicle_number}</TableCell>
                          <TableCell className="text-sm">{v.driver_name}</TableCell>
                          <TableCell>{v.driver_phone ? <a href={`tel:${v.driver_phone}`} className="text-primary underline text-sm">{v.driver_phone}</a> : '—'}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{v.vehicle_type}</Badge></TableCell>
                          <TableCell className="text-sm">{v.company || '—'}</TableCell>
                          <TableCell className="text-xs">{v.check_in_time ? format(new Date(v.check_in_time), 'HH:mm') : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
