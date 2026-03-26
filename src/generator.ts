import axios from 'axios';
import { Post, WeeklyCalendar, ContentTheme, THEME_LABELS, POST_SCHEDULE, THEME_CYCLE } from './types';
import * as crypto from 'crypto';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
const TRAP_BOT_URL = process.env.TRAP_BOT_URL || 'https://thunderboltsalessystems.com/start';

export function getCurrentTheme(): ContentTheme {
  const weeksSinceEpoch = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return THEME_CYCLE[weeksSinceEpoch % THEME_CYCLE.length];
}

function getScheduledDates(): Record<string, string> {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  monday.setHours(0, 0, 0, 0);

  const offsets: Record<string, number> = { Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4 };
  const dates: Record<string, string> = {};
  for (const [day, offset] of Object.entries(offsets)) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + offset);
    dates[day] = d.toISOString().split('T')[0];
  }
  return dates;
}

function buildPrompt(theme: ContentTheme): string {
  const themeGuidance: Record<ContentTheme, string> = {
    missed_call_problem: 'HVAC/roofing/plumbing contractors missing 4-7 calls per week in Atlanta metro. Each missed call = $3,500-$8,000 job. Make it visceral and local — name Atlanta suburbs.',
    speed_to_lead: 'Contractor who responds in 60 seconds wins the job. Industry average is 47 hours. Data-driven. Name specific Atlanta suburbs.',
    case_study: '4-truck Atlanta contractor who added $40k in one month by texting back missed calls in 60 seconds. Before/after numbers.',
    the_47_hour_gap: '47 hours vs 60 seconds. Contractor who responds first wins 78% of jobs. What happens to a lead during those 47 hours.',
    saturday_night: "It's Saturday night, AC goes out in Marietta. Homeowner calls 3 contractors. One AI texts back in 45 seconds. Who gets the job?",
    roi_math: '$2,000 setup. One $4,000 job covers it 2x. The math for HVAC vs roofing vs plumbing. Specific numbers for Atlanta market.',
    competitor_intel: 'Some Atlanta contractors are already using AI. While you are on the truck, their system is texting YOUR leads. Create urgency.',
    behind_the_build: 'Ian Figueroa building Thunderbolt for Atlanta contractors. Founder story. Authentic, not polished.',
  };

  return `You are Ian Figueroa, founder of Thunderbolt Sales Systems — AI sales automation for HVAC, roofing, and plumbing contractors across Atlanta metro (Gwinnett, Cobb, Fulton, DeKalb, Cherokee, Forsyth, Henry, Douglas, Fayette counties).

BRAND VOICE: Blue-collar assertive. Direct. No fluff. Local. Specific numbers beat vague claims. Write like a contractor would respect.

THIS WEEK: ${THEME_LABELS[theme]}
GUIDANCE: ${themeGuidance[theme]}

OFFER: Free AI Revenue Audit at ${TRAP_BOT_URL} — leads to $2,000 setup + $647/month — guaranteed 3 booked jobs in 30 days or month 2 free.

Generate exactly 7 posts:
- 2 LinkedIn (Tuesday + Thursday)
- 2 Facebook (Wednesday + Friday)
- 3 Instagram (Tuesday + Thursday + Friday)

RULES:
LinkedIn: 150-250 words. Strong first line (no starting with "I"). Short paragraphs. Soft CTA to ${TRAP_BOT_URL}. 3-5 hashtags at end.
Facebook: 80-130 words. Conversational. Reference Atlanta suburbs. Direct CTA. 2-3 hashtags.
Instagram: 60-90 word caption. Bold hook. End with "Free audit → Link in bio". 12-15 hashtags including #Atlanta #HVAC #Roofing #Plumbing.

Return ONLY a valid JSON array. No markdown. No explanation.
Each object: { "platform": "linkedin"|"facebook"|"instagram", "day": "Tuesday"|"Wednesday"|"Thursday"|"Friday", "caption": "post text without hashtags", "hashtags": ["tag1","tag2"], "imagePrompt": "detailed Canva visual prompt: image description, style, colors, text overlay" }`;
}

export async function generateWeeklyContent(): Promise<WeeklyCalendar> {
  const theme = getCurrentTheme();
  const dates = getScheduledDates();

  console.log(`\n⚡ Generating content — theme: ${THEME_LABELS[theme]}`);

  const response = await axios.post(GEMINI_URL, {
    contents: [{ parts: [{ text: buildPrompt(theme) }] }],
    generationConfig: { temperature: 0.8, maxOutputTokens: 4096 }
  });

  const rawText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const clean = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const rawPosts = JSON.parse(clean);

  const posts: Post[] = rawPosts.map((p: any) => {
    const scheduleEntry = POST_SCHEDULE.find(s => s.day === p.day && s.platform === p.platform);
    const time = scheduleEntry?.time || '09:00';
    return {
      ...p,
      theme,
      scheduledTime: `${dates[p.day]}T${time}:00`,
      approved: false,
    };
  });

  console.log(`✓ Generated ${posts.length} posts`);

  return {
    weekOf: dates['Tuesday'],
    theme,
    themeLabel: THEME_LABELS[theme],
    posts,
    approvalToken: crypto.randomUUID(),
  };
}
