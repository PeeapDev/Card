"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  Plus,
  Shield,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Loader2,
  Check,
  Lock,
} from "lucide-react";
import { teamService } from "@/lib/team/team.service";
import { AVAILABLE_PERMISSIONS, ROLE_PERMISSIONS } from "@/lib/team/types";
import type { Role, RoleType, PermissionCategory } from "@/lib/team/types";

const PERMISSION_CATEGORIES: { id: PermissionCategory; name: string; description: string }[] = [
  { id: "dashboard", name: "Dashboard", description: "Access to main dashboard" },
  { id: "transactions", name: "Transactions", description: "View and manage transactions" },
  { id: "invoices", name: "Invoices", description: "Invoice management" },
  { id: "subscriptions", name: "Subscriptions", description: "Subscription management" },
  { id: "cards", name: "Employee Cards", description: "Card issuance and management" },
  { id: "team", name: "Team", description: "Team member management" },
  { id: "reports", name: "Reports", description: "Analytics and reporting" },
  { id: "settings", name: "Settings", description: "Business settings" },
  { id: "fuel_station", name: "Fuel Station", description: "Fuel station operations" },
  { id: "api", name: "API Access", description: "API key management" },
];

const ROLE_TYPE_COLORS: Record<RoleType, string> = {
  owner: "bg-purple-100 text-purple-800",
  admin: "bg-red-100 text-red-800",
  manager: "bg-blue-100 text-blue-800",
  accountant: "bg-green-100 text-green-800",
  staff: "bg-yellow-100 text-yellow-800",
  viewer: "bg-gray-100 text-gray-600",
  custom: "bg-primary/10 text-primary",
};

const DEFAULT_ROLES: { type: RoleType; name: string; description: string }[] = [
  { type: "owner", name: "Owner", description: "Full access to everything. Cannot be modified." },
  { type: "admin", name: "Administrator", description: "Full access except billing management." },
  { type: "manager", name: "Manager", description: "Manage day-to-day operations and team." },
  { type: "accountant", name: "Accountant", description: "Access to financial data and reports." },
  { type: "staff", name: "Staff", description: "Basic operational access." },
  { type: "viewer", name: "Viewer", description: "Read-only access to view data." },
];

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const data = await teamService.getRoles();
      setRoles(data);
    } catch (error) {
      console.error("Failed to load roles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setRoleName("");
    setRoleDescription("");
    setSelectedPermissions([]);
  };

  const handleAdd = () => {
    resetForm();
    setShowAddDialog(true);
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || "");
    setSelectedPermissions(role.permissions.map(p => p.id));
    setShowEditDialog(true);
  };

  const handleSaveNew = async () => {
    if (!roleName.trim()) {
      alert("Please enter a role name");
      return;
    }

    setIsSaving(true);
    try {
      await teamService.createRole({
        name: roleName,
        description: roleDescription || undefined,
        permissions: selectedPermissions,
      });
      setShowAddDialog(false);
      resetForm();
      loadRoles();
    } catch (error) {
      console.error("Failed to create role:", error);
      alert("Failed to create role");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingRole || !roleName.trim()) {
      alert("Please enter a role name");
      return;
    }

    setIsSaving(true);
    try {
      await teamService.updateRole(editingRole.id, {
        name: roleName,
        description: roleDescription || undefined,
        permissions: selectedPermissions,
      });
      setShowEditDialog(false);
      setEditingRole(null);
      resetForm();
      loadRoles();
    } catch (error) {
      console.error("Failed to update role:", error);
      alert("Failed to update role");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (roleId: string) => {
    if (!confirm("Are you sure you want to delete this role?")) return;
    try {
      await teamService.deleteRole(roleId);
      loadRoles();
    } catch (error: any) {
      console.error("Failed to delete role:", error);
      alert(error.message || "Failed to delete role");
    }
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((p) => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const toggleCategoryPermissions = (category: PermissionCategory) => {
    const categoryPermissions = AVAILABLE_PERMISSIONS
      .filter((p) => p.category === category)
      .map((p) => p.id);

    const allSelected = categoryPermissions.every((p) =>
      selectedPermissions.includes(p)
    );

    if (allSelected) {
      setSelectedPermissions((prev) =>
        prev.filter((p) => !categoryPermissions.includes(p))
      );
    } else {
      setSelectedPermissions((prev) => [
        ...new Set([...prev, ...categoryPermissions]),
      ]);
    }
  };

  const getPermissionsByCategory = (category: PermissionCategory) => {
    return AVAILABLE_PERMISSIONS.filter((p) => p.category === category);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/employees">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Roles & Permissions</h1>
            <p className="text-muted-foreground">
              Define access levels for your team members
            </p>
          </div>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </div>

      {/* Default Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            System Roles
          </CardTitle>
          <CardDescription>
            Predefined roles with standard permission sets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {DEFAULT_ROLES.map((role) => (
              <div
                key={role.type}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge className={ROLE_TYPE_COLORS[role.type]}>
                    {role.name}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {ROLE_PERMISSIONS[role.type].length} permissions
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{role.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Custom Roles
          </CardTitle>
          <CardDescription>
            Create custom roles with specific permissions for your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roles.filter((r) => !r.is_system).length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-1">No custom roles yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create custom roles for specialized access control
              </p>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Create Custom Role
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {roles
                .filter((r) => !r.is_system)
                .map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{role.name}</p>
                          <Badge variant="outline" className="text-xs">
                            {role.permissions.length} permissions
                          </Badge>
                        </div>
                        {role.description && (
                          <p className="text-sm text-muted-foreground">
                            {role.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {role.member_count !== undefined && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          {role.member_count}
                        </div>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(role)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(role.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Role Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Custom Role</DialogTitle>
            <DialogDescription>
              Define a new role with specific permissions
            </DialogDescription>
          </DialogHeader>
          <RoleForm
            roleName={roleName}
            setRoleName={setRoleName}
            roleDescription={roleDescription}
            setRoleDescription={setRoleDescription}
            selectedPermissions={selectedPermissions}
            togglePermission={togglePermission}
            toggleCategoryPermissions={toggleCategoryPermissions}
            getPermissionsByCategory={getPermissionsByCategory}
            onSave={handleSaveNew}
            onCancel={() => setShowAddDialog(false)}
            isSaving={isSaving}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update role permissions
            </DialogDescription>
          </DialogHeader>
          <RoleForm
            roleName={roleName}
            setRoleName={setRoleName}
            roleDescription={roleDescription}
            setRoleDescription={setRoleDescription}
            selectedPermissions={selectedPermissions}
            togglePermission={togglePermission}
            toggleCategoryPermissions={toggleCategoryPermissions}
            getPermissionsByCategory={getPermissionsByCategory}
            onSave={handleSaveEdit}
            onCancel={() => setShowEditDialog(false)}
            isSaving={isSaving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoleForm({
  roleName,
  setRoleName,
  roleDescription,
  setRoleDescription,
  selectedPermissions,
  togglePermission,
  toggleCategoryPermissions,
  getPermissionsByCategory,
  onSave,
  onCancel,
  isSaving,
}: {
  roleName: string;
  setRoleName: (name: string) => void;
  roleDescription: string;
  setRoleDescription: (desc: string) => void;
  selectedPermissions: string[];
  togglePermission: (id: string) => void;
  toggleCategoryPermissions: (category: PermissionCategory) => void;
  getPermissionsByCategory: (category: PermissionCategory) => typeof AVAILABLE_PERMISSIONS;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  return (
    <>
      <div className="space-y-4 py-4">
        <div>
          <Label htmlFor="roleName">Role Name *</Label>
          <Input
            id="roleName"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder="e.g., Sales Manager"
          />
        </div>
        <div>
          <Label htmlFor="roleDescription">Description</Label>
          <Textarea
            id="roleDescription"
            value={roleDescription}
            onChange={(e) => setRoleDescription(e.target.value)}
            placeholder="Brief description of this role's responsibilities"
            rows={2}
          />
        </div>

        <div>
          <Label className="mb-3 block">Permissions</Label>
          <Accordion type="multiple" className="w-full">
            {PERMISSION_CATEGORIES.map((category) => {
              const categoryPermissions = getPermissionsByCategory(category.id);
              const selectedCount = categoryPermissions.filter((p) =>
                selectedPermissions.includes(p.id)
              ).length;
              const allSelected = selectedCount === categoryPermissions.length;

              return (
                <AccordionItem key={category.id} value={category.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={() => toggleCategoryPermissions(category.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="text-left">
                          <p className="font-medium">{category.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {category.description}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {selectedCount}/{categoryPermissions.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-8 space-y-2 pt-2">
                      {categoryPermissions.map((permission) => (
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
                            className="text-sm cursor-pointer flex-1"
                          >
                            <span className="font-medium">{permission.name}</span>
                            {permission.description && (
                              <span className="text-muted-foreground ml-2">
                                - {permission.description}
                              </span>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save Role
        </Button>
      </DialogFooter>
    </>
  );
}
