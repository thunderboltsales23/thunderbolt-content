import axios from 'axios';
import { WeeklyCalendar, Post } from './types';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'ian@thunderboltsalessystems.com';
const APPROVAL_EMAIL = process.env.APPROVAL_EMAIL || 'ian@thunderboltsalessystems.com';

const PLATFORM_EMOJI: Record<string, string> = {
  linkedin: '💼', facebook: '📘', instagram: '📸', gbp: '🗺️',
};

function buildEmailHTML(calendar: WeeklyCalendar): string {
  const postsHTML = calendar.posts.map((post, i) => {
    const emoji = PLATFORM_EMOJI[post.platform] || '📱';
    const platform = post.platform.charAt(0).toUpperCase() + post.platform.slice(1);
    const hashtags = post.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
    const scheduledStr = new Date(post.scheduledTime).toLocaleString('en-US', {
      timeZone: 'America/New_York', weekday: 'long', month: 'short',
      day: 'numeric', hour: 'numeric', minute: '2-digit'
    });

    return `
    <div style="margin-bottom:20px;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">
      <div style="background:#1A1A1A;padding:10px 16px">
        <span style="color:#00A19B;font-weight:bold;font-size:13px">${emoji} ${platform.toUpperCase()} — Post ${i + 1}</span>
        <span style="color:#888;font-size:11px;float:right">${post.day} · ${scheduledStr} ET</span>
      </div>
      <div style="padding:14px 16px;background:#fff">
        <p style="font-size:13px;color:#333;line-height:1.6;white-space:pre-wrap;margin:0 0 10px">${post.caption}</p>
        <p style="font-size:11px;color:#00A19B;margin:0 0 10px">${hashtags}</p>
        <div style="background:#f8f8f8;border-left:3px solid #00A19B;padding:8px 12px;font-size:11px;color:#666">
          <strong>🎨 Image Prompt:</strong> ${post.imagePrompt}
        </div>
      </div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:660px;margin:0 auto;background:#f5f5f5;padding:20px">
  <div style="background:#1A1A1A;padding:18px 24px;border-radius:8px 8px 0 0;border-left:4px solid #00A19B">
    <h2 style="color:#00A19B;margin:0;font-size:18px">⚡ Thunderbolt Content Calendar</h2>
    <p style="color:#888;margin:4px 0 0;font-size:12px">Week of ${calendar.weekOf} · Theme: ${calendar.themeLabel}</p>
  </div>
  <div style="background:#fff;padding:20px 24px;border:1px solid #e0e0e0">
    <div style="background:#f0fffe;border:1px solid #00A19B;border-radius:6px;padding:12px 16px;margin-bottom:20px">
      <p style="margin:0;font-size:13px;color:#1A1A1A"><strong>7 posts ready for your approval.</strong></p>
      <p style="margin:5px 0 0;font-size:12px;color:#555">Reply <strong>APPROVE ALL</strong> to schedule everything, or reply with edits:<br>
      <em>EDIT 3: Change opening line to mention Marietta</em></p>
    </div>
    ${postsHTML}
    <div style="background:#1A1A1A;padding:14px;border-radius:6px;text-align:center;margin-top:16px">
      <p style="color:#fff;margin:0;font-size:13px;font-weight:bold">Reply APPROVE ALL to schedule all 7 posts</p>
      <p style="color:#555;margin:5px 0 0;font-size:10px">Token: ${calendar.approvalToken}</p>
    </div>
  </div>
</body></html>`;
}

export async function sendApprovalEmail(calendar: WeeklyCalendar): Promise<boolean> {
  try {
    const subject = `⚡ ${calendar.posts.length} posts ready — APPROVE? | Week of ${calendar.weekOf} | ${calendar.themeLabel}`;

    await axios.post(
      'https://api.sendgrid.com/v3/mail/send',
      {
        personalizations: [{ to: [{ email: APPROVAL_EMAIL }] }],
        from: { email: FROM_EMAIL, name: 'Thunderbolt Content Engine' },
        subject,
        content: [{ type: 'text/html', value: buildEmailHTML(calendar) }],
        reply_to: { email: FROM_EMAIL },
      },
      {
        headers: {
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`✓ Approval email sent → ${APPROVAL_EMAIL}`);
    return true;
  } catch (err: any) {
    console.error('✗ Email failed:', err.response?.data || err.message);
    return false;
  }
}
