import { useState, useEffect, useRef } from "react";
import { Heart, MessageCircle, Share2, Plus, Image, MapPin, Tag, X, MessageSquare, Loader2, Trash2, MoreHorizontal } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import DesktopLayout from "@/components/DesktopLayout";
import heroImg from "@/assets/golf-hero.jpg";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "things_to_do", label: "Things to Do" },
  { value: "tournament", label: "Tournament" },
  { value: "tips", label: "Tips" },
  { value: "gear", label: "Gear" },
];

const NewsFeed = ({ embedded = false }: { embedded?: boolean }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [posting, setPosting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [taggedCourseId, setTaggedCourseId] = useState<string | null>(null);
  const [taggedCourseName, setTaggedCourseName] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [showCourseSheet, setShowCourseSheet] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [submittingComments, setSubmittingComments] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["feed-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, profiles:author_id(full_name, avatar_url, handicap, members(clubs(name))))")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: myChannels } = useQuery({
    queryKey: ["my-channels-for-post", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from("channel_follows")
        .select("*, channels(*)")
        .eq("user_id", userId);
      return (data ?? []).map((f: any) => f.channels).filter(Boolean);
    },
    enabled: !!userId,
  });

  const { data: courses } = useQuery({
    queryKey: ["courses-for-tag"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, name, location").order("name").limit(100);
      if (!data) return [];
      const seen = new Set<string>();
      return data.filter((c: any) => {
        const key = c.name.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
  });

  const { data: allComments } = useQuery({
    queryKey: ["post-comments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("post_comments")
        .select("*, profiles:author_id(full_name, avatar_url)")
        .order("created_at", { ascending: true });
      const grouped: Record<string, any[]> = {};
      (data ?? []).forEach(c => {
        if (!grouped[c.post_id]) grouped[c.post_id] = [];
        grouped[c.post_id].push(c);
      });
      return grouped;
    },
  });

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/posts/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      setPhotoUrl(publicUrl);
    } catch {
      toast.error("Failed to upload photo");
    }
    setUploadingPhoto(false);
  };

  const handlePost = async () => {
    if (!content.trim() && !photoUrl) return;
    if (!userId) return;
    setPosting(true);
    const { error } = await supabase.from("posts").insert({
      author_id: userId,
      content: content.trim(),
      category,
      image_url: photoUrl || null,
      course_id: taggedCourseId || null,
      channel_id: selectedChannelId || null,
    });
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Post published!");
    setContent("");
    setCategory("general");
    setPhotoUrl(null);
    setTaggedCourseId(null);
    setTaggedCourseName(null);
    setSelectedChannelId(null);
    setShowCreate(false);
    queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
  };

  const handleLike = async (postId: string) => {
    if (!userId) { toast.error("Please login first"); return; }
    const isLiked = likedPosts.has(postId);
    if (isLiked) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
      setLikedPosts(prev => { const s = new Set(prev); s.delete(postId); return s; });
    } else {
      const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
      if (!error) setLikedPosts(prev => new Set(prev).add(postId));
    }
    const { count } = await supabase.from("post_likes").select("id", { count: "exact", head: true }).eq("post_id", postId);
    await supabase.from("posts").update({ likes_count: count ?? 0 }).eq("id", postId);
    queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
  };

  const handleShare = async (postId: string, postContent: string) => {
    const url = `${window.location.origin}/news`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "GolfBuana", text: postContent.substring(0, 100), url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Hapus postingan ini?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", postId).eq("author_id", userId!);
    if (error) { toast.error("Gagal menghapus postingan"); return; }
    toast.success("Post deleted");
    queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
  };

  const handleSubmitComment = async (postId: string) => {
    const text = commentTexts[postId]?.trim();
    if (!text || !userId) return;
    setSubmittingComments(prev => new Set(prev).add(postId));
    const { error } = await supabase.from("post_comments").insert({
      post_id: postId,
      author_id: userId,
      content: text,
    });
    if (error) { toast.error("Failed to send comment"); setSubmittingComments(prev => { const s = new Set(prev); s.delete(postId); return s; }); return; }
    const { count } = await supabase
      .from("post_comments").select("id", { count: "exact", head: true })
      .eq("post_id", postId);
    await supabase.from("posts").update({ comments_count: count ?? 0 }).eq("id", postId);
    setSubmittingComments(prev => { const s = new Set(prev); s.delete(postId); return s; });
    setCommentTexts(prev => ({ ...prev, [postId]: "" }));
    queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    queryClient.invalidateQueries({ queryKey: ["post-comments"] });
  };

  const getInitials = (name: string | null) =>
    name ? name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() : "?";

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const { data: myProfile } = useQuery({
    queryKey: ["my-profile-feed", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", userId).single();
      return data;
    },
    enabled: !!userId,
  });

  const myInitials = myProfile?.full_name
    ? myProfile.full_name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()
    : "?";

  const content = (
    <div className="bottom-nav-safe">
      {!embedded && <AppHeader title="Lounge" />}

      <div className="space-y-4 px-4 pb-20">
        {/* Create Post Box */}
        <div className="golf-card p-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={myProfile?.avatar_url ?? ""} />
              <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">{myInitials}</AvatarFallback>
            </Avatar>
            <button
              onClick={() => setShowCreate(true)}
              className="flex-1 min-w-0 text-left px-3 py-2 rounded-full bg-secondary text-sm text-muted-foreground hover:bg-secondary/80 transition-colors truncate"
            >
              What's on your mind?
            </button>
          </div>
          <div className="flex gap-1 mt-2 pl-11">
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-7" onClick={() => setShowCreate(true)}>
              📸 Photo
            </Button>
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-7" onClick={() => setShowCreate(true)}>
              🏌️ Score
            </Button>
          </div>
        </div>
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="golf-card p-4 space-y-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-secondary" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-32 bg-secondary rounded" />
                    <div className="h-2.5 w-20 bg-secondary rounded" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-secondary rounded" />
                  <div className="h-3 w-3/4 bg-secondary rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && (!posts || posts.length === 0) && (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-primary/60" />
            </div>
            <p className="text-lg font-semibold text-foreground">Your feed is empty</p>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Posts will appear from your <strong>buddies</strong>, <strong>club members</strong>, and <strong>tournament participants</strong>.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Add buddies or join a club to see their posts here.
            </p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>
                Share Something
              </Button>
            </div>
          </div>
        )}

        {(posts ?? []).map((post: any, i: number) => {
          const profile = post.profiles as any;
          const showImage = !!post.image_url;
          return (
            <article key={post.id} className="overflow-hidden animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
              {showImage && (
                <div className="relative rounded-xl overflow-hidden">
                  <img src={post.image_url} alt="Post" className="h-56 w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <Avatar className="h-9 w-9 border-2 border-foreground/50">
                      <AvatarImage src={profile?.avatar_url ?? ""} />
                      <AvatarFallback className="bg-secondary text-xs font-semibold">{getInitials(profile?.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-semibold drop-shadow">{profile?.full_name ?? "User"}</p>
                      <p className="text-[10px] uppercase tracking-wider text-foreground/70">{post.category?.replace("_", " ")}</p>
                    </div>
                  </div>
                  {post.author_id === userId && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-red-500/80 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}

              <div className={showImage ? "pt-3" : "golf-card p-4"}>
                {!showImage && (
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-8 w-8 border border-primary/30">
                      <AvatarImage src={profile?.avatar_url ?? ""} />
                      <AvatarFallback className="bg-secondary text-xs font-semibold">{getInitials(profile?.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-semibold">{profile?.full_name ?? "User"}</p>
                        {/* Club badge */}
                        {(profile?.members as any)?.[0]?.clubs?.name && (
                          <span className="text-[10px] bg-primary/10 text-primary/80 px-1.5 py-0.5 rounded-full font-medium border border-primary/15">
                            {(profile?.members as any)[0].clubs.name}
                          </span>
                        )}
                        {/* HCP badge */}
                        {profile?.handicap != null && (
                          <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full font-mono">
                            HCP {profile.handicap}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {/* Category badge */}
                        {post.category && post.category !== "general" && (
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-accent-foreground/70 bg-accent/20 px-1.5 py-0.5 rounded-full">
                            {post.category.replace("_", " ")}
                          </span>
                        )}
                        <p className="text-[10px] text-muted-foreground">{timeAgo(post.created_at)}</p>
                      </div>
                    </div>
                    {post.author_id === userId && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="p-1.5 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
                {post.content && <p className="text-sm leading-relaxed">{post.content}</p>}
                {post.course_id && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <MapPin className="h-3 w-3 text-primary/70" />
                    <span className="text-xs text-primary/70 font-medium">
                      ⛳ {courses?.find((c: any) => c.id === post.course_id)?.name ?? "Golf Course"}
                    </span>
                  </div>
                )}
                <div className="flex items-center border-t border-border/30 pt-2 mt-2 gap-1">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-secondary ${likedPosts.has(post.id) ? "text-red-400" : "text-muted-foreground"}`}
                  >
                    <Heart className={`h-4 w-4 ${likedPosts.has(post.id) ? "fill-red-400" : ""}`} />
                    <span>Like</span>
                    {(post.likes_count ?? 0) > 0 && (
                      <span className="text-xs">{post.likes_count}</span>
                    )}
                  </button>
                  <button
                    onClick={() => { document.getElementById(`comment-input-${post.id}`)?.focus(); }}
                    className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Comment</span>
                    {(post.comments_count ?? 0) > 0 && (
                      <span className="text-xs">{post.comments_count}</span>
                    )}
                  </button>
                  <button
                    onClick={() => handleShare(post.id, post.content)}
                    className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>Share</span>
                  </button>
                </div>

                {/* Comments section */}
                {(
                  <div className="border-t border-border/30 pt-3 mt-1 space-y-3">
                    {/* Existing comments */}
                    {(allComments?.[post.id] ?? []).map((c: any) => (
                      <div key={c.id} className="flex gap-2">
                        <Avatar className="h-7 w-7 shrink-0 border border-primary/20">
                          <AvatarImage src={c.profiles?.avatar_url ?? ""} />
                          <AvatarFallback className="text-[10px]">{getInitials(c.profiles?.full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 bg-secondary/40 rounded-xl px-3 py-2">
                          <p className="text-[11px] font-semibold">{c.profiles?.full_name ?? "User"}</p>
                          <p className="text-xs mt-0.5 leading-relaxed">{c.content}</p>
                        </div>
                      </div>
                    ))}
                    {/* Inline comment input */}
                    <div className="flex gap-2 items-center">
                      <Avatar className="h-7 w-7 shrink-0 border border-primary/20">
                        <AvatarImage src={(myProfile as any)?.avatar_url ?? ""} />
                        <AvatarFallback className="text-[10px]">{getInitials((myProfile as any)?.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex gap-1">
                        <input
                          id={`comment-input-${post.id}`}
                          type="text"
                          placeholder="Write a comment..."
                          className="flex-1 bg-secondary/40 rounded-full px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/40"
                          value={commentTexts[post.id] ?? ""}
                          onChange={e => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitComment(post.id); } }}
                        />
                        <button
                          disabled={submittingComments.has(post.id) || !commentTexts[post.id]?.trim()}
                          onClick={() => handleSubmitComment(post.id)}
                          className="text-primary disabled:opacity-40 text-xs font-semibold px-2"
                        >
                          {submittingComments.has(post.id) ? "..." : "Send"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Create Post Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Create Post</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {/* Channel selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0">Post to:</span>
              <select
                value={selectedChannelId ?? ""}
                onChange={e => setSelectedChannelId(e.target.value || null)}
                className="flex-1 rounded-lg border border-border bg-secondary text-xs px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">🌐 Public (no channel)</option>
                {(myChannels ?? []).map((ch: any) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.channel_type === "platform" ? "📢" : ch.channel_type === "club" ? "🏌️" : "📍"} {ch.name}
                  </option>
                ))}
              </select>
            </div>
            <Textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={e => setContent(e.target.value)}
              className="min-h-[100px] resize-none"
            />
            <div className="flex gap-2">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelect}
              />
              <Button
                size="sm" variant="outline"
                className={`gap-1 text-xs ${photoUrl ? "border-primary text-primary" : ""}`}
                disabled={uploadingPhoto}
                onClick={() => photoInputRef.current?.click()}
              >
                {uploadingPhoto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Image className="h-3.5 w-3.5" />}
                {photoUrl ? "Change Photo" : "Foto"}
              </Button>
              <Button
                size="sm" variant="outline"
                className={`gap-1 text-xs ${taggedCourseId ? "border-primary text-primary" : ""}`}
                onClick={() => setShowCourseSheet(true)}
              >
                <MapPin className="h-3.5 w-3.5" />
                {taggedCourseName ? taggedCourseName.substring(0, 12) + (taggedCourseName.length > 12 ? "…" : "") : "Course"}
              </Button>
            </div>

            {/* Photo preview */}
            {photoUrl && (
              <div className="relative mt-1">
                <img src={photoUrl} alt="preview" className="w-full max-h-40 object-cover rounded-lg" />
                <button
                  onClick={() => setPhotoUrl(null)}
                  className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"
                >
                  <X className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
            )}

            {/* Course picker */}
            {showCourseSheet && (
              <div className="rounded-lg border border-border bg-card p-2 max-h-40 overflow-y-auto space-y-1">
                {taggedCourseId && (
                  <button
                    className="w-full text-left text-xs text-red-400 px-2 py-1 hover:bg-muted rounded"
                    onClick={() => { setTaggedCourseId(null); setTaggedCourseName(null); setShowCourseSheet(false); }}
                  >
                    ✕ Hapus tag course
                  </button>
                )}
                {courses?.map((c: any) => (
                  <button
                    key={c.id}
                    className="w-full text-left text-xs px-2 py-1.5 hover:bg-muted rounded truncate"
                    onClick={() => { setTaggedCourseId(c.id); setTaggedCourseName(c.name); setShowCourseSheet(false); }}
                  >
                    📍 {c.name}
                    {c.location && <span className="text-muted-foreground ml-1">· {c.location}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handlePost} disabled={posting || (!content.trim() && !photoUrl)}>
              {posting ? "Posting…" : "Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
  if (embedded) return content;
  return <DesktopLayout>{content}</DesktopLayout>;
};

export default NewsFeed;
