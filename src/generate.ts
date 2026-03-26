import { generateWeeklyCalendar } from './generator';
import { sendApprovalEmail } from './email';
import { ApprovalState } from './types';

async function run() {
  console.log(`\n⚡ Thunderbolt Content Engine — Weekly Run`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  try {
    const calendar = await generateWeeklyCalendar();
    await sendApprovalEmail(calendar);

    console.log(`\n✅ Done — ${calendar.posts.length} posts generated`);
    console.log(`📧 Approval email sent to ian@thunderboltsalessystems.com`);
    console.log(`🔑 Approval token: ${calendar.approvalToken}`);
  } catch (err: any) {
    console.error('❌ Content engine failed:', err.message);
    process.exit(1);
  }
}

run();
