import { generateWeeklyContent } from './generator';
import { sendApprovalEmail } from './email';

async function run() {
  console.log('\n⚡ Thunderbolt Content Engine — Weekly Run');
  console.log('='.repeat(50));
  console.log(`Time: ${new Date().toISOString()}`);

  try {
    const calendar = await generateWeeklyContent();
    console.log(`\n✓ Generated ${calendar.posts.length} posts for week of ${calendar.weekOf}`);
    console.log(`  Theme: ${calendar.themeLabel}`);
    console.log(`  Token: ${calendar.approvalToken}`);

    await sendApprovalEmail(calendar);
    console.log('\n✓ Approval email sent');
    console.log('\n⚡ Done — waiting for your reply');
  } catch (err: any) {
    console.error('\n✗ Content engine failed:', err.message);
    process.exit(1);
  }
}

run();
