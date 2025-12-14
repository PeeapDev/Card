"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Building2,
  Users,
  Shield,
  Bell,
  CreditCard,
  Settings,
  Plus,
  MoreHorizontal,
  Mail,
  Phone,
  Edit,
  Trash2,
  UserPlus,
  Key,
  Check,
  X,
  Copy,
  Eye,
  EyeOff,
  Fuel,
  Receipt,
  FileText,
  BarChart3,
  Wallet,
} from "lucide-react";

// Types
interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: "active" | "invited" | "inactive";
  avatar?: string;
  lastActive?: string;
  permissions: string[];
  stations?: string[]; // For fuel station access
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  memberCount: number;
  isSystem: boolean;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

// Mock Data
const mockTeamMembers: TeamMember[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john@business.com",
    phone: "+232 76 123 456",
    role: "admin",
    status: "active",
    lastActive: new Date().toISOString(),
    permissions: ["all"],
    stations: ["all"],
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@business.com",
    phone: "+232 76 789 012",
    role: "manager",
    status: "active",
    lastActive: new Date(Date.now() - 3600000).toISOString(),
    permissions: ["fuel_sales", "fuel_inventory", "fuel_shifts", "reports_view"],
    stations: ["station-1", "station-2"],
  },
  {
    id: "3",
    name: "Mike Johnson",
    email: "mike@business.com",
    role: "attendant",
    status: "active",
    lastActive: new Date(Date.now() - 7200000).toISOString(),
    permissions: ["fuel_sales", "fuel_shifts"],
    stations: ["station-1"],
  },
  {
    id: "4",
    name: "Sarah Wilson",
    email: "sarah@business.com",
    role: "accountant",
    status: "invited",
    permissions: ["invoices_view", "invoices_create", "reports_view", "transactions_view"],
    stations: [],
  },
];

const mockRoles: Role[] = [
  {
    id: "admin",
    name: "Administrator",
    description: "Full access to all features and settings",
    permissions: ["all"],
    memberCount: 1,
    isSystem: true,
  },
  {
    id: "manager",
    name: "Station Manager",
    description: "Manage fuel stations, staff, and view reports",
    permissions: ["fuel_sales", "fuel_inventory", "fuel_shifts", "fuel_fleet", "reports_view", "team_view"],
    memberCount: 1,
    isSystem: false,
  },
  {
    id: "attendant",
    name: "Pump Attendant",
    description: "Record sales and manage shifts",
    permissions: ["fuel_sales", "fuel_shifts"],
    memberCount: 1,
    isSystem: false,
  },
  {
    id: "accountant",
    name: "Accountant",
    description: "Manage invoices, subscriptions, and financial reports",
    permissions: ["invoices_view", "invoices_create", "subscriptions_view", "reports_view", "transactions_view"],
    memberCount: 1,
    isSystem: false,
  },
  {
    id: "viewer",
    name: "Viewer",
    description: "Read-only access to dashboard and reports",
    permissions: ["dashboard_view", "reports_view"],
    memberCount: 0,
    isSystem: true,
  },
];

const permissionCategories = [
  {
    name: "Dashboard",
    permissions: [
      { id: "dashboard_view", name: "View Dashboard", description: "View main dashboard and stats" },
    ],
  },
  {
    name: "Fuel Station",
    permissions: [
      { id: "fuel_sales", name: "Record Sales", description: "Record fuel sales transactions" },
      { id: "fuel_inventory", name: "Manage Inventory", description: "View and manage tank levels, deliveries" },
      { id: "fuel_shifts", name: "Manage Shifts", description: "Start/end shifts, view shift reports" },
      { id: "fuel_fleet", name: "Manage Fleet", description: "Manage fleet customers and vehicles" },
      { id: "fuel_cards", name: "Manage Fuel Cards", description: "Issue and manage fuel cards" },
      { id: "fuel_pricing", name: "Set Prices", description: "Update fuel prices" },
      { id: "fuel_stations", name: "Manage Stations", description: "Add/edit fuel stations" },
    ],
  },
  {
    name: "Invoicing",
    permissions: [
      { id: "invoices_view", name: "View Invoices", description: "View all invoices" },
      { id: "invoices_create", name: "Create Invoices", description: "Create and send invoices" },
      { id: "invoices_edit", name: "Edit Invoices", description: "Edit and void invoices" },
    ],
  },
  {
    name: "Subscriptions",
    permissions: [
      { id: "subscriptions_view", name: "View Subscriptions", description: "View subscription plans" },
      { id: "subscriptions_manage", name: "Manage Subscriptions", description: "Create and edit subscriptions" },
    ],
  },
  {
    name: "Financial",
    permissions: [
      { id: "transactions_view", name: "View Transactions", description: "View transaction history" },
      { id: "wallet_manage", name: "Manage Wallet", description: "Withdraw and transfer funds" },
      { id: "reports_view", name: "View Reports", description: "Access financial reports" },
      { id: "reports_export", name: "Export Reports", description: "Export reports to CSV/PDF" },
    ],
  },
  {
    name: "Staff",
    permissions: [
      { id: "team_view", name: "View Staff", description: "View staff members" },
      { id: "team_manage", name: "Manage Staff", description: "Add/remove staff members" },
      { id: "roles_manage", name: "Manage Roles", description: "Create and edit roles" },
    ],
  },
  {
    name: "Settings",
    permissions: [
      { id: "settings_view", name: "View Settings", description: "View business settings" },
      { id: "settings_edit", name: "Edit Settings", description: "Modify business settings" },
      { id: "api_manage", name: "Manage API Keys", description: "Create and manage API keys" },
    ],
  },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("business");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(mockTeamMembers);
  const [roles, setRoles] = useState<Role[]>(mockRoles);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Business settings state
  const [businessName, setBusinessName] = useState("My Business");
  const [businessEmail, setBusinessEmail] = useState("contact@mybusiness.com");
  const [businessPhone, setBusinessPhone] = useState("+232 76 000 000");
  const [businessAddress, setBusinessAddress] = useState("123 Main Street, Freetown");
  const [defaultCurrency, setDefaultCurrency] = useState("SLE");

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("");

  // New role form state
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");

  const handleInviteMember = () => {
    if (!inviteEmail || !inviteName || !inviteRole) return;

    const newMember: TeamMember = {
      id: Date.now().toString(),
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
      status: "invited",
      permissions: roles.find(r => r.id === inviteRole)?.permissions || [],
      stations: [],
    };

    setTeamMembers([...teamMembers, newMember]);
    setInviteEmail("");
    setInviteName("");
    setInviteRole("");
    setIsInviteDialogOpen(false);
  };

  const handleRemoveMember = (id: string) => {
    setTeamMembers(teamMembers.filter(m => m.id !== id));
  };

  const handleCreateRole = () => {
    if (!newRoleName) return;

    const newRole: Role = {
      id: newRoleName.toLowerCase().replace(/\s+/g, "_"),
      name: newRoleName,
      description: newRoleDescription,
      permissions: selectedPermissions,
      memberCount: 0,
      isSystem: false,
    };

    setRoles([...roles, newRole]);
    setNewRoleName("");
    setNewRoleDescription("");
    setSelectedPermissions([]);
    setIsRoleDialogOpen(false);
  };

  const handleUpdateRole = () => {
    if (!editingRole) return;

    setRoles(roles.map(r =>
      r.id === editingRole.id
        ? { ...r, permissions: selectedPermissions }
        : r
    ));
    setEditingRole(null);
    setSelectedPermissions([]);
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const formatLastActive = (date?: string) => {
    if (!date) return "Never";
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getStatusBadge = (status: TeamMember["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-800">Active</Badge>;
      case "invited":
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-800">Invited</Badge>;
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">Inactive</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your business settings, team, and permissions
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="business" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Business</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Staff</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Roles</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
        </TabsList>

        {/* Business Settings Tab */}
        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>
                Update your business details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessEmail">Business Email</Label>
                  <Input
                    id="businessEmail"
                    type="email"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessPhone">Phone Number</Label>
                  <Input
                    id="businessPhone"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Default Currency</Label>
                  <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SLE">SLE - Sierra Leonean Leone</SelectItem>
                      <SelectItem value="GHS">GHS - Ghanaian Cedi</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Business Address</Label>
                <Input
                  id="address"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Management Tab */}
        <TabsContent value="team" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Staff Members</h2>
              <p className="text-sm text-muted-foreground">
                Manage who has access to your business account
              </p>
            </div>
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Staff
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Staff Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join your business account
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="inviteName">Full Name</Label>
                    <Input
                      id="inviteName"
                      placeholder="John Doe"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inviteEmail">Email Address</Label>
                    <Input
                      id="inviteEmail"
                      type="email"
                      placeholder="john@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inviteRole">Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {inviteRole && (
                      <p className="text-xs text-muted-foreground">
                        {roles.find(r => r.id === inviteRole)?.description}
                      </p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleInviteMember}>
                    Send Invitation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {member.name.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {roles.find(r => r.id === member.role)?.name || member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(member.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatLastActive(member.lastActive)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Staff
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Key className="h-4 w-4 mr-2" />
                              Change Role
                            </DropdownMenuItem>
                            {member.status === "invited" && (
                              <DropdownMenuItem>
                                <Mail className="h-4 w-4 mr-2" />
                                Resend Invitation
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove Staff
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles & Permissions Tab */}
        <TabsContent value="roles" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Roles & Permissions</h2>
              <p className="text-sm text-muted-foreground">
                Define what each role can access and do
              </p>
            </div>
            <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
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
                        placeholder="e.g., Supervisor"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="roleDescription">Description</Label>
                      <Input
                        id="roleDescription"
                        placeholder="Brief description of this role"
                        value={newRoleDescription}
                        onChange={(e) => setNewRoleDescription(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Permissions</Label>
                    {permissionCategories.map((category) => (
                      <div key={category.name} className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground">{category.name}</h4>
                        <div className="grid gap-2 md:grid-cols-2">
                          {category.permissions.map((permission) => (
                            <div
                              key={permission.id}
                              className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                              onClick={() => togglePermission(permission.id)}
                            >
                              <Checkbox
                                checked={selectedPermissions.includes(permission.id)}
                                onCheckedChange={() => togglePermission(permission.id)}
                              />
                              <div className="space-y-0.5">
                                <p className="text-sm font-medium">{permission.name}</p>
                                <p className="text-xs text-muted-foreground">{permission.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateRole}>
                    Create Role
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <Card key={role.id} className="relative">
                {role.isSystem && (
                  <Badge className="absolute top-4 right-4 bg-blue-100 text-blue-700 border-blue-200">
                    System
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    {role.name}
                  </CardTitle>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Members</span>
                    <span className="font-medium">{role.memberCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Permissions</span>
                    <span className="font-medium">
                      {role.permissions.includes("all") ? "All" : role.permissions.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.slice(0, 3).map((perm) => (
                      <Badge key={perm} variant="secondary" className="text-xs">
                        {perm.replace(/_/g, " ")}
                      </Badge>
                    ))}
                    {role.permissions.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{role.permissions.length - 3} more
                      </Badge>
                    )}
                  </div>
                  {!role.isSystem && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setEditingRole(role);
                          setSelectedPermissions(role.permissions);
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Edit Role Dialog */}
          <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Role: {editingRole?.name}</DialogTitle>
                <DialogDescription>
                  Update permissions for this role
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {permissionCategories.map((category) => (
                  <div key={category.name} className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">{category.name}</h4>
                    <div className="grid gap-2 md:grid-cols-2">
                      {category.permissions.map((permission) => (
                        <div
                          key={permission.id}
                          className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                          onClick={() => togglePermission(permission.id)}
                        >
                          <Checkbox
                            checked={selectedPermissions.includes(permission.id)}
                            onCheckedChange={() => togglePermission(permission.id)}
                          />
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">{permission.name}</p>
                            <p className="text-xs text-muted-foreground">{permission.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingRole(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateRole}>
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Email Notifications</h4>
                <div className="space-y-4">
                  {[
                    { id: "payments", label: "Payment received", description: "When a customer makes a payment" },
                    { id: "invoices", label: "Invoice updates", description: "When invoices are viewed or paid" },
                    { id: "lowStock", label: "Low stock alerts", description: "When fuel tank levels are low" },
                    { id: "shifts", label: "Shift reports", description: "Daily shift summary reports" },
                    { id: "team", label: "Staff activity", description: "When staff members are added or removed" },
                  ].map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor={item.id}>{item.label}</Label>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <Switch id={item.id} defaultChecked />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">SMS Notifications</h4>
                <div className="space-y-4">
                  {[
                    { id: "smsPayments", label: "Large payments", description: "Payments above SLE 1,000,000" },
                    { id: "smsAlerts", label: "Critical alerts", description: "Security and urgent notifications" },
                  ].map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor={item.id}>{item.label}</Label>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <Switch id={item.id} />
                    </div>
                  ))}
                </div>
              </div>

              <Button>Save Preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                Your subscription and billing information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div>
                  <h3 className="font-semibold text-lg">Basic Plan</h3>
                  <p className="text-sm text-muted-foreground">All core features included</p>
                </div>
                <Badge className="bg-primary text-white">Current</Badge>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Plan Features</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Unlimited fuel stations
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Staff management & roles
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Invoicing & subscriptions
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Financial reports
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Fleet management
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t">
                <Button variant="outline" className="w-full" asChild>
                  <a href="https://my.peeap.com/upgrade" target="_blank" rel="noopener noreferrer">
                    Upgrade Plan
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>
                Manage your payment methods
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="w-12 h-8 bg-gradient-to-br from-blue-600 to-blue-400 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">VISA</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">**** **** **** 4532</p>
                  <p className="text-sm text-muted-foreground">Expires 12/26</p>
                </div>
                <Badge variant="outline">Default</Badge>
              </div>
              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
