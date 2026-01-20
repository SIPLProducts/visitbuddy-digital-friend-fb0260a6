import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  MapPin,
  Plus,
  Building2,
  DoorOpen,
  Users,
  Phone,
  Mail,
  Edit,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Location } from '@/types/database';
import { cn } from '@/lib/utils';

export default function Locations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [stats, setStats] = useState({
    totalLocations: 0,
    totalGates: 0,
    departments: 0,
    currentVisitors: 0,
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .order('name');

    if (data) {
      const typedData = data as Location[];
      setLocations(typedData);

      setStats({
        totalLocations: typedData.length,
        totalGates: typedData.reduce((acc, l) => acc + l.gate_count, 0),
        departments: typedData.reduce((acc, l) => acc + l.department_count, 0),
        currentVisitors: typedData.reduce((acc, l) => acc + l.visitor_count, 0),
      });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalLocations}</p>
                <p className="text-sm text-muted-foreground">Total Locations</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                <DoorOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalGates}</p>
                <p className="text-sm text-muted-foreground">Total Gates</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-100 text-sky-700">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.departments}</p>
                <p className="text-sm text-muted-foreground">Departments</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.currentVisitors}</p>
                <p className="text-sm text-muted-foreground">Current Visitors</p>
              </div>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Locations</h1>
            <p className="text-muted-foreground">
              Manage your office locations and facilities
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Location
          </Button>
        </div>

        {/* Locations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {locations.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No locations configured</p>
              <Button variant="outline" className="mt-4">
                Add Your First Location
              </Button>
            </div>
          ) : (
            locations.map((location) => (
              <Card key={location.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{location.name}</CardTitle>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {location.city}, {location.country}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        location.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      )}
                    >
                      {location.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {location.address && (
                    <p className="text-sm text-muted-foreground">{location.address}</p>
                  )}

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-4 py-3 border-y border-border">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{location.gate_count}</p>
                      <p className="text-xs text-muted-foreground">Gates</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{location.department_count}</p>
                      <p className="text-xs text-muted-foreground">Departments</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{location.visitor_count}</p>
                      <p className="text-xs text-muted-foreground">Visitors</p>
                    </div>
                  </div>

                  {/* Capacity */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Capacity Usage</span>
                      <span className="text-sm font-medium">{location.capacity_usage}%</span>
                    </div>
                    <Progress value={location.capacity_usage} className="h-2" />
                  </div>

                  {/* Contact */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {location.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {location.email}
                      </span>
                    )}
                    {location.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {location.phone}
                      </span>
                    )}
                  </div>

                  <Button variant="outline" className="w-full gap-2">
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}
