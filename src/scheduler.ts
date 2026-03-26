import axios from 'axios';
import { Post } from './types';

const GHL_API_KEY = process.env.GHL_API_KEY || '';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || 'KDYWgCbylP2Tikz3Alfv';
const GHL_BASE = 'https://services.leadconnectorhq.com';

const ghlHeaders = () => ({
  Authorization: `Bearer ${GHL_API_KEY}`,
  Version: '2021-07-28',
  'Content-Type': 'application/json',
});

async function getConnectedAccounts(): Promise<Record<string, string>> {
  try {
    const res = await axios.get(
      `${GHL_BASE}/social-media-posting/${GHL_LOCATION_ID}/accounts`,
      { headers: ghlHeaders() }
    );
    const accounts: Record<string, string> = {};
    for (const account of res.data?.accounts || []) {
      const type = (account.type || '').toLowerCase();
      if (type.includes('facebook')) accounts['facebook'] = account.id;
      if (type.includes('instagram')) accounts['instagram'] = account.id;
      if (type.includes('linkedin')) accounts['linkedin'] = account.id;
      if (type.includes('google')) accounts['gbp'] = account.id;
    }
    console.log('✓ GHL connected accounts:', Object.keys(accounts).join(', ') || 'none');
    return accounts;
  } catch (err: any) {
    console.error('✗ GHL accounts fetch failed:', err.response?.data?.message || err.message);
    return {};
  }
}

export async function schedulePost(post: Post, accounts: Record<string, string>): Promise<boolean> {
  try {
    const accountId = accounts[post.platform];
    if (!accountId) {
      console.warn(`⚠ No GHL account for: ${post.platform} — skipping`);
      return false;
    }

    const caption = [
      post.caption,
      post.hashtags.length > 0
        ? '\n\n' + post.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')
        : ''
    ].join('').trim();

    await axios.post(
      `${GHL_BASE}/social-media-posting/${GHL_LOCATION_ID}/posts`,
      {
        locationId: GHL_LOCATION_ID,
        accountIds: [accountId],
        body: caption,
        scheduleTime: post.scheduledTime,
        status: 'scheduled',
      },
      { headers: ghlHeaders() }
    );

    console.log(`✓ Scheduled: ${post.platform} — ${post.day} @ ${post.scheduledTime}`);
    return true;
  } catch (err: any) {
    console.error(`✗ Schedule failed (${post.platform}/${post.day}):`, err.response?.data?.message || err.message);
    return false;
  }
}

export async function scheduleAllApprovedPosts(posts: Post[]): Promise<{ scheduled: number; failed: number }> {
  const accounts = await getConnectedAccounts();
  let scheduled = 0;
  let failed = 0;

  for (const post of posts.filter(p => p.approved)) {
    const success = await schedulePost(post, accounts);
    if (success) scheduled++;
    else failed++;
    await new Promise(r => setTimeout(r, 600));
  }

  return { scheduled, failed };
}
