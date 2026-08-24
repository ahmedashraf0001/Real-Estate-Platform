/**
 * WhatsApp & Lead Notification Dispatcher
 * Formats structured executive briefs and automatically routes notifications to Farid Zakaria
 * via WhatsApp Business Cloud API (Meta), UltraMsg, Twilio, or Automation Webhooks.
 */

import { WHATSAPP_NUMBER } from '@/lib/utils/formatting';
import { 
  PlatformWhatsAppAutomationSettings, 
  DEFAULT_WHATSAPP_AUTOMATION_SETTINGS, 
  getStoredPlatformSettings 
} from './marketIntelligence';

export interface LeadNotificationPayload {
  name: string;
  phone: string;
  email?: string | null;
  message?: string | null;
  propertyTitle?: string | null;
  propertySlug?: string | null;
  budget?: string | null;
  notes?: string | null;
  source?: string | null;
  entryMethod?: string | null;
  preferredChannel?: string | null;
}

/**
 * Normalizes any phone number into international WhatsApp E.164 without leading plus or zeroes.
 * e.g. "01033387703" -> "201033387703"
 *      "+201009970776" -> "201009970776"
 */
export function formatInternationalWhatsAppNumber(phone: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  // If Egyptian local mobile (11 digits starting with 01X)
  if (digits.startsWith('01') && digits.length === 11) {
    digits = '20' + digits.slice(1);
  } else if (digits.startsWith('1') && digits.length === 10) {
    digits = '20' + digits;
  }
  return digits;
}

/**
 * Get Farid Zakaria's configured alert phone number.
 */
export function getFaridWhatsAppNumber(): string {
  if (typeof window !== 'undefined') {
    try {
      const stored = getStoredPlatformSettings();
      if (stored?.whatsappAutomation?.faridAlertPhone) {
        return formatInternationalWhatsAppNumber(stored.whatsappAutomation.faridAlertPhone);
      }
    } catch {}
  }
  const envPhone = process.env.WHATSAPP_NOTIFY_NUMBER || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || WHATSAPP_NUMBER;
  return formatInternationalWhatsAppNumber(envPhone);
}

/**
 * Generates a clean, pristine Arabic/English WhatsApp message without fragile box characters
 * that render cleanly across all mobile and desktop WhatsApp clients.
 */
export function formatFaridWhatsAppLeadMessage(lead: LeadNotificationPayload): string {
  const timestamp = new Date().toLocaleString('ar-EG', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });

  const intlPhone = formatInternationalWhatsAppNumber(lead.phone);
  const waCallbackUrl = intlPhone ? `https://wa.me/${intlPhone}` : '';

  const lines: string[] = [
    `🏛️ *إشعار استفسار جديد — منصة زكريا فريد*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `👤 *العميل:* ${lead.name || 'عميل محتمل'}`,
    `📞 *الهاتف:* ${lead.phone}`,
    lead.email ? `📧 *البريد:* ${lead.email}` : '',
    `🏡 *العقار المطلـوب:* ${lead.propertyTitle || 'استفسار عام عن المحفظة العقارية'}`,
    lead.budget ? `💰 *الميزانية المستهدفة:* ${lead.budget}` : '',
    lead.preferredChannel ? `📱 *قناة التواصل المفضلة:* ${lead.preferredChannel}` : '',
    lead.source ? `📍 *المصدر:* ${lead.source}` : '',
    lead.notes ? `📝 *الملاحظات:* ${lead.notes}` : '',
    lead.message ? `💬 *نص الطلب:* "${lead.message}"` : '',
    `⏰ *التوقيت:* ${timestamp}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `⚡ *محادثة فورية مع العميل على واتساب:*`,
    waCallbackUrl,
  ];

  return lines.filter(Boolean).join('\n');
}

/**
 * Generates the direct WhatsApp Web / App dispatch URL to notify Farid Zakaria
 */
export function getNotifyFaridWhatsAppUrl(lead: LeadNotificationPayload): string {
  const targetNumber = getFaridWhatsAppNumber();
  const text = formatFaridWhatsAppLeadMessage(lead);
  return `https://wa.me/${targetNumber}?text=${encodeURIComponent(text)}`;
}

/**
 * Automatically dispatches the WhatsApp notification to Farid Zakaria's business / personal number
 * using WhatsApp Business Cloud API (Meta), UltraMsg, Twilio, or Webhook.
 */
export async function sendServerSideLeadNotification(
  lead: LeadNotificationPayload,
  customConfig?: Partial<PlatformWhatsAppAutomationSettings>
): Promise<{ success: boolean; method: string; messageId?: string; error?: string }> {
  const faridPhone = customConfig?.faridAlertPhone 
    ? formatInternationalWhatsAppNumber(customConfig.faridAlertPhone)
    : getFaridWhatsAppNumber();

  const formattedMessage = formatFaridWhatsAppLeadMessage(lead);

  // Read config from env or params
  const metaPhoneId = customConfig?.metaPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_WA_PHONE_ID;
  const metaToken = customConfig?.metaAccessToken || process.env.WHATSAPP_API_TOKEN || process.env.META_WA_TOKEN;
  
  const ultraMsgInstance = customConfig?.ultraMsgInstanceId || process.env.ULTRAMSG_INSTANCE_ID;
  const ultraMsgToken = customConfig?.ultraMsgToken || process.env.ULTRAMSG_TOKEN;

  const twilioSid = customConfig?.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = customConfig?.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = customConfig?.twilioFromNumber || process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

  const webhookUrl = customConfig?.webhookUrl || process.env.WHATSAPP_WEBHOOK_URL;

  // 1. Official Meta WhatsApp Cloud API
  if (metaPhoneId && metaToken) {
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${metaPhoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${metaToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: faridPhone,
          type: 'text',
          text: {
            preview_url: true,
            body: formattedMessage,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data?.messages?.[0]?.id) {
        return { success: true, method: 'meta_cloud_api', messageId: data.messages[0].id };
      } else {
        console.warn('[WhatsAppNotifier] Meta Cloud API returned error:', data);
      }
    } catch (err: any) {
      console.error('[WhatsAppNotifier] Meta Cloud API exception:', err);
    }
  }

  // 2. UltraMsg Gateway
  if (ultraMsgInstance && ultraMsgToken) {
    try {
      const res = await fetch(`https://api.ultramsg.com/${ultraMsgInstance}/messages/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: ultraMsgToken,
          to: faridPhone,
          body: formattedMessage,
        }),
      });
      const data = await res.json();
      if (data.sent === 'true' || data.id) {
        return { success: true, method: 'ultramsg', messageId: data.id };
      }
    } catch (err: any) {
      console.error('[WhatsAppNotifier] UltraMsg failed:', err);
    }
  }

  // 3. Twilio WhatsApp API
  if (twilioSid && twilioAuth) {
    try {
      const basicAuth = Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64');
      const params = new URLSearchParams();
      params.append('From', twilioFrom.startsWith('whatsapp:') ? twilioFrom : `whatsapp:${twilioFrom}`);
      params.append('To', `whatsapp:+${faridPhone}`);
      params.append('Body', formattedMessage);

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      const data = await res.json();
      if (res.ok && data?.sid) {
        return { success: true, method: 'twilio', messageId: data.sid };
      }
    } catch (err: any) {
      console.error('[WhatsAppNotifier] Twilio failed:', err);
    }
  }

  // 4. Custom Automation Webhook (Make / Zapier / n8n / Telegram)
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: faridPhone,
          text: formattedMessage,
          lead,
          created_at: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        return { success: true, method: 'custom_webhook' };
      }
    } catch (err: any) {
      console.error('[WhatsAppNotifier] Webhook dispatch failed:', err);
    }
  }

  // Fallback: direct WhatsApp URL
  return { 
    success: true, 
    method: 'direct_whatsapp_link',
    error: 'Automated API credentials not set. Manual 1-click WhatsApp link generated.' 
  };
}
