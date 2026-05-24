import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { COMMENTS, NOTIFICATIONS, POSTS, type Comment, type Notification, type Post, type Reaction } from "./mock-data";

const STORAGE_KEY = "samsarikan:v1";

type UserVote = 1 | -1 | 0;

type State = {
  posts: Post[];
  comments: Record<string, Comment[]>; // postId -> comments
  votes: Record<string, UserVote>; // postId -> vote
  commentVotes: Record<string, UserVote>;
  userReactions: Record<string, Reaction | null>; // postId -> selected reaction
  saved: Record<string, boolean>;
  pollVotes: Record<string, number>; // postId -> option index
  notifications: Notification[];
  identity: { username: string; ghost: boolean };
};

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
  addPost: (input: NewPostInput) => Post;
  addComment: (postId: string, body: string, parentId?: string) => void;
  markAllRead: () => void;
  setIdentity: (i: { username: string; ghost: boolean }) => void;
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
  image?: string; // data url or gradient key
};

const StoreContext = createContext<Ctx | null>(null);

function load(): State {
  if (typeof window === "undefined") return initialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as Partial<State>;
    const base = initialState();
    // Merge user-created posts on top of seed posts
    const userPosts = (parsed.posts ?? []).filter((p) => !POSTS.find((s) => s.id === p.id));
    return {
      ...base,
      ...parsed,
      posts: [...userPosts, ...base.posts],
      comments: { ...base.comments, ...(parsed.comments ?? {}) },
    } as State;
  } catch {
    return initialState();
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initialState);

  // Hydrate from localStorage after mount (SSR-safe)
  useEffect(() => {
    setState(load());
  }, []);

  // Persist
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      // Only persist user-created posts + interaction state to keep storage small
      const userPosts = state.posts.filter((p) => !POSTS.find((s) => s.id === p.id));
      const toSave = { ...state, posts: userPosts };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {}
  }, [state]);

  const vote = useCallback((postId: string, dir: 1 | -1) => {
    setState((s) => {
      const prev = s.votes[postId] ?? 0;
      const next: UserVote = prev === dir ? 0 : dir;
      const delta = next - prev;
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

  const addPost = useCallback((input: NewPostInput): Post => {
    const id = "u" + Date.now().toString(36);
    const post: Post = {
      id,
      community: input.community,
      author: input.anonymous ? "Anonymous" : "TeaConnoisseur",
      anonymous: input.anonymous,
      age: "now",
      title: input.title,
      body: input.body,
      tags: input.tags,
      type: input.type,
      poll: input.poll,
      voice: input.voice,
      image: input.image,
      upvotes: 1,
      comments: 0,
      reactions: {},
      nsfw: input.nsfw,
    };
    setState((s) => ({
      ...s,
      posts: [post, ...s.posts],
      votes: { ...s.votes, [id]: 1 },
    }));
    return post;
  }, []);

  const addComment = useCallback((postId: string, body: string, parentId?: string) => {
    setState((s) => {
      const newC: Comment = {
        id: "uc" + Date.now().toString(36),
        author: s.identity.ghost ? "Anonymous" : s.identity.username,
        anonymous: s.identity.ghost,
        age: "now",
        body,
        upvotes: 1,
      };
      const existing = s.comments[postId] ?? [];
      let updated: Comment[];
      if (parentId) {
        const insert = (list: Comment[]): Comment[] =>
          list.map((c) =>
            c.id === parentId
              ? { ...c, replies: [...(c.replies ?? []), newC] }
              : { ...c, replies: c.replies ? insert(c.replies) : c.replies },
          );
        updated = insert(existing);
      } else {
        updated = [newC, ...existing];
      }
      return {
        ...s,
        comments: { ...s.comments, [postId]: updated },
        posts: s.posts.map((p) => (p.id === postId ? { ...p, comments: p.comments + 1 } : p)),
      };
    });
  }, []);

  const markAllRead = useCallback(() => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, unread: false })) }));
  }, []);

  const setIdentity = useCallback((i: { username: string; ghost: boolean }) => {
    setState((s) => ({ ...s, identity: i }));
  }, []);

  const value = useMemo<Ctx>(
    () => ({ ...state, vote, voteComment, react, toggleSave, votePoll, addPost, addComment, markAllRead, setIdentity }),
    [state, vote, voteComment, react, toggleSave, votePoll, addPost, addComment, markAllRead, setIdentity],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}