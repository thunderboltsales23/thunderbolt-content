import express from 'express';
import { generateWeeklyContent } from './generator';
import { sendApprovalEmail } from './email';
import { scheduleAllApprovedPosts } from './scheduler';
import { WeeklyCalendar } from './types';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = parseInt(process.env.PORT || '3002');

// In-memory pending approvals
const pending = new Map<string, WeeklyCalendar>();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', pending: pending.size });
});

// Manual or cron trigger
app.post('/generate', async (_req, res) => {
  try {
    console.log('\n⚡ Content generation triggered');
    const calendar = await generateWeeklyContent();
    pending.set(calendar.approvalToken, calendar);
    await sendApprovalEmail(calendar);
    res.json({ success: true, token: calendar.approvalToken, posts: calendar.posts.length });
  } catch (err: any) {
    console.error('Generate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Direct approval API
app.post('/approve', async (req, res) => {
  const { token, action, edits } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });

  const calendar = pending.get(token);
  if (!calendar) return res.status(404).json({ error: 'Token not found' });

  if (action === 'approve') {
    calendar.posts.forEach(p => p.approved = true);
    const result = await scheduleAllApprovedPosts(calendar.posts);
    pending.delete(token);
    return res.json({ success: true, ...result });
  }

  if (action === 'edit' && Array.isArray(edits)) {
    for (const edit of edits) {
      if (calendar.posts[edit.postIndex]) {
        if (edit.newCaption) calendar.posts[edit.postIndex].caption = edit.newCaption;
        if (edit.note) calendar.posts[edit.postIndex].editNote = edit.note;
      }
    }
    pending.set(token, calendar);
    await sendApprovalEmail(calendar);
    return res.json({ success: true, message: 'Updated and resent' });
  }

  res.status(400).json({ error: 'Unknown action' });
});

// GHL webhook — parses email reply
app.post('/webhook/reply', async (req, res) => {
  try {
    const text = (req.body.message || req.body.body || req.body.text || '');
    const lower = text.toLowerCase().trim();
    console.log('📧 Reply received:', lower.substring(0, 80));

    const tokenMatch = text.match(/[Tt]oken[:\s]+([a-f0-9-]{36})/);
    const token = tokenMatch?.[1];
    if (!token) return res.json({ success: false, message: 'No token found' });

    const calendar = pending.get(token);
    if (!calendar) return res.json({ success: false, message: 'Token expired or not found' });

    if (lower.includes('approve all')) {
      calendar.posts.forEach(p => p.approved = true);
      const result = await scheduleAllApprovedPosts(calendar.posts);
      pending.delete(token);
      console.log(`✓ Approved via email: ${result.scheduled} scheduled, ${result.failed} failed`);
      return res.json({ success: true, ...result });
    }

    const editMatch = text.match(/EDIT\s+(\d+):\s*(.+)/i);
    if (editMatch) {
      const idx = parseInt(editMatch[1]) - 1;
      if (calendar.posts[idx]) {
        calendar.posts[idx].editNote = editMatch[2].trim();
        pending.set(token, calendar);
        await sendApprovalEmail(calendar);
        return res.json({ success: true, message: `Edit noted for post ${idx + 1}, resent approval email` });
      }
    }

    res.json({ success: false, message: 'Reply not recognized. Send APPROVE ALL or EDIT N: ...' });
  } catch (err: any) {
    console.error('Webhook error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n⚡ Thunderbolt Content Engine on port ${PORT}`);
  console.log(`   /health  /generate  /approve  /webhook/reply`);
});

export default app;
