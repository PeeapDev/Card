/**
 * Parent-Student Service
 *
 * Manages parent-student relationships for school fee payments
 * - Link children by index number
 * - View linked children
 * - Pay school fees from parent's wallet
 */

import { supabase, supabaseAdmin } from '@/lib/supabase';

// Types
export interface LinkedChild {
  id: string;
  studentAccountId: string;
  relationship: string;
  isPrimary: boolean;
  canPayFees: boolean;
  canTopupWallet: boolean;
  canViewTransactions: boolean;
  createdAt: string;
  student: {
    id: string;
    nsi: string;  // National Student Identifier
    indexNumber?: string;  // Kept for backward compatibility
    firstName: string;
    lastName: string;
    fullName: string;
    schoolId: string;
    schoolName: string;
    className: string;
    sectionName?: string;
    gender?: string;
    dateOfBirth?: string;
    profilePhotoUrl?: string;
    username: string;
    walletId?: string;
    walletBalance?: number;
  };
}

export interface LinkChildRequest {
  nsi: string;  // National Student Identifier
  relationship?: 'parent' | 'guardian' | 'sponsor' | 'other';
}

export interface SchoolFeePaymentRequest {
  parentWalletId: string;
  studentNsi: string;  // National Student Identifier
  feeId: string;
  amount: number;
  schoolId: string;
}

// API Base for school API
const SCHOOL_API_BASE = 'https://api.peeap.com/school/peeap';

export const parentStudentService = {
  /**
   * Get all children linked to the current user
   */
  async getLinkedChildren(userId: string): Promise<LinkedChild[]> {
    const { data, error } = await supabaseAdmin
      .from('parent_student_links')
      .select(`
        id,
        relationship,
        is_primary,
        can_pay_fees,
        can_topup_wallet,
        can_view_transactions,
        created_at,
        student_account_id,
        student_accounts (
          id,
          nsi,
          index_number,
          first_name,
          last_name,
          full_name,
          school_id,
          school_name,
          class_name,
          section_name,
          gender,
          date_of_birth,
          profile_photo_url,
          username,
          wallet_id
        )
      `)
      .eq('parent_user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching linked children:', error);
      // Return empty array if table doesn't exist yet
      if (error.code === '42P01') return [];
      throw new Error(error.message);
    }

    // Map to our interface and filter out entries without student data
    return (data || [])
      .filter((link: any) => link.student_accounts)
      .map((link: any): LinkedChild => ({
        id: link.id,
        studentAccountId: link.student_account_id,
        relationship: link.relationship || 'parent',
        isPrimary: link.is_primary || false,
        canPayFees: link.can_pay_fees !== false,
        canTopupWallet: link.can_topup_wallet !== false,
        canViewTransactions: link.can_view_transactions !== false,
        createdAt: link.created_at,
        student: {
          id: link.student_accounts.id,
          nsi: link.student_accounts.nsi || link.student_accounts.index_number,
          indexNumber: link.student_accounts.index_number,
          firstName: link.student_accounts.first_name,
          lastName: link.student_accounts.last_name,
          fullName: link.student_accounts.full_name,
          schoolId: link.student_accounts.school_id,
          schoolName: link.student_accounts.school_name,
          className: link.student_accounts.class_name,
          sectionName: link.student_accounts.section_name,
          gender: link.student_accounts.gender,
          dateOfBirth: link.student_accounts.date_of_birth,
          profilePhotoUrl: link.student_accounts.profile_photo_url,
          username: link.student_accounts.username,
          walletId: link.student_accounts.wallet_id,
        },
      }));
  },

  /**
   * Link a child to the current user by NSI (National Student Identifier)
   * First verifies the student exists in the school system
   */
  async linkChild(userId: string, request: LinkChildRequest): Promise<LinkedChild> {
    const { nsi, relationship = 'parent' } = request;

    // Step 1: Verify student exists in school system
    const verifyRes = await fetch(`${SCHOOL_API_BASE}/verify-student`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nsi, index_number: nsi }),  // Send both for compatibility
    });

    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || !verifyData.success || !verifyData.found) {
      throw new Error(verifyData.message || 'Student not found. Please check the index number.');
    }

    const studentData = verifyData.data;

    // Step 2: Check if student account exists in Peeap, create if not
    let { data: studentAccount, error: findError } = await supabaseAdmin
      .from('student_accounts')
      .select('*')
      .or(`nsi.eq.${nsi},index_number.eq.${nsi}`)
      .maybeSingle();

    if (findError && findError.code !== 'PGRST116') {
      // If table doesn't exist, we'll create the student inline
      if (findError.code === '42P01') {
        console.log('student_accounts table not found, creating student inline');
      } else {
        throw new Error(`Error checking student: ${findError.message}`);
      }
    }

    if (!studentAccount) {
      // Create student account in Peeap
      const username = `${studentData.first_name.toLowerCase()}.${studentData.last_name.toLowerCase()}`.replace(/[^a-z.]/g, '');

      // Create a wallet for the student
      const { data: wallet, error: walletError } = await supabaseAdmin
        .from('wallets')
        .insert({
          currency: 'SLE',
          balance: 0,
          status: 'ACTIVE',
          wallet_type: 'student',
          name: `${studentData.first_name}'s Wallet`,
          external_id: `STU-${studentData.school_id}-${studentData.student_id}`,
        })
        .select()
        .single();

      if (walletError) {
        console.error('Error creating student wallet:', walletError);
        // Continue without wallet
      }

      // Create student account
      const { data: newStudent, error: createError } = await supabaseAdmin
        .from('student_accounts')
        .insert({
          school_id: studentData.school_id.toString(),
          school_name: studentData.school_name,
          student_id_in_school: studentData.student_id.toString(),
          nsi: nsi,  // Use nsi as primary
          index_number: nsi,  // Also set index_number for backward compatibility
          admission_number: studentData.admission_no?.toString(),
          first_name: studentData.first_name,
          last_name: studentData.last_name,
          class_name: studentData.class_name,
          section_name: studentData.section_name,
          gender: studentData.gender,
          date_of_birth: studentData.date_of_birth,
          profile_photo_url: studentData.profile_photo_url,
          username: username,
          wallet_id: wallet?.id,
          status: 'active',
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating student account:', createError);
        throw new Error(`Failed to create student account: ${createError.message}`);
      }

      studentAccount = newStudent;

      // Register username
      if (studentAccount) {
        await supabaseAdmin
          .from('username_registry')
          .insert({
            username: username,
            student_account_id: studentAccount.id,
            wallet_id: wallet?.id,
            is_active: true,
          })
          .select()
          .maybeSingle();
      }
    }

    // Step 3: Check if link already exists
    const { data: existingLink, error: linkCheckError } = await supabaseAdmin
      .from('parent_student_links')
      .select('id')
      .eq('parent_user_id', userId)
      .eq('student_account_id', studentAccount.id)
      .maybeSingle();

    if (existingLink) {
      throw new Error('This child is already linked to your account.');
    }

    // Step 4: Create the parent-student link
    const { data: link, error: linkError } = await supabaseAdmin
      .from('parent_student_links')
      .insert({
        parent_user_id: userId,
        student_account_id: studentAccount.id,
        relationship: relationship,
        is_primary: false,
        can_view_fees: true,
        can_pay_fees: true,
        can_topup_wallet: true,
        can_view_transactions: true,
        is_active: true,
      })
      .select()
      .single();

    if (linkError) {
      console.error('Error creating parent-student link:', linkError);
      throw new Error(`Failed to link child: ${linkError.message}`);
    }

    // Return the linked child data
    return {
      id: link.id,
      studentAccountId: studentAccount.id,
      relationship: relationship,
      isPrimary: false,
      canPayFees: true,
      canTopupWallet: true,
      canViewTransactions: true,
      createdAt: link.created_at,
      student: {
        id: studentAccount.id,
        nsi: studentAccount.nsi || studentAccount.index_number,
        indexNumber: studentAccount.index_number,
        firstName: studentAccount.first_name,
        lastName: studentAccount.last_name,
        fullName: `${studentAccount.first_name} ${studentAccount.last_name}`,
        schoolId: studentAccount.school_id,
        schoolName: studentAccount.school_name,
        className: studentAccount.class_name,
        sectionName: studentAccount.section_name,
        gender: studentAccount.gender,
        dateOfBirth: studentAccount.date_of_birth,
        profilePhotoUrl: studentAccount.profile_photo_url,
        username: studentAccount.username,
        walletId: studentAccount.wallet_id,
      },
    };
  },

  /**
   * Unlink a child from the current user
   */
  async unlinkChild(userId: string, linkId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('parent_student_links')
      .update({ is_active: false })
      .eq('id', linkId)
      .eq('parent_user_id', userId);

    if (error) {
      console.error('Error unlinking child:', error);
      throw new Error(error.message);
    }
  },

  /**
   * Pay school fee from parent's wallet
   * This deducts from parent's wallet, credits the school wallet, and notifies the school system
   */
  async paySchoolFee(request: SchoolFeePaymentRequest): Promise<{
    success: boolean;
    transactionId: string;
    message: string;
  }> {
    const { parentWalletId, studentNsi, feeId, amount, schoolId } = request;

    // Step 1: Check parent wallet balance
    const { data: parentWallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('id, balance, status, user_id')
      .eq('id', parentWalletId)
      .single();

    if (walletError || !parentWallet) {
      throw new Error('Parent wallet not found');
    }

    if (parentWallet.status !== 'ACTIVE') {
      throw new Error('Wallet is not active');
    }

    const balance = parseFloat(parentWallet.balance) || 0;
    if (balance < amount) {
      throw new Error(`Insufficient balance. Available: ${balance.toFixed(2)} SLE`);
    }

    // Generate transaction ID
    const transactionId = `FEE-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Step 2: Get or create school wallet
    let schoolWallet = null;
    const { data: schoolConnection } = await supabaseAdmin
      .from('school_connections')
      .select('id, wallet_id, school_name, peeap_school_id')
      .eq('school_id', schoolId)
      .maybeSingle();

    if (schoolConnection) {
      if (schoolConnection.wallet_id) {
        // School has a wallet
        const { data: wallet } = await supabaseAdmin
          .from('wallets')
          .select('id, balance')
          .eq('id', schoolConnection.wallet_id)
          .single();
        schoolWallet = wallet;
      } else {
        // Create wallet for school
        const { data: newWallet, error: createError } = await supabaseAdmin
          .from('wallets')
          .insert({
            currency: 'SLE',
            balance: 0,
            status: 'ACTIVE',
            wallet_type: 'school',
            name: `${schoolConnection.school_name} Wallet`,
            external_id: `SCH-${schoolConnection.peeap_school_id}`,
          })
          .select()
          .single();

        if (!createError && newWallet) {
          // Link wallet to school
          await supabaseAdmin
            .from('school_connections')
            .update({ wallet_id: newWallet.id })
            .eq('id', schoolConnection.id);
          schoolWallet = newWallet;
        }
      }
    }

    // Step 3: Notify school system about payment
    const payRes = await fetch(`${SCHOOL_API_BASE}/pay-fee`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentNsi,
        fee_id: feeId,
        amount: amount,
        transaction_id: transactionId,
        payment_method: 'peeap_wallet',
        school_id: schoolId,
      }),
    });

    const payResult = await payRes.json();
    const schoolNotified = payRes.ok && payResult.success;

    // Step 4: Deduct from parent's wallet
    const newBalance = balance - amount;
    const { error: deductError } = await supabaseAdmin
      .from('wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parentWalletId);

    if (deductError) {
      throw new Error('Failed to process payment. Please try again.');
    }

    // Step 5: Credit school wallet (if exists)
    if (schoolWallet) {
      const schoolBalance = parseFloat(schoolWallet.balance) || 0;
      await supabaseAdmin
        .from('wallets')
        .update({
          balance: schoolBalance + amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', schoolWallet.id);

      // Create school credit transaction
      await supabaseAdmin
        .from('transactions')
        .insert({
          wallet_id: schoolWallet.id,
          type: 'FEE_RECEIVED',
          amount: amount,
          currency: 'SLE',
          status: 'COMPLETED',
          description: `Fee received from student ${studentNsi}`,
          reference: transactionId,
        });
    }

    // Step 6: Create parent debit transaction record
    await supabaseAdmin
      .from('transactions')
      .insert({
        wallet_id: parentWalletId,
        type: 'SCHOOL_FEE',
        amount: -amount,
        currency: 'SLE',
        status: 'COMPLETED',
        description: `School fee payment for ${studentNsi}`,
        reference: transactionId,
        merchant_name: 'School Fee',
        metadata: {
          student_index: studentNsi,
          fee_id: feeId,
          school_id: schoolId,
          school_notified: schoolNotified,
          school_wallet_credited: !!schoolWallet,
        },
      });

    // Step 7: Record in student wallet transactions if student has a wallet
    const { data: studentAccount } = await supabaseAdmin
      .from('student_accounts')
      .select('id, wallet_id')
      .eq('index_number', studentNsi)
      .maybeSingle();

    if (studentAccount) {
      await supabaseAdmin
        .from('student_wallet_transactions')
        .insert({
          student_account_id: studentAccount.id,
          wallet_id: studentAccount.wallet_id || parentWalletId,
          type: 'fee_payment',
          amount: amount,
          currency: 'SLE',
          sender_type: 'parent',
          sender_user_id: parentWallet.user_id,
          fee_id: feeId,
          status: 'completed',
          description: `Fee payment from parent`,
        })
        .maybeSingle();
    }

    return {
      success: true,
      transactionId,
      message: schoolNotified
        ? 'Payment successful! School has been notified.'
        : 'Payment successful! School will be notified shortly.',
    };
  },

  /**
   * Top up student's wallet from parent's wallet
   */
  async topUpStudentWallet(
    parentWalletId: string,
    studentAccountId: string,
    amount: number
  ): Promise<{ success: boolean; transactionId: string }> {
    // Get parent wallet
    const { data: parentWallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('id, balance, status, user_id')
      .eq('id', parentWalletId)
      .single();

    if (walletError || !parentWallet) {
      throw new Error('Parent wallet not found');
    }

    if (parentWallet.status !== 'ACTIVE') {
      throw new Error('Wallet is not active');
    }

    const balance = parseFloat(parentWallet.balance) || 0;
    if (balance < amount) {
      throw new Error(`Insufficient balance. Available: ${balance.toFixed(2)} SLE`);
    }

    // Get student account with wallet
    const { data: studentAccount, error: studentError } = await supabaseAdmin
      .from('student_accounts')
      .select('id, wallet_id, first_name, last_name, index_number')
      .eq('id', studentAccountId)
      .single();

    if (studentError || !studentAccount) {
      throw new Error('Student account not found');
    }

    if (!studentAccount.wallet_id) {
      throw new Error('Student does not have a wallet yet');
    }

    const transactionId = `TOPUP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Deduct from parent wallet
    const { error: deductError } = await supabaseAdmin
      .from('wallets')
      .update({
        balance: balance - amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parentWalletId);

    if (deductError) {
      throw new Error('Failed to process top-up');
    }

    // Add to student wallet
    const { data: studentWallet } = await supabaseAdmin
      .from('wallets')
      .select('balance')
      .eq('id', studentAccount.wallet_id)
      .single();

    const studentBalance = parseFloat(studentWallet?.balance) || 0;

    await supabaseAdmin
      .from('wallets')
      .update({
        balance: studentBalance + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentAccount.wallet_id);

    // Record transactions
    await supabaseAdmin
      .from('transactions')
      .insert({
        wallet_id: parentWalletId,
        type: 'STUDENT_TOPUP',
        amount: -amount,
        currency: 'SLE',
        status: 'COMPLETED',
        description: `Top-up for ${studentAccount.first_name} ${studentAccount.last_name}`,
        reference: transactionId,
      });

    await supabaseAdmin
      .from('student_wallet_transactions')
      .insert({
        student_account_id: studentAccount.id,
        wallet_id: studentAccount.wallet_id,
        type: 'topup',
        amount: amount,
        currency: 'SLE',
        sender_type: 'parent',
        sender_user_id: parentWallet.user_id,
        status: 'completed',
        description: 'Top-up from parent',
      });

    return {
      success: true,
      transactionId,
    };
  },
};
