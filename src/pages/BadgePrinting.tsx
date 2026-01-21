import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Printer, Laptop, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Visitor, Location } from '@/types/database';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VisitorWithLocation extends Omit<Visitor, 'gate'> {
  gate?: {
    id: string;
    location_id: string | null;
    location?: Location;
  } | null;
}

export default function BadgePrinting() {
  const [searchQuery, setSearchQuery] = useState('');
  const [visitors, setVisitors] = useState<VisitorWithLocation[]>([]);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorWithLocation | null>(null);

  useEffect(() => {
    fetchCheckedInVisitors();
  }, []);

  const fetchCheckedInVisitors = async () => {
    const { data } = await supabase
      .from('visitors')
      .select(`
        *,
        host:employees(*, department:departments(*)),
        department:departments(*),
        gate:gates(id, location_id, location:locations(*))
      `)
      .eq('status', 'checked_in')
      .order('check_in_time', { ascending: false });

    if (data) {
      setVisitors(data as unknown as VisitorWithLocation[]);
    }
  };

  const handlePrintBadge = async (visitor: Visitor) => {
    // Mark badge as printed
    const { error } = await supabase
      .from('visitors')
      .update({ badge_printed: true })
      .eq('id', visitor.id);

    if (error) {
      toast.error('Failed to update badge status');
    } else {
      toast.success(`Badge printed for ${visitor.name}`);
      fetchCheckedInVisitors();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredVisitors = visitors.filter(
    (v) =>
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Printer className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Badge Printing</h1>
          </div>
          <p className="text-muted-foreground">
            Print visitor badges for checked-in visitors
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Checked-in Visitors List */}
          <div className="bg-card rounded-xl border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="font-semibold text-foreground mb-4">Checked-in Visitors</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search visitors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto divide-y divide-border">
              {filteredVisitors.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No checked-in visitors
                </div>
              ) : (
                filteredVisitors.map((visitor) => (
                  <button
                    key={visitor.id}
                    onClick={() => setSelectedVisitor(visitor)}
                    className={cn(
                      'w-full p-4 text-left hover:bg-accent/50 transition-colors flex items-center gap-4',
                      selectedVisitor?.id === visitor.id && 'bg-accent'
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback
                        className={cn(
                          'font-medium',
                          visitor.badge_printed
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-primary/10 text-primary'
                        )}
                      >
                        {getInitials(visitor.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{visitor.name}</p>
                        <Badge
                          variant="outline"
                          className="bg-emerald-100 text-emerald-700 border-emerald-200"
                        >
                          Checked In
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {visitor.company || visitor.purpose}
                      </p>
                    </div>
                    {visitor.has_laptop && (
                      <Badge variant="outline" className="gap-1">
                        <Laptop className="h-3 w-3" />
                        Laptop
                      </Badge>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Badge Preview */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-6 flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Badge Preview
            </h3>

            {selectedVisitor ? (
              <div className="space-y-6">
                {/* Badge Card */}
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-border rounded-xl p-6 aspect-[3/4] max-w-xs mx-auto flex flex-col">
                  <div className="text-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary mx-auto flex items-center justify-center mb-2">
                      <span className="text-primary-foreground font-bold text-sm">V</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">VisiGuard</p>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <Avatar className="h-20 w-20 mb-4">
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                        {getInitials(selectedVisitor.name)}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {selectedVisitor.name}
                    </h3>
                    {selectedVisitor.company && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {selectedVisitor.company}
                      </p>
                    )}
                    <Badge className="mb-4">VISITOR</Badge>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {selectedVisitor.visitor_id}
                    </code>
                  </div>

                  <div className="text-center space-y-1">
                    {selectedVisitor.gate?.location?.geo_address && (
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {selectedVisitor.gate.location.geo_address}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Host: {selectedVisitor.host?.name || '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date().toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Print Button */}
                <Button
                  className="w-full gap-2"
                  onClick={() => handlePrintBadge(selectedVisitor as unknown as Visitor)}
                >
                  <Printer className="h-4 w-4" />
                  {selectedVisitor.badge_printed ? 'Reprint Badge' : 'Print Badge'}
                </Button>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-32 h-40 mx-auto bg-muted rounded-lg flex items-center justify-center mb-4 border-2 border-dashed border-border">
                  <Printer className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  Select a visitor to preview their badge
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
