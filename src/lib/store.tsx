import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { NOTIFICATIONS, type Comment, type Community, type Notification, type Post, type Reaction } from "./mock-data";
import { supabase } from "@/integrations/supabase/client";
import { whoami, claimUsername, ping } from "./auth.functions";
import {
  listFeed,
  listComments as listCommentsFn,
  createPost as createPostFn,
  votePost as votePostFn,
  reactToPost as reactToPostFn,
  votePoll as votePollFn,
  addComment as addCommentFn,
  createCommunity as createCommunityFn,
} from "./live.functions";

type UserVote = 1 | -1 | 0;

type Identity = { id: string; username: string } | null;

type State = {
  posts: Post[];
  comments: Record<string, Comment[]>;
  votes: Record<string, UserVote>;
  commentVotes: Record<string, UserVote>;
  userReactions: Record<string, Reaction | null>;
  saved: Record<string, boolean>;
  pollVotes: Record<string, number>;
  notifications: Notification[];
  identity: { username: string; ghost: boolean; id?: string };
  communities: Community[];
  rooms: any[];
  onlineCount: number;
  needsUsername: boolean;
  authReady: boolean;
};

function mapDbPost(row: any): Post {
  const created = new Date(row.created_at);
  const ageMs = Date.now() - created.getTime();
  const age =
    ageMs < 60_000 ? "now" :
    ageMs < 3600_000 ? `${Math.floor(ageMs / 60_000)}m` :
    ageMs < 86_400_000 ? `${Math.floor(ageMs / 3600_000)}h` :
    `${Math.floor(ageMs / 86_400_000)}d`;
  return {
    id: row.id,
    community: row.community_slug,
    author: row.author_username,
    anonymous: row.anonymous,
    age,
    title: row.title,
    body: row.body,
    tags: row.tags ?? [],
    type: row.type,
    image: row.image,
    poll: row.poll,
    voice: row.voice,
    upvotes: row.upvotes,
    comments: row.comments_count,
    reactions: row.reactions ?? {},
    nsfw: row.nsfw,
    pinned: row.pinned,
    created_at: row.created_at,
  };
}

function mapDbComment(row: any): Comment {
  const created = new Date(row.created_at);
  const ageMs = Date.now() - created.getTime();
  const age =
    ageMs < 60_000 ? "now" :
    ageMs < 3600_000 ? `${Math.floor(ageMs / 60_000)}m` :
    ageMs < 86_400_000 ? `${Math.floor(ageMs / 3600_000)}h` :
    `${Math.floor(ageMs / 86_400_000)}d`;
  return {
    id: row.id,
    author: row.author_username,
    anonymous: row.anonymous,
    age,
    body: row.body,
    upvotes: row.upvotes,
  };
}

function nestComments(rows: any[]): Comment[] {
  const map = new Map<string, Comment & { _parent?: string | null }>();
  rows.forEach((r) => map.set(r.id, { ...mapDbComment(r), _parent: r.parent_id, replies: [] as any }));
  const roots: Comment[] = [];
  map.forEach((c) => {
    if (c._parent && map.has(c._parent)) {
      const parent = map.get(c._parent)!;
      (parent as any).replies = [...((parent as any).replies ?? []), c];
    } else {
      roots.push(c as Comment);
    }
  });
  return roots;
}

const initialState = (): State => ({
  posts: POSTS,
  comments: { p1: COMMENTS },
  votes: {},
  commentVotes: {},
  userReactions: {},
  saved: {},
  pollVotes: {},
  notifications: NOTIFICATIONS,
  identity: { username: "Ghost", ghost: true },
});

type Ctx = State & {
  vote: (postId: string, dir: 1 | -1) => void;
  voteComment: (commentId: string, dir: 1 | -1) => void;
  react: (postId: string, reaction: Reaction) => void;
  toggleSave: (postId: string) => void;
  votePoll: (postId: string, optionIndex: number) => void;
  addPost: (input: NewPostInput) => Promise<Post>;
  addComment: (postId: string, body: string, parentId?: string) => Promise<void>;
  loadComments: (postId: string) => Promise<void>;
  createCommunity: (c: { slug: string; name: string; malayalam?: string; description?: string; icon?: string; color?: string }) => Promise<void>;
  markAllRead: () => void;
  setIdentity: (i: { username: string; ghost: boolean }) => void;
  claim: (username: string) => Promise<void>;
  refresh: () => Promise<void>;
};

export type NewPostInput = {
  community: string;
  title: string;
  body?: string;
  type: Post["type"];
  anonymous: boolean;
  nsfw?: boolean;
  tags?: string[];
  poll?: { option: string; votes: number }[];
  voice?: { duration: number; src?: string };
  image?: string;
};

const StoreContext = createContext<Ctx | null>(null);

const initialState = (): State => ({
  posts: [],
  comments: {},
  votes: {},
  commentVotes: {},
  userReactions: {},
  saved: {},
  pollVotes: {},
  notifications: NOTIFICATIONS,
  identity: { username: "Ghost", ghost: true },
  communities: [],
  rooms: [],
  onlineCount: 0,
  needsUsername: false,
  authReady: false,
});

const LOCAL_KEY = "samsarikan:local-prefs:v1";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const realtimeReady = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const feed = await listFeed();
      setState((s) => ({
        ...s,
        posts: (feed.posts ?? []).map(mapDbPost),
        communities: (feed.communities ?? []) as Community[],
        rooms: feed.rooms ?? [],
        onlineCount: feed.onlineCount ?? 0,
      }));
    } catch (e) {
      console.error("listFeed failed", e);
    }
  }, []);

  // Auth bootstrap + initial fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await whoami({ data: {} as any });
        if (cancelled) return;
        if (r.authenticated && r.identity) {
          setState((s) => ({ ...s, identity: { username: r.identity.username, ghost: false, id: r.identity.id }, needsUsername: false, authReady: true }));
        } else {
          setState((s) => ({ ...s, needsUsername: true, authReady: true }));
        }
      } catch {
        setState((s) => ({ ...s, authReady: true, needsUsername: true }));
      }
      await refresh();
    })();
    return () => { cancelled = true; };
  }, [refresh]);

  // Realtime subscription
  useEffect(() => {
    const ch = supabase
      .channel("samsarikan-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "communities" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "live_rooms" }, () => refresh())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, (payload: any) => {
        const pid = payload.new?.post_id;
        if (pid) {
          loadCommentsRef.current?.(pid);
        }
      })
      .subscribe();
    realtimeReady.current = true;
    return () => { supabase.removeChannel(ch); };
  }, [refresh]);

  // Heartbeat
  useEffect(() => {
    if (!state.identity.id) return;
    const t = setInterval(() => { ping({ data: {} as any }).catch(() => {}); }, 30_000);
    return () => clearInterval(t);
  }, [state.identity.id]);

  // Local-only prefs (saved/userReactions/votes/pollVotes are server-tracked, but mirror locally for UI snappiness)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        setState((s) => ({ ...s, saved: p.saved ?? {}, votes: p.votes ?? {}, userReactions: p.userReactions ?? {}, pollVotes: p.pollVotes ?? {} }));
      }
    } catch {}
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify({ saved: state.saved, votes: state.votes, userReactions: state.userReactions, pollVotes: state.pollVotes }));
    } catch {}
  }, [state.saved, state.votes, state.userReactions, state.pollVotes]);

  const loadComments = useCallback(async (postId: string) => {
    try {
      const { comments } = await listCommentsFn({ data: { post_id: postId } });
      const nested = nestComments(comments);
      setState((s) => ({ ...s, comments: { ...s.comments, [postId]: nested } }));
    } catch (e) { console.error(e); }
  }, []);
  const loadCommentsRef = useRef(loadComments);
  loadCommentsRef.current = loadComments;

  const vote = useCallback((postId: string, dir: 1 | -1) => {
    setState((s) => {
      const prev = s.votes[postId] ?? 0;
      const next: UserVote = prev === dir ? 0 : dir;
      const delta = next - prev;
      // fire-and-forget server vote
      votePostFn({ data: { post_id: postId, dir: next } }).catch(console.error);
      return {
        ...s,
        votes: { ...s.votes, [postId]: next },
        posts: s.posts.map((p) => (p.id === postId ? { ...p, upvotes: p.upvotes + delta } : p)),
      };
    });
  }, []);

  const voteComment = useCallback((commentId: string, dir: 1 | -1) => {
    setState((s) => {
      const prev = s.commentVotes[commentId] ?? 0;
      const next: UserVote = prev === dir ? 0 : dir;
      return { ...s, commentVotes: { ...s.commentVotes, [commentId]: next } };
    });
  }, []);

  const react = useCallback((postId: string, reaction: Reaction) => {
    setState((s) => {
      const prev = s.userReactions[postId] ?? null;
      const sameClicked = prev === reaction;
      const nextReaction = sameClicked ? null : reaction;
      reactToPostFn({ data: { post_id: postId, reaction: nextReaction } }).catch(console.error);
      return {
        ...s,
        userReactions: { ...s.userReactions, [postId]: nextReaction },
        posts: s.posts.map((p) => {
          if (p.id !== postId) return p;
          const reactions = { ...(p.reactions ?? {}) };
          if (prev) reactions[prev] = Math.max(0, (reactions[prev] ?? 1) - 1);
          if (nextReaction) reactions[nextReaction] = (reactions[nextReaction] ?? 0) + 1;
          return { ...p, reactions };
        }),
      };
    });
  }, []);

  const toggleSave = useCallback((postId: string) => {
    setState((s) => ({ ...s, saved: { ...s.saved, [postId]: !s.saved[postId] } }));
  }, []);

  const votePoll = useCallback((postId: string, optionIndex: number) => {
    setState((s) => {
      const prev = s.pollVotes[postId];
      if (prev === optionIndex) return s;
      votePollFn({ data: { post_id: postId, option_index: optionIndex } }).catch(console.error);
      return {
        ...s,
        pollVotes: { ...s.pollVotes, [postId]: optionIndex },
        posts: s.posts.map((p) => {
          if (p.id !== postId || !p.poll) return p;
          const poll = p.poll.map((o, i) => {
            let v = o.votes;
            if (prev === i) v -= 1;
            if (i === optionIndex) v += 1;
            return { ...o, votes: v };
          });
          return { ...p, poll };
        }),
      };
    });
  }, []);

  const addPost = useCallback(async (input: NewPostInput): Promise<Post> => {
    const { post } = await createPostFn({
      data: {
        community_slug: input.community,
        title: input.title,
        body: input.body ?? null,
        type: input.type,
        anonymous: input.anonymous,
        nsfw: input.nsfw ?? false,
        tags: input.tags ?? [],
        image: input.image ?? null,
        poll: input.poll ?? null,
        voice: input.voice ?? null,
      } as any,
    });
    const mapped = mapDbPost(post);
    setState((s) => ({ ...s, posts: [mapped, ...s.posts.filter((p) => p.id !== mapped.id)] }));
    return mapped;
  }, []);

  const addComment = useCallback(async (postId: string, body: string, parentId?: string) => {
    await addCommentFn({ data: { post_id: postId, body, parent_id: parentId ?? null, anonymous: false } });
    await loadCommentsRef.current?.(postId);
    setState((s) => ({ ...s, posts: s.posts.map((p) => (p.id === postId ? { ...p, comments: p.comments + 1 } : p)) }));
  }, []);

  const createCommunity = useCallback(async (c: { slug: string; name: string; malayalam?: string; description?: string; icon?: string; color?: string }) => {
    await createCommunityFn({ data: c as any });
    await refresh();
  }, [refresh]);

  const claim = useCallback(async (username: string) => {
    const { identity } = await claimUsername({ data: { username } });
    setState((s) => ({ ...s, identity: { username: identity.username, ghost: false, id: identity.id }, needsUsername: false }));
  }, []);

  const markAllRead = useCallback(() => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, unread: false })) }));
  }, []);

  const setIdentity = useCallback((i: { username: string; ghost: boolean }) => {
    setState((s) => ({ ...s, identity: i }));
  }, []);

  const value = useMemo<Ctx>(
    () => ({ ...state, vote, voteComment, react, toggleSave, votePoll, addPost, addComment, loadComments, createCommunity, markAllRead, setIdentity, claim, refresh }),
    [state, vote, voteComment, react, toggleSave, votePoll, addPost, addComment, loadComments, createCommunity, markAllRead, setIdentity, claim, refresh],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}