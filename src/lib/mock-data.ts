export type Reaction = "mass" | "ayyo" | "tea" | "dead" | "flag" | "support";

export const REACTIONS: { key: Reaction; emoji: string; label: string }[] = [
  { key: "mass", emoji: "🔥", label: "Mass" },
  { key: "ayyo", emoji: "😭", label: "Ayyo" },
  { key: "tea", emoji: "☕", label: "Tea" },
  { key: "dead", emoji: "💀", label: "Dead" },
  { key: "flag", emoji: "🚩", label: "Red Flag" },
  { key: "support", emoji: "🫂", label: "Support" },
];

export type Community = {
  slug: string;
  name: string;
  malayalam: string | null;
  members?: number;
  online?: number;
  description: string | null;
  color: string | null;
  icon: string | null;
};

export const COMMUNITIES: Community[] = [
  { slug: "naatile-tea", name: "Naatile Tea", malayalam: "നാട്ടിലെ ചായ", members: 84210, online: 1240, description: "Local gossip, neighbourhood drama, naadan stories.", color: "from-amber-500 to-red-500", icon: "☕" },
  { slug: "midnight-thoughts", name: "Midnight Thoughts", malayalam: "രാത്രി ചിന്തകൾ", members: 52301, online: 980, description: "3am confessions and overthinking, anonymously.", color: "from-rose-500 to-purple-500", icon: "🌙" },
  { slug: "kerala-memes", name: "Malayalam Memes", malayalam: "മലയാളം മീമുകൾ", members: 192480, online: 4321, description: "Dank Malayalam memes only. Mass adi guaranteed.", color: "from-red-500 to-amber-400", icon: "💀" },
  { slug: "college-confessions", name: "College Confessions", malayalam: "കോളേജ് കുമ്പസാരം", members: 38120, online: 612, description: "Crushes, profs, hostel drama. No screenshots out.", color: "from-pink-500 to-red-500", icon: "🎓" },
  { slug: "kerala-politics", name: "Kerala Politics", malayalam: "കേരള രാഷ്ട്രീയം", members: 67890, online: 1502, description: "Debate civilly. We will mute the chayakada arguments.", color: "from-orange-500 to-red-600", icon: "🗳️" },
  { slug: "riders-kerala", name: "Riders Kerala", malayalam: "റൈഡേഴ്സ്", members: 41020, online: 320, description: "Bikes, ride plans, ghat roads, fuel rants.", color: "from-yellow-500 to-red-500", icon: "🏍️" },
  { slug: "tech-malayalam", name: "Tech Malayalam", malayalam: "ടെക് മലയാളം", members: 28430, online: 410, description: "Devs of Kerala, founders, builders, freshers.", color: "from-amber-400 to-orange-500", icon: "💻" },
  { slug: "gaming-kerala", name: "Gaming Kerala", malayalam: "ഗെയിമിങ്", members: 33210, online: 880, description: "BGMI, Valorant, FC, retro — all welcome.", color: "from-red-600 to-pink-500", icon: "🎮" },
  { slug: "relationship-help", name: "Relationship Help", malayalam: "ബന്ധങ്ങൾ", members: 24310, online: 540, description: "Anonymous heart-to-heart. No judging.", color: "from-rose-400 to-red-500", icon: "💔" },
  { slug: "kochi", name: "Kochi", malayalam: "കൊച്ചി", members: 19800, online: 240, description: "Everything Kochi — traffic, food, events.", color: "from-amber-500 to-orange-600", icon: "🌆" },
];

export type Post = {
  id: string;
  community: string;
  author: string;
  anonymous: boolean;
  age: string;
  title: string;
  body?: string | null;
  tags?: string[];
  type: "text" | "image" | "poll" | "voice" | "meme" | "confession";
  image?: string | null;
  poll?: { option: string; votes: number }[] | null;
  voice?: { duration: number; src?: string } | null;
  upvotes: number;
  comments: number;
  reactions: Partial<Record<Reaction, number>>;
  nsfw?: boolean;
  pinned?: boolean;
  created_at?: string;
};

export const POSTS: Post[] = [
  {
    id: "p1",
    community: "naatile-tea",
    author: "ChayakadaAunty",
    anonymous: true,
    age: "12m",
    title: "Ente neighbour aunty enthino ennale rathri 2 manikku terrace il poyi nilkkunnathu kandu 👀",
    body: "Daily ithu thanne kazhinju 3 divasamayi. Innu njaan terrace il poyi nokkiyappol avar phone il vere oru aalkku message ayakkunnu. Aaranennu ariyilla but ente husbandinod parayanam ennundu. Engane parayum?\n\nUpdate: Avar ente bharthavu thanne ayirunnu 💀",
    tags: ["gossip", "drama", "kerala"],
    type: "confession",
    upvotes: 12420,
    comments: 842,
    reactions: { mass: 3210, dead: 8420, tea: 2410, ayyo: 1280 },
  },
  {
    id: "p2",
    community: "kerala-memes",
    author: "MeemKaaran",
    anonymous: false,
    age: "1h",
    title: "When amma asks why your phone battery drained at 3am",
    type: "meme",
    image: "gradient-1",
    tags: ["meme", "relatable"],
    upvotes: 8920,
    comments: 312,
    reactions: { dead: 5210, mass: 2120 },
  },
  {
    id: "p3",
    community: "midnight-thoughts",
    author: "Anonymous",
    anonymous: true,
    age: "3h",
    title: "I think I've been pretending to be okay for so long that I forgot what okay feels like.",
    body: "Job nallapole pokunnu. Family aniyathila ariyunnu. But ororo rathriyum mone, en mind shut off avathilla. Sometimes I wish I could just disappear for a week. No phone, no people, no expectations.\n\nDoes anyone else feel this?",
    type: "confession",
    tags: ["mental-health", "vent"],
    upvotes: 24100,
    comments: 1820,
    reactions: { support: 18420, ayyo: 4210, tea: 820 },
    pinned: true,
  },
  {
    id: "p4",
    community: "kerala-politics",
    author: "PoliticsPundit",
    anonymous: false,
    age: "5h",
    title: "Hypothetical: If LDF and UDF merged, what would the party symbol be?",
    type: "poll",
    tags: ["debate", "fun"],
    poll: [
      { option: "Half hammer, half hand", votes: 1240 },
      { option: "A confused elephant", votes: 4820 },
      { option: "Just a chayakkada", votes: 8420 },
      { option: "Nothing — they'll fight before merging", votes: 12420 },
    ],
    upvotes: 4210,
    comments: 920,
    reactions: { dead: 2410, mass: 820, flag: 412 },
  },
  {
    id: "p5",
    community: "college-confessions",
    author: "HostelGhost",
    anonymous: true,
    age: "6h",
    title: "Voice confession: I lied to my best friend about my CGPA for 2 years 🎙️",
    type: "voice",
    voice: { duration: 47 },
    tags: ["confession", "voice"],
    upvotes: 6210,
    comments: 410,
    reactions: { dead: 2820, ayyo: 1820, support: 920 },
  },
  {
    id: "p6",
    community: "tech-malayalam",
    author: "DevAnna",
    anonymous: false,
    age: "8h",
    title: "Quit my 28LPA Bangalore job to build a startup in Kochi. AMA after 6 months.",
    body: "Rent kuranju. Family ariyilla. Co-founder ennod kalakkanam ennu paranju. But mone, ente mental health ippol best aanu. Coffee kudichu, beach il poyi, code cheyyunnu.\n\nAsk me anything.",
    tags: ["ama", "startup", "kochi"],
    type: "text",
    upvotes: 9820,
    comments: 1240,
    reactions: { mass: 6210, support: 2820, tea: 820 },
  },
  {
    id: "p7",
    community: "riders-kerala",
    author: "GhatRider",
    anonymous: false,
    age: "11h",
    title: "Munnar trip plan — 14 riders, 2 days, ₹3500 budget. Drop screenshots in comments.",
    type: "text",
    body: "Saturday 5am Kochi start. Sunday night return. Petrol split, stay split. First 14 confirmations only.",
    tags: ["ride", "munnar"],
    upvotes: 1420,
    comments: 220,
    reactions: { mass: 810, flag: 12 },
  },
  {
    id: "p8",
    community: "relationship-help",
    author: "Anonymous",
    anonymous: true,
    age: "14h",
    title: "Avar ente best friend nu propose cheythu. Njaan 4 varsham ayi avare ishtapettirunnu.",
    body: "Friend nokku ariyaayirunnu. But avar ennod onnum paranjilla. Ippol enikku rendu perodum mindaan thonnunnilla. Engane forgive cheyyum?",
    type: "confession",
    tags: ["heartbreak"],
    upvotes: 18420,
    comments: 2410,
    reactions: { ayyo: 12410, support: 8210, dead: 1240 },
  },
];

export type Comment = {
  id: string;
  author: string;
  anonymous: boolean;
  age: string;
  body: string;
  upvotes: number;
  replies?: Comment[];
  pinned?: boolean;
};

export const COMMENTS: Comment[] = [
  {
    id: "c1",
    author: "ModNinja",
    anonymous: false,
    age: "10m",
    pinned: true,
    body: "Pinned by mods 📌 — Please remember: no screenshots out of this community. Respect anonymity.",
    upvotes: 412,
  },
  {
    id: "c2",
    author: "ChayaPriya",
    anonymous: false,
    age: "8m",
    body: "Plot twist of the century 💀 njaan kaapikku peshu peshu ennu thinking parinje irunnu, last line kandu coffee mukhathekku theratti.",
    upvotes: 2410,
    replies: [
      {
        id: "c2-1",
        author: "Anonymous",
        anonymous: true,
        age: "6m",
        body: "Same energy. I had to scroll back twice to confirm. OP, you okay??",
        upvotes: 820,
        replies: [
          {
            id: "c2-1-1",
            author: "ChayakadaAunty",
            anonymous: true,
            age: "4m",
            body: "Honestly? No. But the support here is helping. Thank you for reading 🫂",
            upvotes: 1240,
          },
        ],
      },
      {
        id: "c2-2",
        author: "DramaQueen",
        anonymous: false,
        age: "5m",
        body: "This is the Malayalam Netflix special I never knew I needed.",
        upvotes: 312,
      },
    ],
  },
  {
    id: "c3",
    author: "Anonymous",
    anonymous: true,
    age: "12m",
    body: "Sending strength OP. Whatever you decide, this community has your back. Ee aalkkar evideyum undakum.",
    upvotes: 1820,
    replies: [
      {
        id: "c3-1",
        author: "NightOwl",
        anonymous: false,
        age: "9m",
        body: "+1. DM open aanu if you want to talk.",
        upvotes: 412,
      },
    ],
  },
  {
    id: "c4",
    author: "MemeMaster",
    anonymous: false,
    age: "20m",
    body: "Bro pls drop a part 2 we're invested now 🍿",
    upvotes: 920,
  },
];

export type LiveRoom = {
  id: string;
  title: string;
  topic: string;
  listeners: number;
  hosts: string[];
  color: string;
  live: boolean;
};

export const LIVE_ROOMS: LiveRoom[] = [
  { id: "r1", title: "Late Night Talks", topic: "Insomnia gang, reporting in", listeners: 412, hosts: ["NightOwl", "ChayaPriya", "+3"], color: "from-purple-600 to-rose-500", live: true },
  { id: "r2", title: "Relationship Roast", topic: "Bring your texts, we'll decode", listeners: 1240, hosts: ["DramaQueen", "+8"], color: "from-rose-500 to-red-500", live: true },
  { id: "r3", title: "Politics Debate", topic: "Civil only. Mics on rotation.", listeners: 820, hosts: ["PoliticsPundit", "+5"], color: "from-orange-500 to-red-600", live: true },
  { id: "r4", title: "Meme Lab", topic: "Live caption challenges", listeners: 312, hosts: ["MeemKaaran", "+2"], color: "from-amber-400 to-red-500", live: true },
];

export type Notification = {
  id: string;
  type: "reply" | "reaction" | "mention" | "follow" | "trending";
  actor: string;
  text: string;
  age: string;
  unread: boolean;
};

export const NOTIFICATIONS: Notification[] = [
  { id: "n1", type: "reaction", actor: "412 people", text: "reacted 🔥 to your post in r/naatile-tea", age: "2m", unread: true },
  { id: "n2", type: "reply", actor: "ChayaPriya", text: "replied to your comment: 'Bro this is unhinged 💀'", age: "8m", unread: true },
  { id: "n3", type: "mention", actor: "@DramaQueen", text: "mentioned you in Midnight Thoughts", age: "32m", unread: true },
  { id: "n4", type: "trending", actor: "Your post", text: "is trending in Kerala — currently #3 🔥", age: "1h", unread: false },
  { id: "n5", type: "follow", actor: "NightOwl", text: "started following you", age: "3h", unread: false },
  { id: "n6", type: "reply", actor: "ModNinja", text: "approved your post in r/college-confessions", age: "5h", unread: false },
];

export const TRENDING_TAGS = ["#naatiletea", "#midnightthoughts", "#malayalammemes", "#collegelife", "#breakup", "#kochifloods", "#KSRTC", "#BGMI"];

export const ME = {
  username: "TeaConnoisseur",
  malayalam: "ചായ പ്രേമി",
  bio: "Night owl 🦉 · Confession enjoyer · Mass adi by day, ayyo by night",
  karma: 28420,
  rank: "Tea Master",
  xp: 7820,
  xpToNext: 10000,
  badges: ["🔥 Viral x3", "🌙 100 Night Posts", "☕ OG Tea", "🫂 Empath"],
  streak: 47,
  joined: COMMUNITIES.slice(0, 6),
};
