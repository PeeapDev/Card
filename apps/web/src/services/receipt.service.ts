/**
 * Receipt Service
 * Handles sending receipts to customers via notifications, SMS, email, and chat
 * Also creates/manages buyer-seller chat relationships
 */

import { supabaseAdmin } from '@/lib/supabase';

export interface ReceiptData {
  saleId: string;
  saleNumber: string;
  merchantId: string;
  merchantName: string;
  customerId?: string; // User ID if known
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  amountPaid: number;
  change: number;
  date: string;
}

/**
 * Look up user ID by phone number or email
 */
async function findUserByContact(phone?: string, email?: string): Promise<string | null> {
  if (!phone && !email) return null;

  try {
    // Try to find user by phone first
    if (phone) {
      // Clean phone number - remove spaces and special characters
      const cleanPhone = phone.replace(/[^0-9+]/g, '');

      const { data: userByPhone } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .or(`phone.eq.${cleanPhone},phone_number.eq.${cleanPhone}`)
        .single();

      if (userByPhone?.id) {
        return userByPhone.id;
      }
    }

    // Try by email if phone didn't work
    if (email) {
      const { data: userByEmail } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (userByEmail?.id) {
        return userByEmail.id;
      }
    }
  } catch (error) {
    // No user found - that's okay
    console.log('No user found for contact:', phone || email);
  }

  return null;
}

export interface SendReceiptOptions {
  sendNotification?: boolean;
  sendToChat?: boolean;
  sendSMS?: boolean;
  sendEmail?: boolean;
}

/**
 * Send a receipt to a customer through multiple channels
 */
export async function sendReceipt(
  receipt: ReceiptData,
  options: SendReceiptOptions = { sendNotification: true, sendToChat: true }
): Promise<{ success: boolean; error?: string; conversationId?: string }> {
  // If no customer ID provided, try to find user by phone or email
  let customerId = receipt.customerId;
  if (!customerId) {
    customerId = await findUserByContact(receipt.customerPhone, receipt.customerEmail) || undefined;
  }

  if (!customerId) {
    // No user found - we can still log the attempt but can't send to app
    console.log('No user account found for customer:', receipt.customerName);
    return { success: false, error: 'No user account linked to this customer' };
  }

  // Update receipt with found customer ID
  receipt.customerId = customerId;

  try {
    const receiptMessage = formatReceiptMessage(receipt);
    const results: { channel: string; success: boolean; error?: string }[] = [];
    let conversationId: string | undefined;

    // Send notification
    if (options.sendNotification) {
      try {
        await supabaseAdmin.from('notifications').insert({
          user_id: receipt.customerId,
          title: `Receipt from ${receipt.merchantName}`,
          message: `You have a new receipt #${receipt.saleNumber} for ${formatCurrency(receipt.total)}`,
          type: 'receipt',
          data: {
            sale_id: receipt.saleId,
            sale_number: receipt.saleNumber,
            total: receipt.total,
            merchant_id: receipt.merchantId,
            merchant_name: receipt.merchantName,
          },
          is_read: false,
          created_at: new Date().toISOString(),
        });
        results.push({ channel: 'notification', success: true });
      } catch (error) {
        console.error('Error sending notification:', error);
        results.push({ channel: 'notification', success: false, error: String(error) });
      }
    }

    // Send to chat (and create relationship if needed)
    if (options.sendToChat) {
      try {
        const chatResult = await sendReceiptToChat(receipt, receiptMessage);
        conversationId = chatResult.conversationId;
        results.push({ channel: 'chat', success: true });
      } catch (error) {
        console.error('Error sending to chat:', error);
        results.push({ channel: 'chat', success: false, error: String(error) });
      }
    }

    // Send SMS (placeholder - would integrate with SMS provider)
    if (options.sendSMS && receipt.customerPhone) {
      try {
        // TODO: Integrate with SMS provider (Twilio, Africa's Talking, etc.)
        // For now, just log it
        console.log(`SMS would be sent to ${receipt.customerPhone}`);
        results.push({ channel: 'sms', success: true });
      } catch (error) {
        console.error('Error sending SMS:', error);
        results.push({ channel: 'sms', success: false, error: String(error) });
      }
    }

    // Send Email (placeholder - would integrate with email service)
    if (options.sendEmail && receipt.customerEmail) {
      try {
        // TODO: Integrate with email service
        console.log(`Email would be sent to ${receipt.customerEmail}`);
        results.push({ channel: 'email', success: true });
      } catch (error) {
        console.error('Error sending email:', error);
        results.push({ channel: 'email', success: false, error: String(error) });
      }
    }

    const allSuccess = results.every(r => r.success);
    return {
      success: allSuccess,
      conversationId,
      error: allSuccess ? undefined : results.filter(r => !r.success).map(r => r.error).join(', '),
    };
  } catch (error) {
    console.error('Error in sendReceipt:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send receipt to chat and create buyer-seller relationship if needed
 */
async function sendReceiptToChat(
  receipt: ReceiptData,
  message: string
): Promise<{ conversationId: string }> {
  const { merchantId, customerId, saleId, saleNumber, total } = receipt;

  if (!customerId) {
    throw new Error('No customer ID provided');
  }

  // Check if conversation already exists between merchant and customer
  const { data: existingConvo } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .or(`and(participant_one.eq.${merchantId},participant_two.eq.${customerId}),and(participant_one.eq.${customerId},participant_two.eq.${merchantId})`)
    .single();

  let conversationId = existingConvo?.id;

  // Create new conversation if it doesn't exist
  if (!conversationId) {
    const { data: newConvo, error: convoError } = await supabaseAdmin
      .from('conversations')
      .insert({
        participant_one: merchantId,
        participant_two: customerId,
        conversation_type: 'merchant_customer',
        metadata: {
          merchant_name: receipt.merchantName,
          first_purchase_date: new Date().toISOString(),
          source: 'pos_sale',
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (convoError) {
      throw convoError;
    }

    conversationId = newConvo?.id;
  }

  if (!conversationId) {
    throw new Error('Failed to create or find conversation');
  }

  // Send receipt as a message
  await supabaseAdmin.from('messages').insert({
    conversation_id: conversationId,
    sender_id: merchantId,
    content: message,
    message_type: 'receipt',
    metadata: {
      sale_id: saleId,
      sale_number: saleNumber,
      total: total,
      items_count: receipt.items.length,
      payment_method: receipt.paymentMethod,
    },
    created_at: new Date().toISOString(),
  });

  // Update conversation last message
  await supabaseAdmin
    .from('conversations')
    .update({
      last_message: `Receipt #${saleNumber} - ${formatCurrency(total)}`,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  return { conversationId };
}

/**
 * Create or get existing conversation between merchant and customer
 */
export async function getOrCreateConversation(
  merchantId: string,
  customerId: string,
  merchantName?: string
): Promise<string> {
  // Check if conversation already exists
  const { data: existingConvo } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .or(`and(participant_one.eq.${merchantId},participant_two.eq.${customerId}),and(participant_one.eq.${customerId},participant_two.eq.${merchantId})`)
    .single();

  if (existingConvo?.id) {
    return existingConvo.id;
  }

  // Create new conversation
  const { data: newConvo, error } = await supabaseAdmin
    .from('conversations')
    .insert({
      participant_one: merchantId,
      participant_two: customerId,
      conversation_type: 'merchant_customer',
      metadata: {
        merchant_name: merchantName,
        created_from: 'pos',
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return newConvo?.id || '';
}

/**
 * Format receipt data into a readable message
 */
function formatReceiptMessage(receipt: ReceiptData): string {
  const lines = [
    `--- RECEIPT ---`,
    ``,
    `${receipt.merchantName}`,
    ``,
    `Receipt #: ${receipt.saleNumber}`,
    `Date: ${new Date(receipt.date).toLocaleString()}`,
    ``,
    `--- ITEMS ---`,
  ];

  receipt.items.forEach(item => {
    lines.push(`${item.name}`);
    lines.push(`  ${item.quantity} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.total)}`);
  });

  lines.push(``);
  lines.push(`--- TOTALS ---`);
  lines.push(`Subtotal: ${formatCurrency(receipt.subtotal)}`);

  if (receipt.discount > 0) {
    lines.push(`Discount: -${formatCurrency(receipt.discount)}`);
  }

  if (receipt.tax > 0) {
    lines.push(`Tax: ${formatCurrency(receipt.tax)}`);
  }

  lines.push(`TOTAL: ${formatCurrency(receipt.total)}`);
  lines.push(``);
  lines.push(`Payment: ${getPaymentMethodLabel(receipt.paymentMethod)}`);
  lines.push(`Paid: ${formatCurrency(receipt.amountPaid)}`);

  if (receipt.change > 0) {
    lines.push(`Change: ${formatCurrency(receipt.change)}`);
  }

  lines.push(``);
  lines.push(`Thank you for your purchase!`);

  return lines.join('\n');
}

/**
 * Format currency in SLE/NLe format
 */
function formatCurrency(amount: number): string {
  return `NLe ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Get human-readable payment method label
 */
function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Cash',
    card: 'Card',
    mobile_money: 'Mobile Money',
    qr: 'QR Payment',
    wallet: 'Wallet',
  };
  return labels[method] || method;
}

export default {
  sendReceipt,
  getOrCreateConversation,
};
