import axios from 'axios';
import FormData from 'form-data';
import OpenAI from 'openai';
import { Post } from './types';

const GHL_API_KEY = process.env.GHL_API_KEY || '';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || 'KDYWgCbylP2Tikz3Alfv';
const GHL_BASE = 'https://services.leadconnectorhq.com';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ghlHeaders = () => ({
  Authorization: `Bearer ${GHL_API_KEY}`,
  Version: '2021-07-28',
  'Content-Type': 'application/json',
});

// ── STEP 1: Generate image with DALL-E 3 ─────────────────────────────────────
async function generateImage(imagePrompt: string): Promise<string | null> {
  try {
    console.log(`  → Generating image...`);
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: imagePrompt,
      size: '1024x1024',
      style: 'natural',
      n: 1,
    });
    const url = response.data[0]?.url;
    if (!url) throw new Error('No URL returned from DALL-E');
    console.log(`  ✓ Image generated`);
    return url;
  } catch (err: any) {
    console.error(`  ✗ DALL-E failed:`, err.message);
    return null;
  }
}

// ── STEP 2: Download image buffer from DALL-E URL ────────────────────────────
async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(res.data);
  } catch (err: any) {
    console.error(`  ✗ Image download failed:`, err.message);
    return null;
  }
}

// ── STEP 3: Upload image buffer to GHL Media Storage ─────────────────────────
async function uploadToGHL(imageBuffer: Buffer, filename: string): Promise<string | null> {
  try {
    console.log(`  → Uploading to GHL CDN...`);
    const form = new FormData();
    form.append('file', imageBuffer, {
      filename,
      contentType: 'image/png',
    });
    form.append('locationId', GHL_LOCATION_ID);

    const res = await axios.post(
      `${GHL_BASE}/medias/upload-file`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${GHL_API_KEY}`,
          Version: '2021-07-28',
        },
      }
    );

    const cdnUrl = res.data?.url || res.data?.data?.url || res.data?.mediaUrl;
    if (!cdnUrl) throw new Error(`No CDN URL in response: ${JSON.stringify(res.data)}`);
    console.log(`  ✓ Uploaded to GHL CDN`);
    return cdnUrl;
  } catch (err: any) {
    console.error(`  ✗ GHL upload failed:`, err.response?.data || err.message);
    return null;
  }
}

// ── Get connected social accounts ────────────────────────────────────────────
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

// ── Schedule a single post ────────────────────────────────────────────────────
export async function schedulePost(post: Post, accounts: Record<string, string>): Promise<boolean> {
  try {
    const accountId = accounts[post.platform];
    if (!accountId) {
      console.warn(`⚠ No GHL account for: ${post.platform} — skipping`);
      return false;
    }

    console.log(`\n→ Processing: ${post.platform} — ${post.day}`);

    // Build caption
    const caption = [
      post.caption,
      post.hashtags.length > 0
        ? '\n\n' + post.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')
        : ''
    ].join('').trim();

    // Generate image pipeline: DALL-E → download → GHL CDN
    let imageUrl: string | null = null;
    if (post.imagePrompt) {
      const dalleUrl = await generateImage(post.imagePrompt);
      if (dalleUrl) {
        const buffer = await downloadImage(dalleUrl);
        if (buffer) {
          const filename = `post-${post.platform}-${post.day}-${Date.now()}.png`;
          imageUrl = await uploadToGHL(buffer, filename);
        }
      }
    }

    // Build GHL post payload
    const payload: any = {
      locationId: GHL_LOCATION_ID,
      accountIds: [accountId],
      body: caption,
      scheduleTime: post.scheduledTime,
      status: 'scheduled',
    };

    // Attach image if we have a CDN URL
    if (imageUrl) {
      payload.mediaUrls = [imageUrl];
      console.log(`  ✓ Image attached`);
    } else {
      console.warn(`  ⚠ No image — posting text only`);
    }

    await axios.post(
      `${GHL_BASE}/social-media-posting/${GHL_LOCATION_ID}/posts`,
      payload,
      { headers: ghlHeaders() }
    );

    console.log(`✓ Scheduled: ${post.platform} — ${post.day} @ ${post.scheduledTime}`);
    return true;
  } catch (err: any) {
    console.error(`✗ Schedule failed (${post.platform}/${post.day}):`, err.response?.data || err.message);
    return false;
  }
}

// ── Schedule all approved posts ───────────────────────────────────────────────
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
