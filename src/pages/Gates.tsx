import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  DoorOpen,
  Plus,
  QrCode,
  Clock,
  Users,
  Edit,
  Trash2,
  Power,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Gate } from '@/types/database';
import { cn } from '@/lib/utils';

export default function Gates() {
  const [gates, setGates] = useState<Gate[]>([]);
  const [stats, setStats] = useState({
    totalGates: 0,
    activeGates: 0,
    qrEnabled: 0,
    currentVisitors: 0,
  });

  useEffect(() => {
    fetchGates();
  }, []);

  const fetchGates = async () => {
    const { data } = await supabase
      .from('gates')
      .select('*, location:locations(*)')
      .order('name');

    if (data) {
      const typedData = data as Gate[];
      setGates(typedData);

      setStats({
        totalGates: typedData.length,
        activeGates: typedData.filter((g) => g.status === 'active').length,
        qrEnabled: typedData.filter((g) => g.has_qr).length,
        currentVisitors: typedData.reduce((acc, g) => acc + g.current_visitors, 0),
      });
    }
  };

  const getCapacityPercentage = (current: number, capacity: number) => {
    return Math.round((current / capacity) * 100);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
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
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                <Power className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.activeGates}</p>
                <p className="text-sm text-muted-foreground">Active Gates</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-100 text-sky-700">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.qrEnabled}</p>
                <p className="text-sm text-muted-foreground">QR Enabled</p>
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
            <h1 className="text-2xl font-bold text-foreground">Gates</h1>
            <p className="text-muted-foreground">
              Manage entry and exit points for your facilities
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Gate
          </Button>
        </div>

        {/* Gates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gates.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <DoorOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No gates configured</p>
              <Button variant="outline" className="mt-4">
                Add Your First Gate
              </Button>
            </div>
          ) : (
            gates.map((gate) => {
              const capacityPercent = getCapacityPercentage(
                gate.current_visitors,
                gate.capacity
              );

              return (
                <Card key={gate.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'p-2 rounded-lg',
                            gate.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-700'
                          )}
                        >
                          <DoorOpen className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{gate.name}</CardTitle>
                          {gate.building && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {gate.building}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          gate.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        )}
                      >
                        {gate.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Gate Type & QR */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{gate.gate_type}</Badge>
                      {gate.has_qr && (
                        <Badge variant="outline" className="gap-1">
                          <QrCode className="h-3 w-3" />
                          QR
                        </Badge>
                      )}
                    </div>

                    {/* Capacity */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Capacity</span>
                        <span className="text-sm font-medium">
                          {gate.current_visitors} / {gate.capacity}
                        </span>
                      </div>
                      <Progress
                        value={capacityPercent}
                        className={cn(
                          'h-2',
                          capacityPercent > 80 && '[&>div]:bg-amber-500',
                          capacityPercent > 95 && '[&>div]:bg-rose-500'
                        )}
                      />
                    </div>

                    {/* Operating Hours */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {gate.operating_hours}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 gap-2">
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          gate.status === 'active'
                            ? 'text-amber-600 hover:text-amber-700'
                            : 'text-emerald-600 hover:text-emerald-700'
                        )}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </MainLayout>
  );
}
