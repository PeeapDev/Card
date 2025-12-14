"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Plus, Edit, Trash2, Users, User } from "lucide-react";

const mockDepartments = [
  {
    id: "ops",
    name: "Operations",
    description: "Day-to-day business operations",
    headName: "John Smith",
    headId: "1",
    employeeCount: 12,
    color: "blue",
  },
  {
    id: "fin",
    name: "Finance",
    description: "Financial management and accounting",
    headName: "Sarah Johnson",
    headId: "2",
    employeeCount: 5,
    color: "green",
  },
  {
    id: "sales",
    name: "Sales",
    description: "Sales and customer relations",
    headName: "Michael Chen",
    headId: "3",
    employeeCount: 4,
    color: "purple",
  },
  {
    id: "mgmt",
    name: "Management",
    description: "Executive management and leadership",
    headName: "Emma Williams",
    headId: "4",
    employeeCount: 3,
    color: "orange",
  },
];

const colorOptions = [
  { id: "blue", label: "Blue", class: "bg-blue-100 text-blue-600" },
  { id: "green", label: "Green", class: "bg-green-100 text-green-600" },
  { id: "purple", label: "Purple", class: "bg-purple-100 text-purple-600" },
  { id: "orange", label: "Orange", class: "bg-orange-100 text-orange-600" },
  { id: "red", label: "Red", class: "bg-red-100 text-red-600" },
  { id: "teal", label: "Teal", class: "bg-teal-100 text-teal-600" },
];

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState(mockDepartments);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptDescription, setNewDeptDescription] = useState("");
  const [newDeptColor, setNewDeptColor] = useState("blue");

  const getColorClass = (color: string) => {
    return colorOptions.find(c => c.id === color)?.class || "bg-gray-100 text-gray-600";
  };

  const handleCreateDepartment = () => {
    if (!newDeptName) return;

    const newDept = {
      id: newDeptName.toLowerCase().replace(/\s+/g, "_"),
      name: newDeptName,
      description: newDeptDescription,
      headName: "",
      headId: "",
      employeeCount: 0,
      color: newDeptColor,
    };

    setDepartments([...departments, newDept]);
    setIsCreateDialogOpen(false);
    setNewDeptName("");
    setNewDeptDescription("");
    setNewDeptColor("blue");
  };

  const totalEmployees = departments.reduce((sum, d) => sum + d.employeeCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Departments</h1>
          <p className="text-muted-foreground">
            Organize your staff into departments
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Department</DialogTitle>
              <DialogDescription>
                Add a new department to your organization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="deptName">Department Name</Label>
                <Input
                  id="deptName"
                  placeholder="e.g., Human Resources"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deptDesc">Description</Label>
                <Input
                  id="deptDesc"
                  placeholder="Brief description of this department"
                  value={newDeptDescription}
                  onChange={(e) => setNewDeptDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Select value={newDeptColor} onValueChange={setNewDeptColor}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((color) => (
                      <SelectItem key={color.id} value={color.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded ${color.class}`} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateDepartment} disabled={!newDeptName}>
                Create Department
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Departments</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg per Department</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {departments.length > 0 ? Math.round(totalEmployees / departments.length) : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Departments Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {departments.map((dept) => (
          <Card key={dept.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getColorClass(dept.color)}`}>
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>{dept.name}</CardTitle>
                    <CardDescription>{dept.description}</CardDescription>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{dept.employeeCount} employees</span>
                </div>
                {dept.headName && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Head:</span>
                    <Badge variant="outline">{dept.headName}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
