import { NextResponse } from 'next/server';
import { sendServerSideLeadNotification } from '@/lib/services/whatsappNotifier';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { config, phone } = body;

    const testPayload = {
      name: 'Ahmed Ashraf (Test Buyer)',
      phone: phone || '+201033387703',
      email: 'buyer@example.com',
      propertyTitle: 'Lakeview Signature Mansion — Golden Square',
      budget: '65,000,000 EGP',
      preferredChannel: 'WhatsApp',
      notes: 'Automated test notification from Zakaria Farid Admin Engine',
      source: 'Admin Settings Test Dispatch',
      message: 'This is a test notification verifying automated WhatsApp Business delivery.',
    };

    const result = await sendServerSideLeadNotification(testPayload, config);

    return NextResponse.json({
      success: result.success,
      method: result.method,
      messageId: result.messageId,
      error: result.error,
    });
  } catch (err: any) {
    console.error('Test notification error:', err);
    return NextResponse.json({ error: err.message || 'Dispatch error' }, { status: 500 });
  }
}
