// ── THUNDERBOLT CONTENT ENGINE — TYPES ──────────────────────────────────

export type Platform = 'linkedin' | 'facebook' | 'instagram' | 'gbp';

export type ContentTheme =
  | 'missed_call_problem'
  | 'speed_to_lead'
  | 'case_study'
  | 'the_47_hour_gap'
  | 'saturday_night'
  | 'roi_math'
  | 'competitor_intel'
  | 'behind_the_build';

export interface Post {
  platform: Platform;
  day: 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  theme: ContentTheme;
  caption: string;
  hashtags: string[];
  imagePrompt: string;
  scheduledTime: string;
  approved: boolean;
  editNote?: string;
}

export interface WeeklyCalendar {
  weekOf: string;
  theme: ContentTheme;
  themeLabel: string;
  posts: Post[];
  approvalToken: string;
}

export const THEME_CYCLE: ContentTheme[] = [
  'missed_call_problem',
  'speed_to_lead',
  'case_study',
  'the_47_hour_gap',
  'saturday_night',
  'roi_math',
  'competitor_intel',
  'behind_the_build',
];

export const THEME_LABELS: Record<ContentTheme, string> = {
  missed_call_problem: 'The Missed Call Problem',
  speed_to_lead: 'Speed to Lead',
  case_study: 'Case Study & Results',
  the_47_hour_gap: 'The 47-Hour Gap',
  saturday_night: 'Saturday Night Scenario',
  roi_math: 'ROI Math',
  competitor_intel: 'Competitor Intel',
  behind_the_build: 'Behind the Build',
};

export const POST_SCHEDULE: { day: Post['day']; platform: Platform; time: string }[] = [
  { day: 'Tuesday',   platform: 'linkedin',   time: '08:00' },
  { day: 'Tuesday',   platform: 'instagram',  time: '11:00' },
  { day: 'Wednesday', platform: 'facebook',   time: '09:00' },
  { day: 'Thursday',  platform: 'linkedin',   time: '08:00' },
  { day: 'Thursday',  platform: 'instagram',  time: '11:00' },
  { day: 'Friday',    platform: 'facebook',   time: '09:00' },
  { day: 'Friday',    platform: 'instagram',  time: '12:00' },
];

export const ATLANTA_METRO: Record<string, string[]> = {
  Gwinnett: ['Lawrenceville', 'Duluth', 'Snellville', 'Suwanee', 'Buford', 'Norcross', 'Lilburn', 'Loganville', 'Grayson', 'Dacula'],
  Cobb: ['Marietta', 'Smyrna', 'Kennesaw', 'Acworth', 'Powder Springs', 'Austell', 'Mableton', 'Vinings'],
  Fulton: ['Alpharetta', 'Roswell', 'Sandy Springs', 'Johns Creek', 'Milton', 'Atlanta', 'Buckhead'],
  DeKalb: ['Decatur', 'Tucker', 'Stone Mountain', 'Chamblee', 'Dunwoody', 'Brookhaven'],
  Cherokee: ['Canton', 'Woodstock', 'Ball Ground', 'Holly Springs'],
  Forsyth: ['Cumming', 'Gainesville'],
  Henry: ['McDonough', 'Stockbridge'],
  Douglas: ['Douglasville', 'Lithia Springs'],
  Fayette: ['Peachtree City', 'Fayetteville'],
  Rockdale: ['Conyers'],
};
