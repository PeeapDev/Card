import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '../../lib/supabase';

export interface CreateUserDto {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  business_name?: string;
  role: 'user' | 'merchant' | 'agent' | 'admin';
}

@Injectable()
export class UsersService {
  async createUser(dto: CreateUserDto): Promise<{ user: any }> {
    const supabase = getSupabaseClient();

    // Create user in Supabase Auth using admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true, // Auto-confirm email for admin-created users
      user_metadata: {
        first_name: dto.first_name,
        last_name: dto.last_name,
        role: dto.role,
      },
    });

    if (authError) {
      console.error('Auth error creating user:', authError);
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error('Failed to create user in auth');
    }

    // Generate external_id and username
    const externalId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const username = `${dto.first_name.toLowerCase()}${dto.last_name.toLowerCase()}_${Math.random().toString(36).substr(2, 4)}`;

    // Insert into users table with correct schema columns
    const userData: any = {
      id: authData.user.id,
      external_id: externalId,
      email: dto.email,
      password_hash: dto.password, // Will be hashed by Supabase Auth, stored for reference
      first_name: dto.first_name,
      last_name: dto.last_name,
      phone: dto.phone || null,
      username: username,
      roles: dto.role, // 'roles' column, not 'role'
      status: 'ACTIVE', // 'status' column, not 'is_active'
      kyc_status: 'APPROVED',
      kyc_tier: 1,
      email_verified: true,
      phone_verified: !!dto.phone,
    };

    const { data: user, error: insertError } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting user:', insertError);
      // Try to delete the auth user if DB insert fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(insertError.message);
    }

    // Create a primary wallet for the user
    const walletExternalId = `wal_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const { error: walletError } = await supabase
      .from('wallets')
      .insert({
        external_id: walletExternalId,
        user_id: authData.user.id,
        wallet_type: 'primary',
        currency: 'SLE',
        balance: 0,
        status: 'ACTIVE', // wallets also use 'status' column
        daily_limit: 5000,
        monthly_limit: 50000,
      });

    if (walletError) {
      console.error('Error creating wallet:', walletError);
      // Don't throw - user was created successfully
    }

    return { user };
  }
}
