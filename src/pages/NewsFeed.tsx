import { useState, useEffect } from "react";
import { Heart, MessageCircle, Share2, Plus, Image, MapPin, Tag, X, MessageSquare } from "lucide-react";
import AppHeader from "@/components/AppHeader";
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

const NewsFeed = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [posting, setPosting] = useState(false);
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
        .select("*, profiles:author_id(full_name, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const handlePost = async () => {
    if (!content.trim() || !userId) return;
    setPosting(true);
    const { error } = await supabase.from("posts").insert({
      author_id: userId,
      content: content.trim(),
      category,
    });
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Post published!");
    setContent("");
    setCategory("general");
    setShowCreate(false);
    queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
  };

  const handleLike = async (postId: string) => {
    if (!userId) { toast.error("Please login first"); return; }
    const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
    if (error?.code === "23505") {
      // Already liked, unlike
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
    }
    // Update count
    const { count } = await supabase.from("post_likes").select("id", { count: "exact", head: true }).eq("post_id", postId);
    await supabase.from("posts").update({ likes_count: count ?? 0 }).eq("id", postId);
    queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
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

  return (
    <div className="bottom-nav-safe">
      <AppHeader title="Feeds" />

      <div className="space-y-4 px-4 pb-20">
        {/* Create Post Box */}
        <div className="golf-card p-4 flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={myProfile?.avatar_url ?? ""} />
            <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">{myInitials}</AvatarFallback>
          </Avatar>
          <button
            onClick={() => setShowCreate(true)}
            className="flex-1 text-left px-4 py-2.5 rounded-full bg-secondary text-sm text-muted-foreground hover:bg-secondary/80 transition-colors"
          >
            Apa yang ingin Anda bagikan hari ini?
          </button>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs" onClick={() => setShowCreate(true)}>
              📸 Foto
            </Button>
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs" onClick={() => setShowCreate(true)}>
              🏌️ Skor
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
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-base font-semibold">Belum ada post</p>
            <p className="text-sm text-muted-foreground mt-1">
              Jadilah yang pertama berbagi cerita golf Anda!
            </p>
            <Button className="mt-4" onClick={() => setShowCreate(true)}>
              Buat Post Pertama
            </Button>
          </div>
        )}

        {(posts ?? []).map((post: any, i: number) => {
          const profile = post.profiles as any;
          const showImage = !!post.image_url || i === 0;
          return (
            <article key={post.id} className="overflow-hidden animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
              {showImage && (
                <div className="relative rounded-xl overflow-hidden">
                  <img src={heroImg} alt="Golf" className="h-56 w-full object-cover" />
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
                </div>
              )}

              <div className={showImage ? "pt-3" : "golf-card p-4"}>
                {!showImage && (
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-8 w-8 border border-primary/30">
                      <AvatarImage src={profile?.avatar_url ?? ""} />
                      <AvatarFallback className="bg-secondary text-xs font-semibold">{getInitials(profile?.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-semibold">{profile?.full_name ?? "User"}</p>
                      <p className="text-[10px] text-muted-foreground">{timeAgo(post.created_at)}</p>
                    </div>
                  </div>
                )}
                <p className="text-sm leading-relaxed">{post.content}</p>
                <div className="flex items-center border-t border-border/30 pt-2 mt-2 gap-1">
                  <button
                    onClick={() => handleLike(post.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-secondary text-muted-foreground"
                  >
                    <Heart className="h-4 w-4" />
                    <span>Like</span>
                    {(post.likes_count ?? 0) > 0 && (
                      <span className="text-xs">{post.likes_count}</span>
                    )}
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
                    <MessageCircle className="h-4 w-4" />
                    <span>Comment</span>
                    {(post.comments_count ?? 0) > 0 && (
                      <span className="text-xs">{post.comments_count}</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
                      toast.success("Link disalin!");
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>Share</span>
                  </button>
                </div>
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
              <Button size="sm" variant="outline" className="gap-1 text-xs" disabled>
                <Image className="h-3.5 w-3.5" /> Photo
              </Button>
              <Button size="sm" variant="outline" className="gap-1 text-xs" disabled>
                <MapPin className="h-3.5 w-3.5" /> Course
              </Button>
              <Button size="sm" variant="outline" className="gap-1 text-xs" disabled>
                <Tag className="h-3.5 w-3.5" /> Buddy
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handlePost} disabled={posting || !content.trim()}>
              {posting ? "Posting…" : "Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewsFeed;
