"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Shield, Plus, Edit, Trash2, Users } from "lucide-react";

const defaultRoles = [
  {
    id: "admin",
    name: "Administrator",
    description: "Full access to all features and settings",
    userCount: 2,
    permissions: ["all"],
    isSystem: true,
  },
  {
    id: "manager",
    name: "Manager",
    description: "Manage team, view reports, approve expenses",
    userCount: 4,
    permissions: ["hr.view", "hr.edit", "reports.view", "expenses.approve"],
    isSystem: false,
  },
  {
    id: "accountant",
    name: "Accountant",
    description: "Manage finances, accounting, and reports",
    userCount: 3,
    permissions: ["accounting.all", "reports.view", "invoices.all"],
    isSystem: false,
  },
  {
    id: "employee",
    name: "Employee",
    description: "Basic access for day-to-day operations",
    userCount: 15,
    permissions: ["dashboard.view", "profile.edit"],
    isSystem: true,
  },
];

const permissionCategories = [
  {
    name: "Dashboard",
    permissions: [
      { id: "dashboard.view", label: "View Dashboard" },
      { id: "dashboard.analytics", label: "View Analytics" },
    ],
  },
  {
    name: "HR Management",
    permissions: [
      { id: "hr.view", label: "View Employees" },
      { id: "hr.edit", label: "Edit Employees" },
      { id: "hr.delete", label: "Delete Employees" },
    ],
  },
  {
    name: "Accounting",
    permissions: [
      { id: "accounting.view", label: "View Accounting" },
      { id: "accounting.edit", label: "Edit Entries" },
      { id: "accounting.all", label: "Full Access" },
    ],
  },
  {
    name: "Invoices",
    permissions: [
      { id: "invoices.view", label: "View Invoices" },
      { id: "invoices.create", label: "Create Invoices" },
      { id: "invoices.all", label: "Full Access" },
    ],
  },
  {
    name: "Expenses",
    permissions: [
      { id: "expenses.view", label: "View Expenses" },
      { id: "expenses.submit", label: "Submit Expenses" },
      { id: "expenses.approve", label: "Approve Expenses" },
    ],
  },
  {
    name: "Reports",
    permissions: [
      { id: "reports.view", label: "View Reports" },
      { id: "reports.export", label: "Export Reports" },
    ],
  },
];

export default function RolesPage() {
  const [roles, setRoles] = useState(defaultRoles);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleCreateRole = () => {
    if (!newRoleName) return;

    const newRole = {
      id: newRoleName.toLowerCase().replace(/\s+/g, "_"),
      name: newRoleName,
      description: newRoleDescription,
      userCount: 0,
      permissions: selectedPermissions,
      isSystem: false,
    };

    setRoles([...roles, newRole]);
    setIsCreateDialogOpen(false);
    setNewRoleName("");
    setNewRoleDescription("");
    setSelectedPermissions([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-muted-foreground">
            Manage access levels for your staff
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>
                Define a new role with specific permissions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="roleName">Role Name</Label>
                  <Input
                    id="roleName"
                    placeholder="e.g., Sales Manager"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roleDesc">Description</Label>
                  <Input
                    id="roleDesc"
                    placeholder="Brief description"
                    value={newRoleDescription}
                    onChange={(e) => setNewRoleDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label>Permissions</Label>
                {permissionCategories.map((category) => (
                  <div key={category.name} className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">{category.name}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {category.permissions.map((permission) => (
                        <div
                          key={permission.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={permission.id}
                            checked={selectedPermissions.includes(permission.id)}
                            onCheckedChange={() => togglePermission(permission.id)}
                          />
                          <label
                            htmlFor={permission.id}
                            className="text-sm cursor-pointer"
                          >
                            {permission.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRole} disabled={!newRoleName}>
                Create Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Roles List */}
      <div className="grid gap-4">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {role.name}
                      {role.isSystem && (
                        <Badge variant="secondary" className="text-xs">System</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{role.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mr-4">
                    <Users className="h-4 w-4" />
                    {role.userCount} users
                  </div>
                  {!role.isSystem && (
                    <>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {role.permissions.includes("all") ? (
                  <Badge variant="default">Full Access</Badge>
                ) : (
                  role.permissions.map((permission) => (
                    <Badge key={permission} variant="outline">
                      {permission.replace(".", ": ").replace(/_/g, " ")}
                    </Badge>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
