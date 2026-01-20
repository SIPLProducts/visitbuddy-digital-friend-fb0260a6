import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Search, Plus, Users, MapPin, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Department, Employee } from '@/types/database';

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [deptRes, empRes] = await Promise.all([
      supabase.from('departments').select('*').order('name'),
      supabase.from('employees').select('*, department:departments(*)').order('name'),
    ]);

    if (deptRes.data) setDepartments(deptRes.data as Department[]);
    if (empRes.data) setEmployees(empRes.data as unknown as Employee[]);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getDepartmentEmployees = (deptId: string) => {
    return employees.filter((e) => e.department_id === deptId);
  };

  const filteredDepartments = departments.filter((dept) =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Departments</h1>
            <p className="text-muted-foreground">
              Manage departments and their employees
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Department
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search departments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Departments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepartments.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No departments found</p>
              <Button variant="outline" className="mt-4">
                Add Your First Department
              </Button>
            </div>
          ) : (
            filteredDepartments.map((dept) => {
              const deptEmployees = getDepartmentEmployees(dept.id);
              const hosts = deptEmployees.filter((e) => e.is_host);

              return (
                <Card
                  key={dept.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedDepartment(dept)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{dept.name}</CardTitle>
                        {dept.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {dept.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="gap-1">
                        <Users className="h-3 w-3" />
                        {deptEmployees.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {dept.location || 'No location set'}
                    </div>

                    {/* Department Lead */}
                    {hosts[0] && (
                      <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                            {getInitials(hosts[0].name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{hosts[0].name}</p>
                          <p className="text-xs text-muted-foreground">
                            {hosts[0].position || 'Department Host'}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          Host
                        </Badge>
                      </div>
                    )}

                    {/* Employees Preview */}
                    <div>
                      <p className="text-sm font-medium mb-2">Employees</p>
                      <div className="space-y-2">
                        {deptEmployees.slice(0, 3).map((emp) => (
                          <div
                            key={emp.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {getInitials(emp.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{emp.name}</span>
                            {emp.is_host && (
                              <Badge variant="outline" className="text-xs">
                                Host
                              </Badge>
                            )}
                          </div>
                        ))}
                        {deptEmployees.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            +{deptEmployees.length - 3} more
                          </p>
                        )}
                        {deptEmployees.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            No employees in this department
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Approved Hosts */}
                    {hosts.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Approved Hosts</p>
                        <div className="flex flex-wrap gap-1">
                          {hosts.slice(0, 4).map((host) => (
                            <Badge
                              key={host.id}
                              variant="secondary"
                              className="text-xs"
                            >
                              {host.name.split(' ')[0]}
                            </Badge>
                          ))}
                          {hosts.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{hosts.length - 4}
                            </Badge>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" className="mt-2 text-xs">
                          <User className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                    )}
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
