/**
 * School Accounting Service
 * Manages income and expense entries for schools
 * Uses Supabase database - NO localStorage
 */

import { supabaseAdmin } from '@/lib/supabase';

export interface AccountingEntry {
  id: string;
  schoolId: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;  // In cents
  reference?: string;
  date: string;
  status: 'pending' | 'completed' | 'cancelled';
  paymentMethod?: string;
  transactionId?: string;
  vendorName?: string;
  vendorId?: string;
  receiptUrl?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export interface AccountingCategory {
  id: string;
  schoolId: string;
  name: string;
  type: 'income' | 'expense';
  description?: string;
  isDefault: boolean;
}

export interface CreateEntryRequest {
  schoolId: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  reference?: string;
  date?: string;
  paymentMethod?: string;
  vendorName?: string;
  notes?: string;
  createdBy?: string;
}

class SchoolAccountingService {
  /**
   * Get all accounting entries for a school
   */
  async getEntries(
    schoolId: string,
    options?: {
      type?: 'income' | 'expense';
      category?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
      limit?: number;
    }
  ): Promise<AccountingEntry[]> {
    let query = supabaseAdmin
      .from('school_accounting_entries')
      .select('*')
      .eq('school_id', schoolId)
      .order('date', { ascending: false });

    if (options?.type) {
      query = query.eq('type', options.type);
    }
    if (options?.category) {
      query = query.eq('category', options.category);
    }
    if (options?.startDate) {
      query = query.gte('date', options.startDate);
    }
    if (options?.endDate) {
      query = query.lte('date', options.endDate);
    }
    if (options?.status) {
      query = query.eq('status', options.status);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching accounting entries:', error);
      return [];
    }

    return (data || []).map(this.mapToEntry);
  }

  /**
   * Create a new accounting entry
   */
  async createEntry(request: CreateEntryRequest): Promise<{ success: boolean; entry?: AccountingEntry; error?: string }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('school_accounting_entries')
        .insert({
          school_id: request.schoolId,
          type: request.type,
          category: request.category,
          description: request.description,
          amount: request.amount,
          reference: request.reference || this.generateReference(request.type),
          date: request.date || new Date().toISOString().split('T')[0],
          payment_method: request.paymentMethod,
          vendor_name: request.vendorName,
          notes: request.notes,
          created_by: request.createdBy,
          status: 'completed',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating accounting entry:', error);
        return { success: false, error: error.message };
      }

      return { success: true, entry: this.mapToEntry(data) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Update an accounting entry
   */
  async updateEntry(
    entryId: string,
    updates: Partial<CreateEntryRequest>
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabaseAdmin
      .from('school_accounting_entries')
      .update({
        type: updates.type,
        category: updates.category,
        description: updates.description,
        amount: updates.amount,
        reference: updates.reference,
        date: updates.date,
        payment_method: updates.paymentMethod,
        vendor_name: updates.vendorName,
        notes: updates.notes,
      })
      .eq('id', entryId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  /**
   * Delete an accounting entry
   */
  async deleteEntry(entryId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabaseAdmin
      .from('school_accounting_entries')
      .delete()
      .eq('id', entryId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  /**
   * Get categories for a school
   */
  async getCategories(schoolId: string, type?: 'income' | 'expense'): Promise<AccountingCategory[]> {
    let query = supabaseAdmin
      .from('school_accounting_categories')
      .select('*')
      .or(`school_id.eq.${schoolId},school_id.eq.default`)
      .order('name');

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }

    return (data || []).map(cat => ({
      id: cat.id,
      schoolId: cat.school_id,
      name: cat.name,
      type: cat.type,
      description: cat.description,
      isDefault: cat.is_default,
    }));
  }

  /**
   * Create a custom category
   */
  async createCategory(
    schoolId: string,
    name: string,
    type: 'income' | 'expense',
    description?: string
  ): Promise<{ success: boolean; category?: AccountingCategory; error?: string }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('school_accounting_categories')
        .insert({
          school_id: schoolId,
          name,
          type,
          description,
          is_default: false,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'Category already exists' };
        }
        return { success: false, error: error.message };
      }

      return {
        success: true,
        category: {
          id: data.id,
          schoolId: data.school_id,
          name: data.name,
          type: data.type,
          description: data.description,
          isDefault: data.is_default,
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Delete a custom category (only non-default)
   */
  async deleteCategory(categoryId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabaseAdmin
      .from('school_accounting_categories')
      .delete()
      .eq('id', categoryId)
      .eq('is_default', false);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  /**
   * Get summary statistics
   */
  async getSummary(
    schoolId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    incomeByCategory: Record<string, number>;
    expensesByCategory: Record<string, number>;
  }> {
    const entries = await this.getEntries(schoolId, {
      startDate,
      endDate,
      status: 'completed',
    });

    const incomeEntries = entries.filter(e => e.type === 'income');
    const expenseEntries = entries.filter(e => e.type === 'expense');

    const totalIncome = incomeEntries.reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = expenseEntries.reduce((sum, e) => sum + e.amount, 0);

    const incomeByCategory: Record<string, number> = {};
    incomeEntries.forEach(e => {
      incomeByCategory[e.category] = (incomeByCategory[e.category] || 0) + e.amount;
    });

    const expensesByCategory: Record<string, number> = {};
    expenseEntries.forEach(e => {
      expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
    });

    return {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      incomeByCategory,
      expensesByCategory,
    };
  }

  /**
   * Generate a reference number
   */
  private generateReference(type: 'income' | 'expense'): string {
    const prefix = type === 'income' ? 'INC' : 'EXP';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Map database record to AccountingEntry
   */
  private mapToEntry(data: any): AccountingEntry {
    return {
      id: data.id,
      schoolId: data.school_id,
      type: data.type,
      category: data.category,
      description: data.description,
      amount: data.amount,
      reference: data.reference,
      date: data.date,
      status: data.status,
      paymentMethod: data.payment_method,
      transactionId: data.transaction_id,
      vendorName: data.vendor_name,
      vendorId: data.vendor_id,
      receiptUrl: data.receipt_url,
      notes: data.notes,
      createdBy: data.created_by,
      createdAt: data.created_at,
    };
  }
}

export const schoolAccountingService = new SchoolAccountingService();
