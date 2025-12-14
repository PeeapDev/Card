"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  UserPlus,
  Search,
  Shield,
  Building2,
  Check,
  X,
  Loader2,
  User,
  Mail,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { type Contact } from "@/lib/contacts";
import {
  searchContacts,
  addStaffMember,
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  type StaffRole,
  type PermissionModule,
} from "@/lib/staff/staff.service";
import { createNotification } from "@/lib/notifications/notification.service";

const departments = ["Management", "Operations", "Finance", "Support"];

// Mock stations - in production, fetch from API
const mockStations = [
  { id: "station-1", name: "Main Station" },
  { id: "station-2", name: "Downtown" },
  { id: "station-3", name: "Airport Road" },
];

export default function NewEmployeePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [selectedUser, setSelectedUser] = useState<Contact | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [formData, setFormData] = useState({
    role: "" as StaffRole | "",
    department: "",
    permissions: [] as PermissionModule[],
    stations: [] as string[],
  });

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchContacts(searchQuery);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update permissions when role changes
  useEffect(() => {
    if (formData.role) {
      setFormData(prev => ({
        ...prev,
        permissions: ROLE_PERMISSIONS[formData.role as StaffRole] || [],
      }));
    }
  }, [formData.role]);

  const handleSelectUser = (user: Contact) => {
    setSelectedUser(user);
    setSearchQuery("");
    setShowSearchResults(false);
    setSearchResults([]);
  };

  const handleClearUser = () => {
    setSelectedUser(null);
  };

  const togglePermission = (permission: PermissionModule) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const toggleStation = (stationId: string) => {
    setFormData(prev => ({
      ...prev,
      stations: prev.stations.includes(stationId)
        ? prev.stations.filter(id => id !== stationId)
        : [...prev.stations, stationId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) {
      toast.error("Please select a user to add as staff");
      return;
    }

    if (!formData.role) {
      toast.error("Please select a role");
      return;
    }

    if (formData.permissions.length === 0) {
      toast.error("Please select at least one permission");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get business info from localStorage
      const storedUser = localStorage.getItem("user");
      const businessName = storedUser ? JSON.parse(storedUser).businessName || "Your Business" : "Your Business";
      const businessId = storedUser ? JSON.parse(storedUser).id : "business_1";

      const result = await addStaffMember({
        businessId,
        businessName,
        user: selectedUser,
        role: formData.role as StaffRole,
        permissions: formData.permissions,
        department: formData.department,
        stations: formData.stations.length > 0 ? formData.stations : undefined,
      });

      if (result.success) {
        // Create notification for the added user (they'll see it when they log in)
        createNotification({
          title: "Staff Invitation",
          message: `You've been invited to join ${businessName} as ${ROLES.find(r => r.id === formData.role)?.name}. Set up your PIN to access the system.`,
          type: "info",
          category: "staff",
          href: "/dashboard/staff/setup-pin",
          metadata: { staffId: result.staffId, businessName },
        });

        toast.success(`${selectedUser.fullName} has been invited as staff. They will receive a notification to set up their PIN.`);
        router.push("/dashboard/hr/employees");
      } else {
        toast.error(result.error || "Failed to add staff member");
      }
    } catch (error) {
      toast.error("An error occurred while adding staff");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/hr/employees">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Staff Member</h1>
          <p className="text-muted-foreground">Search for a PeeAP user and add them to your team</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Search and Select User */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Select User
            </CardTitle>
            <CardDescription>Search for an existing PeeAP user by name, email, or phone</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedUser ? (
              <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-white">
                    {selectedUser.fullName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{selectedUser.fullName}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {selectedUser.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {selectedUser.email}
                      </span>
                    )}
                    {selectedUser.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedUser.phone}
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant="secondary" className="text-green-600">
                  <Check className="h-3 w-3 mr-1" />
                  Selected
                </Badge>
                <Button type="button" variant="ghost" size="icon" onClick={handleClearUser}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}

                {/* Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                        onClick={() => handleSelectUser(user)}
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {user.fullName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{user.fullName}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        {user.isVerified && (
                          <Badge variant="outline" className="text-xs shrink-0">Verified</Badge>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {showSearchResults && searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                  <div className="absolute z-10 w-full mt-1 bg-card border rounded-lg shadow-lg p-4 text-center text-muted-foreground">
                    No users found matching "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Role & Department */}
        {selectedUser && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Role & Department
              </CardTitle>
              <CardDescription>Assign a role and department</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value as StaffRole })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex flex-col">
                            <span>{role.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.role && (
                    <p className="text-xs text-muted-foreground">
                      {ROLES.find(r => r.id === formData.role)?.description}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Station Access (for manager/attendant roles) */}
              {(formData.role === "manager" || formData.role === "attendant") && (
                <div className="space-y-3 pt-2">
                  <Label>Station Access</Label>
                  <p className="text-sm text-muted-foreground">
                    Select which stations this staff can access
                  </p>
                  <div className="grid gap-2 md:grid-cols-3">
                    {mockStations.map((station) => (
                      <div
                        key={station.id}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleStation(station.id)}
                      >
                        <Checkbox
                          checked={formData.stations.includes(station.id)}
                          onCheckedChange={() => toggleStation(station.id)}
                        />
                        <span className="text-sm">{station.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Permissions */}
        {selectedUser && formData.role && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Permissions
              </CardTitle>
              <CardDescription>
                Customize what this staff member can access. Default permissions are based on their role.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {PERMISSIONS.map((permission) => {
                  const isChecked = formData.permissions.includes(permission.module);
                  const isDefault = ROLE_PERMISSIONS[formData.role as StaffRole]?.includes(permission.module);

                  return (
                    <div
                      key={permission.module}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isChecked ? "bg-primary/5 border-primary/30" : "hover:bg-muted/50"
                      }`}
                      onClick={() => togglePermission(permission.module)}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => togglePermission(permission.module)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{permission.label}</span>
                          {isDefault && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{permission.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        {selectedUser && formData.role && (
          <div className="flex gap-3">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              <UserPlus className="h-4 w-4 mr-2" />
              {isSubmitting ? "Adding Staff..." : "Add Staff Member"}
            </Button>
            <Link href="/dashboard/hr/employees">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
          </div>
        )}
      </form>

      {/* Info Box */}
      {!selectedUser && (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <h3 className="font-medium text-foreground mb-1">Search for a user to get started</h3>
              <p className="text-sm max-w-md mx-auto">
                Search for an existing PeeAP user by their name, email, or phone number.
                Once added, they'll receive a notification to set up their PIN for system access.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
