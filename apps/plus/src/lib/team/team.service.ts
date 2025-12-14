/**
 * Team Service - CRUD operations for team members, roles, and permissions
 */

import { createClient } from '@supabase/supabase-js';
import type {
  TeamMember,
  Role,
  TeamInvite,
  ActivityLog,
  TeamDashboardStats,
  MemberStatus,
  RoleType,
  InviteMemberDto,
  UpdateMemberDto,
  CreateRoleDto,
  UpdateRoleDto,
  MemberFilters,
  Permission,
} from './types';
import { AVAILABLE_PERMISSIONS, ROLE_PERMISSIONS } from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// =============================================
// TEAM MEMBERS
// =============================================

export async function getMembers(businessId: string, filters?: MemberFilters): Promise<TeamMember[]> {
  let query = supabase
    .from('team_members')
    .select(`
      *,
      role:roles(*)
    `)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.role_type) {
    query = query.eq('role_type', filters.role_type);
  }
  if (filters?.department) {
    query = query.eq('department', filters.department);
  }
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
  }

  const { data, error } = await query.limit(100);
  if (error) throw error;

  // Resolve permissions for each member
  return (data || []).map(member => ({
    ...member,
    permissions: getPermissionsForRole(member.role_type, member.custom_permissions),
  }));
}

export async function getMember(memberId: string): Promise<TeamMember | null> {
  const { data, error } = await supabase
    .from('team_members')
    .select(`
      *,
      role:roles(*)
    `)
    .eq('id', memberId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return {
    ...data,
    permissions: getPermissionsForRole(data.role_type, data.custom_permissions),
  };
}

function generateInviteToken(): string {
  return Array.from({ length: 32 }, () =>
    Math.random().toString(36).charAt(2)
  ).join('');
}

export async function inviteMember(businessId: string, invitedBy: string, dto: InviteMemberDto): Promise<TeamInvite> {
  // Check if member already exists
  const { data: existing } = await supabase
    .from('team_members')
    .select('id')
    .eq('business_id', businessId)
    .eq('email', dto.email.toLowerCase())
    .single();

  if (existing) {
    throw new Error('A team member with this email already exists');
  }

  // Check for pending invite
  const { data: pendingInvite } = await supabase
    .from('team_invites')
    .select('id')
    .eq('business_id', businessId)
    .eq('email', dto.email.toLowerCase())
    .eq('status', 'pending')
    .single();

  if (pendingInvite) {
    throw new Error('An invitation has already been sent to this email');
  }

  const token = generateInviteToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

  // Create invite
  const { data: invite, error: inviteError } = await supabase
    .from('team_invites')
    .insert({
      business_id: businessId,
      email: dto.email.toLowerCase(),
      name: dto.name,
      role_type: dto.role_type,
      role_id: dto.role_id,
      status: 'pending',
      invited_by: invitedBy,
      invited_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      token,
    })
    .select()
    .single();

  if (inviteError) throw inviteError;

  // Create pending member record
  const { error: memberError } = await supabase
    .from('team_members')
    .insert({
      business_id: businessId,
      email: dto.email.toLowerCase(),
      name: dto.name || dto.email.split('@')[0],
      role_type: dto.role_type,
      role_id: dto.role_id,
      role_name: getRoleName(dto.role_type),
      status: 'pending',
      invited_at: new Date().toISOString(),
      department: dto.department,
      job_title: dto.job_title,
      custom_permissions: dto.custom_permissions,
      permissions: [],
    });

  if (memberError) throw memberError;

  // Log activity
  await logActivity(businessId, invitedBy, 'invite_member', 'team_member', invite.id, {
    email: dto.email,
    role: dto.role_type,
  });

  return invite;
}

export async function updateMember(memberId: string, dto: UpdateMemberDto): Promise<TeamMember> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (dto.name !== undefined) updates.name = dto.name;
  if (dto.phone !== undefined) updates.phone = dto.phone;
  if (dto.role_type !== undefined) {
    updates.role_type = dto.role_type;
    updates.role_name = getRoleName(dto.role_type);
  }
  if (dto.role_id !== undefined) updates.role_id = dto.role_id;
  if (dto.department !== undefined) updates.department = dto.department;
  if (dto.job_title !== undefined) updates.job_title = dto.job_title;
  if (dto.custom_permissions !== undefined) updates.custom_permissions = dto.custom_permissions;
  if (dto.notes !== undefined) updates.notes = dto.notes;

  const { error } = await supabase
    .from('team_members')
    .update(updates)
    .eq('id', memberId);

  if (error) throw error;
  return getMember(memberId) as Promise<TeamMember>;
}

export async function suspendMember(memberId: string): Promise<TeamMember> {
  const { error } = await supabase
    .from('team_members')
    .update({
      status: 'suspended',
      suspended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId);

  if (error) throw error;
  return getMember(memberId) as Promise<TeamMember>;
}

export async function activateMember(memberId: string): Promise<TeamMember> {
  const { error } = await supabase
    .from('team_members')
    .update({
      status: 'active',
      suspended_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId);

  if (error) throw error;
  return getMember(memberId) as Promise<TeamMember>;
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('team_members')
    .update({
      status: 'deactivated',
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId);

  if (error) throw error;
}

export async function deleteMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', memberId);

  if (error) throw error;
}

// =============================================
// INVITES
// =============================================

export async function getInvites(businessId: string): Promise<TeamInvite[]> {
  const { data, error } = await supabase
    .from('team_invites')
    .select('*')
    .eq('business_id', businessId)
    .eq('status', 'pending')
    .order('invited_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function resendInvite(inviteId: string): Promise<TeamInvite> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from('team_invites')
    .update({
      expires_at: expiresAt.toISOString(),
      token: generateInviteToken(),
    })
    .eq('id', inviteId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function revokeInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from('team_invites')
    .update({ status: 'revoked' })
    .eq('id', inviteId);

  if (error) throw error;

  // Also remove the pending member record
  const { data: invite } = await supabase
    .from('team_invites')
    .select('email, business_id')
    .eq('id', inviteId)
    .single();

  if (invite) {
    await supabase
      .from('team_members')
      .delete()
      .eq('business_id', invite.business_id)
      .eq('email', invite.email)
      .eq('status', 'pending');
  }
}

// =============================================
// ROLES
// =============================================

export async function getRoles(businessId: string): Promise<Role[]> {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('business_id', businessId)
    .order('is_system', { ascending: false })
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getRole(roleId: string): Promise<Role | null> {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('id', roleId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createRole(businessId: string, dto: CreateRoleDto): Promise<Role> {
  const { data, error } = await supabase
    .from('roles')
    .insert({
      business_id: businessId,
      name: dto.name,
      description: dto.description,
      role_type: 'custom',
      permissions: dto.permissions,
      is_system: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateRole(roleId: string, dto: UpdateRoleDto): Promise<Role> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (dto.name !== undefined) updates.name = dto.name;
  if (dto.description !== undefined) updates.description = dto.description;
  if (dto.permissions !== undefined) updates.permissions = dto.permissions;

  const { data, error } = await supabase
    .from('roles')
    .update(updates)
    .eq('id', roleId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRole(roleId: string): Promise<void> {
  // Check if role is in use
  const { data: members } = await supabase
    .from('team_members')
    .select('id')
    .eq('role_id', roleId)
    .limit(1);

  if (members && members.length > 0) {
    throw new Error('Cannot delete role that is assigned to members');
  }

  const { error } = await supabase
    .from('roles')
    .delete()
    .eq('id', roleId)
    .eq('is_system', false);

  if (error) throw error;
}

// =============================================
// ACTIVITY LOG
// =============================================

export async function logActivity(
  businessId: string,
  memberId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  // Get member name
  const { data: member } = await supabase
    .from('team_members')
    .select('name')
    .eq('id', memberId)
    .single();

  await supabase
    .from('activity_logs')
    .insert({
      business_id: businessId,
      member_id: memberId,
      member_name: member?.name || 'Unknown',
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
    });
}

export async function getActivityLogs(businessId: string, limit: number = 50): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// =============================================
// DASHBOARD
// =============================================

export async function getTeamDashboard(businessId: string): Promise<TeamDashboardStats> {
  const { data: members } = await supabase
    .from('team_members')
    .select('*')
    .eq('business_id', businessId);

  const allMembers = members || [];

  let activeCount = 0;
  let pendingCount = 0;
  let suspendedCount = 0;
  const byRole: Record<string, number> = {};
  const byDepartment: Record<string, number> = {};

  allMembers.forEach(member => {
    if (member.status === 'active') activeCount++;
    else if (member.status === 'pending') pendingCount++;
    else if (member.status === 'suspended') suspendedCount++;

    const roleName = member.role_name || 'Unassigned';
    byRole[roleName] = (byRole[roleName] || 0) + 1;

    if (member.department) {
      byDepartment[member.department] = (byDepartment[member.department] || 0) + 1;
    }
  });

  const { data: roles } = await supabase
    .from('roles')
    .select('id')
    .eq('business_id', businessId);

  const recentActivity = await getActivityLogs(businessId, 10);

  return {
    total_members: allMembers.length,
    active_members: activeCount,
    pending_invites: pendingCount,
    suspended_members: suspendedCount,
    roles_count: (roles || []).length,
    recent_activity: recentActivity,
    members_by_role: Object.entries(byRole)
      .map(([role_name, count]) => ({ role_name, count }))
      .sort((a, b) => b.count - a.count),
    members_by_department: Object.entries(byDepartment)
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count),
  };
}

// =============================================
// HELPERS
// =============================================

function getRoleName(roleType: RoleType): string {
  const names: Record<RoleType, string> = {
    owner: 'Owner',
    admin: 'Administrator',
    manager: 'Manager',
    accountant: 'Accountant',
    staff: 'Staff',
    viewer: 'Viewer',
    custom: 'Custom',
  };
  return names[roleType] || 'Unknown';
}

function getPermissionsForRole(roleType: RoleType, customPermissions?: string[]): Permission[] {
  const permissionIds = roleType === 'custom'
    ? (customPermissions || [])
    : ROLE_PERMISSIONS[roleType] || [];

  return AVAILABLE_PERMISSIONS.filter(p => permissionIds.includes(p.id));
}

function getBusinessId(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  const businessId = localStorage.getItem('plusBusinessId');
  if (!businessId) {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        // Use businessId if available, otherwise use user ID as business ID
        const id = user.businessId || user.id;
        if (id) {
          localStorage.setItem('plusBusinessId', id);
          return id;
        }
      } catch {}
    }
    console.warn('No business ID found in localStorage. Team operations may not work correctly.');
    return '';
  }
  return businessId;
}

function getCurrentMemberId(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  const memberId = localStorage.getItem('plusMemberId') || localStorage.getItem('plusStaffId');
  return memberId || 'unknown';
}

// Wrapper to handle empty businessId gracefully
async function withBusinessId<T>(fn: (businessId: string) => Promise<T>, defaultValue: T): Promise<T> {
  const businessId = getBusinessId();
  if (!businessId) {
    console.warn('No business ID available - returning empty result');
    return defaultValue;
  }
  return fn(businessId);
}

// =============================================
// FACADE EXPORT
// =============================================

export const teamService = {
  // Members
  getMembers: (filters?: MemberFilters) => withBusinessId((bid) => getMembers(bid, filters), []),
  getMember,
  inviteMember: (dto: InviteMemberDto) => {
    const businessId = getBusinessId();
    if (!businessId) throw new Error('Business ID required to invite member');
    return inviteMember(businessId, getCurrentMemberId(), dto);
  },
  updateMember,
  suspendMember,
  activateMember,
  removeMember,
  deleteMember,

  // Invites
  getInvites: () => withBusinessId(getInvites, []),
  resendInvite,
  revokeInvite,

  // Roles
  getRoles: () => withBusinessId(getRoles, []),
  getRole,
  createRole: (dto: CreateRoleDto) => {
    const businessId = getBusinessId();
    if (!businessId) throw new Error('Business ID required to create role');
    return createRole(businessId, dto);
  },
  updateRole,
  deleteRole,

  // Activity
  getActivityLogs: (limit?: number) => withBusinessId((bid) => getActivityLogs(bid, limit), []),

  // Dashboard
  getDashboard: () => withBusinessId(getTeamDashboard, {
    total_members: 0,
    active_members: 0,
    pending_invites: 0,
    suspended_members: 0,
    roles_count: 0,
    recent_activity: [],
    members_by_role: [],
    members_by_department: [],
  }),

  // Utilities
  getAvailablePermissions: () => AVAILABLE_PERMISSIONS,
  getRolePermissions: (roleType: RoleType) => ROLE_PERMISSIONS[roleType],
};
