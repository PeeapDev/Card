import { supabase } from './supabase';
import { authService } from './auth';

// API base URL - use environment variable or default
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.peeap.com';

export interface Contact {
  id: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  avatar?: string;
  avatarUrl?: string;
  isVerified?: boolean;
}

export interface TeamMember extends Contact {
  role: 'admin' | 'manager' | 'employee' | 'viewer';
  department?: string;
  addedAt: string;
  status: 'active' | 'pending' | 'suspended';
}

export interface BusinessTeam {
  id: string;
  businessId: string;
  members: TeamMember[];
}

export const contactService = {
  /**
   * Get authorization header for API requests
   * Tries access token first, then SSO session token
   */
  getAuthHeader(): string | null {
    if (typeof window === 'undefined') return null;

    // Try access token first
    const accessToken = authService.getAccessToken();
    if (accessToken) {
      return `Bearer ${accessToken}`;
    }

    // Try SSO session token
    const sessionCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('plus_session='));

    if (sessionCookie) {
      const sessionToken = sessionCookie.split('=')[1];
      if (sessionToken) {
        return `SSO ${sessionToken}`;
      }
    }

    return null;
  },

  /**
   * Search for contacts across all PeeAP users
   * Uses the shared API endpoint for cross-platform user search
   * Similar to how my.peeap.com searches for users when sending money
   */
  async searchContacts(query: string, limit: number = 20): Promise<Contact[]> {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      const authHeader = this.getAuthHeader();
      if (!authHeader) {
        console.error('No auth token available for search');
        return [];
      }

      const response = await fetch(`${API_BASE_URL}/shared/users/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('User search failed:', response.status);
        return [];
      }

      const data = await response.json();

      if (!data.users || !Array.isArray(data.users)) {
        return [];
      }

      // Map API response to Contact interface
      return data.users.slice(0, limit).map((user: any) => ({
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        avatar: user.avatarUrl,
        avatarUrl: user.avatarUrl,
        isVerified: true, // Users from API are verified
      }));
    } catch (error) {
      console.error('Contact search error:', error);
      return [];
    }
  },

  /**
   * Get a contact by their ID
   * Uses the search API to find the user
   */
  async getContactById(userId: string): Promise<Contact | null> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, phone, first_name, last_name, email_verified, profile_picture')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.first_name,
        lastName: user.last_name,
        fullName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
        avatar: user.profile_picture,
        avatarUrl: user.profile_picture,
        isVerified: user.email_verified,
      };
    } catch {
      return null;
    }
  },

  /**
   * Get team members for a business
   */
  async getTeamMembers(businessId: string): Promise<TeamMember[]> {
    try {
      // First try to get from team_members table if it exists
      const { data: members, error } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          role,
          department,
          status,
          created_at,
          users:user_id (
            id,
            email,
            phone,
            first_name,
            last_name,
            email_verified,
            profile_picture
          )
        `)
        .eq('business_id', businessId);

      if (error) {
        // Table might not exist yet, return empty
        console.log('Team members table not found, returning empty');
        return [];
      }

      if (!members) return [];

      return members.map((member: any) => ({
        id: member.users?.id || member.user_id,
        email: member.users?.email || '',
        phone: member.users?.phone,
        firstName: member.users?.first_name,
        lastName: member.users?.last_name,
        fullName: `${member.users?.first_name || ''} ${member.users?.last_name || ''}`.trim() || member.users?.email || 'Unknown',
        avatar: member.users?.profile_picture,
        avatarUrl: member.users?.profile_picture,
        isVerified: member.users?.email_verified,
        role: member.role,
        department: member.department,
        addedAt: member.created_at,
        status: member.status,
      }));
    } catch (error) {
      console.error('Get team members error:', error);
      return [];
    }
  },

  /**
   * Add a team member to a business
   */
  async addTeamMember(
    businessId: string,
    userId: string,
    role: TeamMember['role'] = 'employee',
    department?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if user exists
      const contact = await this.getContactById(userId);
      if (!contact) {
        return { success: false, error: 'User not found' };
      }

      // Check if already a team member
      const { data: existing } = await supabase
        .from('team_members')
        .select('id')
        .eq('business_id', businessId)
        .eq('user_id', userId)
        .single();

      if (existing) {
        return { success: false, error: 'User is already a team member' };
      }

      // Add team member
      const { error } = await supabase
        .from('team_members')
        .insert({
          business_id: businessId,
          user_id: userId,
          role,
          department,
          status: 'pending',
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to add team member' };
    }
  },

  /**
   * Remove a team member from a business
   */
  async removeTeamMember(
    businessId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('business_id', businessId)
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to remove team member' };
    }
  },

  /**
   * Update a team member's role or department
   */
  async updateTeamMember(
    businessId: string,
    userId: string,
    updates: { role?: TeamMember['role']; department?: string; status?: TeamMember['status'] }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('team_members')
        .update(updates)
        .eq('business_id', businessId)
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to update team member' };
    }
  },

  /**
   * Invite a new user to the team by email
   * Creates an invitation that the user can accept
   */
  async inviteToTeam(
    businessId: string,
    email: string,
    role: TeamMember['role'] = 'employee',
    department?: string
  ): Promise<{ success: boolean; invitationId?: string; error?: string }> {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (existingUser) {
        // User exists, add them directly as pending
        return await this.addTeamMember(businessId, existingUser.id, role, department);
      }

      // Create invitation
      const invitationId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { error } = await supabase
        .from('team_invitations')
        .insert({
          id: invitationId,
          business_id: businessId,
          email: email.toLowerCase(),
          role,
          department,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        });

      if (error) {
        // Table might not exist, log and return error
        console.error('Team invitations error:', error);
        return { success: false, error: 'Could not create invitation' };
      }

      return { success: true, invitationId };
    } catch (error) {
      return { success: false, error: 'Failed to send invitation' };
    }
  },
};
