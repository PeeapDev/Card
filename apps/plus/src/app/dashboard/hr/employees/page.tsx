"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  UserPlus,
  Users,
  MoreVertical,
  Mail,
  Phone,
  Shield,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { contactService, type Contact, type TeamMember } from "@/lib/contacts";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function EmployeesPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newMemberRole, setNewMemberRole] = useState<TeamMember["role"]>("employee");
  const [newMemberDepartment, setNewMemberDepartment] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Get business ID from user data
  const getBusinessId = () => {
    const user = localStorage.getItem("user");
    if (user) {
      const userData = JSON.parse(user);
      return userData.id; // Using user ID as business ID for now
    }
    return null;
  };

  // Load team members
  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    setIsLoading(true);
    try {
      const businessId = getBusinessId();
      if (businessId) {
        const members = await contactService.getTeamMembers(businessId);
        setTeamMembers(members);
      }
    } catch (error) {
      console.error("Failed to load team members:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Search contacts when search query changes
  useEffect(() => {
    if (debouncedSearch.length >= 2) {
      searchContacts(debouncedSearch);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearch]);

  const searchContacts = async (query: string) => {
    setIsSearching(true);
    try {
      const results = await contactService.searchContacts(query);
      // Filter out existing team members
      const existingIds = new Set(teamMembers.map((m) => m.id));
      setSearchResults(results.filter((c) => !existingIds.has(c.id)));
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedContact) {
      // If no contact selected but email entered, send invitation
      if (inviteEmail && inviteEmail.includes("@")) {
        await handleSendInvitation();
        return;
      }
      toast.error("Please select a contact or enter an email");
      return;
    }

    setIsAddingMember(true);
    try {
      const businessId = getBusinessId();
      if (!businessId) {
        toast.error("Business not found");
        return;
      }

      const result = await contactService.addTeamMember(
        businessId,
        selectedContact.id,
        newMemberRole,
        newMemberDepartment || undefined
      );

      if (result.success) {
        toast.success(`${selectedContact.fullName} added to team`);
        await loadTeamMembers();
        resetAddDialog();
      } else {
        toast.error(result.error || "Failed to add member");
      }
    } catch (error) {
      toast.error("Failed to add team member");
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!inviteEmail || !inviteEmail.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }

    setIsAddingMember(true);
    try {
      const businessId = getBusinessId();
      if (!businessId) {
        toast.error("Business not found");
        return;
      }

      const result = await contactService.inviteToTeam(
        businessId,
        inviteEmail,
        newMemberRole,
        newMemberDepartment || undefined
      );

      if (result.success) {
        toast.success(`Invitation sent to ${inviteEmail}`);
        await loadTeamMembers();
        resetAddDialog();
      } else {
        toast.error(result.error || "Failed to send invitation");
      }
    } catch (error) {
      toast.error("Failed to send invitation");
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    const businessId = getBusinessId();
    if (!businessId) return;

    const result = await contactService.removeTeamMember(businessId, member.id);
    if (result.success) {
      toast.success(`${member.fullName} removed from team`);
      await loadTeamMembers();
    } else {
      toast.error(result.error || "Failed to remove member");
    }
  };

  const handleUpdateRole = async (member: TeamMember, newRole: TeamMember["role"]) => {
    const businessId = getBusinessId();
    if (!businessId) return;

    const result = await contactService.updateTeamMember(businessId, member.id, { role: newRole });
    if (result.success) {
      toast.success(`${member.fullName}'s role updated`);
      await loadTeamMembers();
    } else {
      toast.error(result.error || "Failed to update role");
    }
  };

  const resetAddDialog = () => {
    setIsAddDialogOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedContact(null);
    setNewMemberRole("employee");
    setNewMemberDepartment("");
    setInviteEmail("");
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "manager":
        return "default";
      case "employee":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "suspended":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff</h1>
          <p className="text-muted-foreground">
            Manage your staff and assign roles
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Staff Member</DialogTitle>
              <DialogDescription>
                Search for existing PeeAP users or invite by email
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Contact Search */}
              <div className="space-y-2">
                <Label>Search PeeAP Users</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Search Results */}
                {isSearching && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {searchResults.map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => {
                          setSelectedContact(contact);
                          setSearchQuery(contact.fullName);
                          setSearchResults([]);
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                      >
                        <Avatar className="h-8 w-8">
                          {contact.avatar && <AvatarImage src={contact.avatar} alt={contact.fullName} />}
                          <AvatarFallback>
                            {contact.fullName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{contact.fullName}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {contact.email}
                          </p>
                          {contact.phone && (
                            <p className="text-xs text-muted-foreground truncate">{contact.phone}</p>
                          )}
                        </div>
                        {contact.isVerified && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Contact */}
                {selectedContact && (
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Avatar className="h-10 w-10">
                      {selectedContact.avatar && <AvatarImage src={selectedContact.avatar} alt={selectedContact.fullName} />}
                      <AvatarFallback>
                        {selectedContact.fullName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{selectedContact.fullName}</p>
                      <p className="text-sm text-muted-foreground">{selectedContact.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedContact(null);
                        setSearchQuery("");
                      }}
                    >
                      Change
                    </Button>
                  </div>
                )}
              </div>

              {/* Or Invite by Email */}
              {!selectedContact && (
                <div className="space-y-2">
                  <div className="relative flex items-center">
                    <div className="flex-grow border-t border-muted" />
                    <span className="px-3 text-sm text-muted-foreground">or invite by email</span>
                    <div className="flex-grow border-t border-muted" />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              )}

              {/* Role Selection */}
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={newMemberRole} onValueChange={(v) => setNewMemberRole(v as TeamMember["role"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin - Full access</SelectItem>
                    <SelectItem value="manager">Manager - Team management</SelectItem>
                    <SelectItem value="employee">Employee - Standard access</SelectItem>
                    <SelectItem value="viewer">Viewer - Read only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label>Department (optional)</Label>
                <Input
                  placeholder="e.g., Sales, Marketing, Finance"
                  value={newMemberDepartment}
                  onChange={(e) => setNewMemberDepartment(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetAddDialog}>
                Cancel
              </Button>
              <Button onClick={handleAddMember} disabled={isAddingMember}>
                {isAddingMember ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : selectedContact ? (
                  "Add Staff"
                ) : (
                  "Send Invitation"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamMembers.filter((m) => m.status === "active").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamMembers.filter((m) => m.status === "pending").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Members</CardTitle>
          <CardDescription>
            Employees with access to your business account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-1">No staff members yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add staff members to collaborate on your business
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add First Member
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {member.fullName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{member.fullName}</p>
                        {getStatusIcon(member.status)}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </span>
                        {member.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {member.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {member.department && (
                      <span className="text-sm text-muted-foreground">
                        {member.department}
                      </span>
                    )}
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      {member.role}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleUpdateRole(member, "admin")}>
                          Make Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateRole(member, "manager")}>
                          Make Manager
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateRole(member, "employee")}>
                          Make Employee
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleRemoveMember(member)}
                        >
                          Remove Staff
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
    </div>
  );
}
