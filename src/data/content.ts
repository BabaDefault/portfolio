// ============================================================
// ALL SITE CONTENT LIVES HERE. Filled in from Jason's resume.
// Anything still marked [PLACEHOLDER] / [CHECK] needs your input.
// ============================================================

import type { IconName } from '../ui/ItemIcon';

export const site = {
  name: 'Jason',
  title: 'Jason Codes',
  subtitle: 'Survival · Hard Mode',
  version: 'v1.0.0',
  footer: 'Built by Jason Tjandra. Not affiliated with Mojang or Microsoft.',
};

export const splashes: string[] = [
  'Now with 100% more pixels!',
  '70 migrations deep!',
  'Offline-first!',
  'Powered by the Claude API!',
  'Ships on Fridays!',
  'Hackathon tested!',
  'Respawns in 0.3s!',
  'Bug-free! (citation needed)',
];

export const profile = {
  bio: 'Hey I\'m Jason, a Second-year student at UNSW doinc Computer Science. I am a passionate person with a strong interest in newly emerging tech/AI and building cool solutions. I enjoy building a variety of applications that are full stack and AI-powered.',
  avatarCaption: 'Jason Tjandra',
  traits: [
    { slot: 'helmet', label: 'Class', value: 'Full-Stack & AI Enthusiast' },
    { slot: 'chestplate', label: 'Level', value: 'CS Student · Year 2 (UNSW)' },
    { slot: 'leggings', label: 'Spawn', value: 'Sydney, NSW' },
    { slot: 'boots', label: 'Status', value: 'Online — open to opportunities' },
  ] as { slot: 'helmet' | 'chestplate' | 'leggings' | 'boots'; label: string; value: string }[],
  hotbarItems: ['Laptop', 'Coffee', 'Keyboard'],
};

export type Skill = {
  name: string;
  level: number; // 0–100 proficiency → potion fill
  tier: 'I' | 'II' | 'III' | 'IV' | 'V';
  color: string; // potion liquid color
  duration: string; // shown like a potion effect, e.g. "3+ yrs"
  detail: string;
};

// Levels are rough self-ratings for the potion fill. [CHECK] adjust to taste.
export const skills: Skill[] = [
  { name: 'TypeScript / JS', level: 88, tier: 'V', color: '#3a7bd5', duration: 'daily driver', detail: 'Main language across Origin Story, the Uni Management app and Signal.' },
  { name: 'React & Next.js', level: 86, tier: 'IV', color: '#4fc3f7', duration: '3 projects', detail: 'Next.js App Router, React, Tailwind CSS; also Three.js for 3D visuals.' },
  { name: 'React Native & Expo', level: 72, tier: 'III', color: '#6fbf4a', duration: 'offline-first', detail: 'Mobile + web app with TanStack Query, local storage and Vitest tests.' },
  { name: 'SQL & Postgres', level: 78, tier: 'IV', color: '#f4c542', duration: '70 migrations', detail: 'Postgres schemas, Supabase Auth and row-level security, MySQL, recursive CTEs.' },
  { name: 'AI & LLM APIs', level: 76, tier: 'IV', color: '#a970ff', duration: 'Claude API', detail: 'Claude API with zod-validated structured output, usage tracking, Qdrant vectors.' },
  { name: 'Python', level: 65, tier: 'III', color: '#e86ab0', duration: 'data & tooling', detail: 'pandas, NumPy, Matplotlib, plus scripting such as a markdown wiki linter.' },
  { name: 'Java & C', level: 62, tier: 'III', color: '#d9534f', duration: 'UNSW courses', detail: 'Data structures & algorithms and object-oriented design coursework.' },
  { name: 'Node & Express', level: 70, tier: 'III', color: '#7cbd4e', duration: 'backends', detail: 'Express APIs, server-side routes, Vercel deploys from Git.' },
];

export type Project = {
  id: string;
  name: string;
  summary: string;
  description: string;
  year: string;
  mode: 'Survival' | 'Creative' | 'Hardcore' | 'Adventure';
  tags: string[];
  thumb: { sky: string; ground: string }; // colors for the code-drawn world thumbnail
  live?: string;
  repo?: string;
};

// [CHECK] add live/repo links where they exist; buttons stay disabled while a link is missing.
export const projects: Project[] = [
  {
    id: 'origin-story', name: 'Origin Story™', summary: 'Live coaching platform used by 20 clients and staff.',
    description: 'Lead developer, rebuilding and extending the founder\'s prototype with Next.js App Router and Supabase, adding a video curriculum and new tools. Integrated the Claude API behind a server-side route for AI script reviews and idea coaching, with zod-validated structured output and per-user LLM usage tracking. Designed a Postgres schema across 70 versioned SQL migrations, using Supabase Auth and row-level security to separate client, CSM and admin access; deployed on Vercel with auto-deploys from Git.',
    year: 'Aug 2026 – now', mode: 'Survival', tags: ['Next.js', 'React', 'Tailwind', 'Postgres', 'Claude API', 'Vercel'],
    thumb: { sky: '#f6b26b', ground: '#5d9c3a' },
  },
  {
    id: 'uni-management', name: 'Uni Management System', summary: 'Offline-first app to track subtopic mastery per subject and week.',
    description: 'Mobile and web app that tracks subtopic mastery on a four-level scale, with bulk import of pasted course outlines. Parses myUNSW iCal timetable feeds (recurrence rules, timezones) with local storage and JSON backup, and covers edge cases like Flexibility Week and daylight saving with Vitest unit tests. Also adapted an open-source Claude Code learning workflow into a personal Obsidian course wiki, with custom skills for note ingestion and exam tracking, plus a Python linter for broken wikilinks, missing images and frontmatter errors.',
    year: 'Sep 2026 – now', mode: 'Creative', tags: ['React Native', 'Expo', 'TypeScript', 'TanStack Query', 'Vitest'],
    thumb: { sky: '#7ec0ee', ground: '#4f9a33' },
  },
  {
    id: 'signal', name: 'Signal: AI Security Scanner', summary: 'Repo security scanner built at FoundersHack 2026.',
    description: 'Scans repos for leaked secrets, injection flaws and misconfigurations, built in a team of 4 at the FoundersHack 2026 hackathon. I co-designed the architecture, built the interactive 3D attack-chain graph (Three.js, Next.js) that shows how linked findings combine into exploitable paths, and implemented compliance scoring modelled on SOC 2, OWASP and GDPR with PDF export. It sits alongside the team\'s OpenAI-powered fix suggestions and a Qdrant layer that suppresses near-duplicate false positives.',
    year: 'Mar 2026', mode: 'Hardcore', tags: ['Next.js', 'Three.js', 'Express', 'MySQL', 'Qdrant'],
    thumb: { sky: '#3b1d4f', ground: '#6b2a2a' },
  },
  {
    id: 'portfolio', name: 'Jason Codes', summary: 'This Minecraft-themed portfolio.',
    description: 'A game-UI portfolio: hotbar navigation, a 3D player built from my own skin (three.js), animated effects layered on custom backgrounds, and sounds synthesized with the Web Audio API.',
    year: '2026', mode: 'Adventure', tags: ['React', 'TypeScript', 'three.js', 'Vite'],
    thumb: { sky: '#7ec0ee', ground: '#5d9c3a' },
  },
];

export type JourneyStop = {
  id: string;
  period: string;
  title: string;
  place: string;
  description: string;
  icon: 'compass' | 'pickaxe' | 'book' | 'chest' | 'star';
};

export const journey: JourneyStop[] = [
  { id: 'tutor', period: 'Jan 2025', title: 'Tutor', place: 'Pre-Uni College, Sydney', description: 'Teaching 20–30 students a week (Years 1–6) in maths, thinking skills, reading and writing, running practice selective tests with one-on-one reviews, and keeping parents updated on progress.', icon: 'book' },
  { id: 'unsw', period: '2025', title: 'Started at UNSW', place: 'B. Computer Science (2025 – 2028)', description: 'Coursework so far includes Data Structures & Algorithms, OO Design, Software Engineering Fundamentals, Database Systems, AI, and Machine Learning & Data Mining.', icon: 'compass' },
  { id: 'foundershack', period: 'Mar 2026', title: 'FoundersHack 2026', place: 'Team of 4 · Signal', description: 'Built an AI security scanner over a hackathon: 3D attack-chain graph, compliance scoring and PDF export.', icon: 'star' },
  { id: 'origin-story', period: 'Aug 2026', title: 'Lead Developer', place: 'Origin Story™', description: 'Leading development of a live coaching platform used by 20 clients and staff, with Next.js, Supabase and the Claude API.', icon: 'pickaxe' },
  { id: 'now', period: 'Now', title: 'Building', place: 'Uni Management System + more', description: 'Shipping an offline-first study tracker and levelling up through new frameworks and products.', icon: 'chest' },
];

export type Advancement = {
  id: string;
  title: string;
  description: string;
  icon: 'grass' | 'sword' | 'diamond' | 'book' | 'eye' | 'star' | 'trophy';
  unlocked: boolean;
  parent?: string; // id of parent node in the tree
  frame?: 'task' | 'goal' | 'challenge';
};

export const advancements: Advancement[] = [
  { id: 'root', title: 'Hello UNSW', description: 'Started a Bachelor of Computer Science.', icon: 'grass', unlocked: true, frame: 'task' },
  { id: 'teach', title: 'Taking Inventory', description: 'Tutoring 20–30 students every week.', icon: 'book', unlocked: true, parent: 'root', frame: 'task' },
  { id: 'hack', title: 'Hackathon Hero', description: 'Shipped Signal at FoundersHack 2026 in a team of 4.', icon: 'sword', unlocked: true, parent: 'root', frame: 'goal' },
  { id: 'live', title: 'Into the Wider World', description: 'Lead dev on a live platform used by 20 clients and staff.', icon: 'eye', unlocked: true, parent: 'hack', frame: 'goal' },
  { id: 'schema', title: 'Deep Diver', description: 'Designed a Postgres schema across 70 versioned migrations.', icon: 'diamond', unlocked: true, parent: 'live', frame: 'challenge' },
  { id: 'next', title: 'Free the End', description: 'Next up: a software engineering internship.', icon: 'trophy', unlocked: false, parent: 'live', frame: 'challenge' },
];

export type QuestType = 'building' | 'learning' | 'reading' | 'hackathon' | 'open-source';

export type ActiveQuest = {
  title: string;
  type: QuestType;
  detail: string;
  link?: string;
};

/** What I'm building, learning or reading right now: pinned notes on the Quest Board. */
export const activeQuests: ActiveQuest[] = [
  { title: 'Origin Story™', type: 'building', detail: 'I am still actively developing Origin Story, whether its new tools or features, something new is always waiting to be developed' },
  { title: 'Self-Made Notes App', type: 'building', detail: 'I plan to make my own notetaking app and host it on my computer, I want to combine the notetaking features of Notion with the Maintenance features of Obsidian' },
  { title: 'Machine Learning', type: 'learning', detail: 'I\m currently learning the various concepts of Machine Learning for one of my courses, I am planning to also build a predictive project with this knowledge in the future' },
  { title: 'Next Hackathon', type: 'hackathon', detail: 'I\'m always looking for new Hackathons and opportunities to build cool things!' },
];

export type SideQuest = {
  title: string;
  detail: string;
  icon: IconName;
};

/** Hobbies & life outside the editor. */
export const sideQuests: SideQuest[] = [
  { title: 'Gaming', detail: 'I grew up watching alot of Minecraft as you can seeand was addicted to it during highschool as you. Now I mainly play Valorant and League of Legends', icon: 'craft-keyboard' },
  { title: 'Gym', detail: 'Started going again this year after being very inconsistent throughout highschool', icon: 'heart' },
  { title: 'Eating', detail: 'I LOVE eating, I enjoy trying new places and eating out whenever I can. Asian cuisine is my favourite (especially Malatang)', icon: 'hunger' },
  { title: 'Going Out', detail: 'I always enjoy spending time out with my friends, whether its just for a quick feed or walking around the same area for 3 hours', icon: 'contact-location' },
];

export const contact = {
  email: 'jason.c.tjandra@gmail.com',
  location: 'Sydney, NSW',
  links: [
    { command: '/email', label: 'jason.c.tjandra@gmail.com', href: 'mailto:jason.c.tjandra@gmail.com' },
    { command: '/linkedin', label: 'linkedin.com/in/your-handle', href: 'https://www.linkedin.com/in/jason-tjandra-272073306/' },
    { command: '/github', label: 'github.com/your-handle', href: 'https://github.com/BabaDefault' },
  ],
  replyTime: 'I usually reply within a day or two :D',
};

export const credits = {
  heading: 'Thanks for playing',
  lines: [
    'You reached the end of my portfolio.',
    'I really appreciate the time',
    'You\'ve spent reading it!',
    'But....',
    'Every world has another seed.',
    'Somewhere... ',
    'A new idea is waiting',
    'Waiting to be made!'
  ],
  roles: [
    { role: 'Design & Code', name: 'Jason Tjandra' },
    { role: 'Sound', name: 'Web Audio API' },
    { role: 'Pixels', name: 'Hand-placed' },
  ],
};
