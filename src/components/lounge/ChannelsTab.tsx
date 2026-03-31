import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, BellOff, Megaphone, Users, MapPin, Globe, Heart, MessageCircle, Plus, Search } from "lucide-react";
import { toast } from "sonner";

const ChannelsTab = () => {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  // Auto-select channel from URL param ?channel=id
  useEffect(() => {
    const channelParam = searchParams.get("channel");
    if (channelParam) setSelectedChannelId(channelParam);
  }, [searchParams]);
  const [view, setView] = useState<"following" | "discover">("following");
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Auto-follow GolfBuana Official
  useEffect(() => {
    if (!userId) return;
    const autoFollow = async () => {
      const { data: official } = await supabase
        .from("channels").select("id").eq("channel_type", "platform").eq("is_official", true).single();
      if (!official) return;
      await supabase.from("channel_follows")
        .upsert({ channel_id: official.id, user_id: userId }, { onConflict: "channel_id,user_id" });
      // Don't auto-select — let user pick channel
    };
    autoFollow();
  }, [userId]);

  // Auto-follow club channels
  useEffect(() => {
    if (!userId) return;
    const autoFollowClubs = async () => {
      const { data: memberships } = await supabase.from("members").select("club_id").eq("user_id", userId);
      if (!memberships?.length) return;
      const { data: clubChannels } = await supabase.from("channels").select("id").in("club_id", memberships.map((m: any) => m.club_id));
      if (!clubChannels?.length) return;
      for (const ch of clubChannels) {
        await supabase.from("channel_follows").upsert({ channel_id: ch.id, user_id: userId }, { onConflict: "channel_id,user_id" });
      }
    };
    autoFollowClubs();
  }, [userId]);

  const { data: followedChannels } = useQuery({
    queryKey: ["followed-channels", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase.from("channel_follows")
        .select("*, channels(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return (data ?? []).map((f: any) => f.channels).filter(Boolean);
    },
    enabled: !!userId,
  });

  const { data: discoverChannels } = useQuery({
    queryKey: ["discover-channels", userId],
    queryFn: async () => {
      const { data: all } = await supabase.from("channels").select("*").order("follower_count", { ascending: false }).limit(50);
      if (!userId) return all ?? [];
      const { data: follows } = await supabase.from("channel_follows").select("channel_id").eq("user_id", userId);
      const followedIds = new Set((follows ?? []).map((f: any) => f.channel_id));
      return (all ?? []).filter((ch: any) => !followedIds.has(ch.id));
    },
    enabled: !!userId,
  });

  const { data: channelPosts } = useQuery({
    queryKey: ["channel-posts-detail", selectedChannelId],
    queryFn: async () => {
      if (!selectedChannelId) return [];
      const { data } = await supabase
        .from("posts")
        .select("*, profiles:author_id(full_name, avatar_url)")
        .eq("channel_id", selectedChannelId)
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
    enabled: !!selectedChannelId,
  });

  const selectedChannel = [...(followedChannels ?? []), ...(discoverChannels ?? [])]
    .find((ch: any) => ch?.id === selectedChannelId);

  const handleFollow = async (channelId: string, isFollowing: boolean) => {
    if (!userId) return;
    if (isFollowing) {
      await supabase.from("channel_follows").delete().eq("channel_id", channelId).eq("user_id", userId);
      toast.success("Unfollowed");
    } else {
      await supabase.from("channel_follows").upsert({ channel_id: channelId, user_id: userId }, { onConflict: "channel_id,user_id" });
      toast.success("Following!");
      setSelectedChannelId(channelId);
      setView("following");
    }
    queryClient.invalidateQueries({ queryKey: ["followed-channels", userId] });
    queryClient.invalidateQueries({ queryKey: ["discover-channels", userId] });
  };

  const channelIcon = (type: string) => {
    if (type === "platform") return "📢";
    if (type === "club") return "🏌️";
    if (type === "course") return "📍";
    return "🌐";
  };

  const channelBg = (type: string, active: boolean) => {
    if (active) return "bg-primary/15 border-l-2 border-primary";
    return "hover:bg-secondary/60";
  };

  const displayChannels = view === "following" ? followedChannels : discoverChannels;
  const filtered = (displayChannels ?? []).filter((ch: any) =>
    ch?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const isMobileDetail = selectedChannelId !== null;

  return (
    <div className="flex h-full">
      {/* LEFT PANEL — channel list */}
      <div className={`${isMobileDetail ? "hidden lg:flex" : "flex"} w-full lg:w-[320px] shrink-0 flex-col border-r border-border/50 h-full`}>
        {/* Search + tabs */}
        <div className="px-3 pt-3 pb-2 space-y-2 shrink-0">
          <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search channels..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex gap-1">
            {[
              { id: "following", label: `Following (${followedChannels?.length ?? 0})` },
              { id: "discover", label: "Discover" },
            ].map(t => (
              <button key={t.id} onClick={() => setView(t.id as any)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  view === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="text-center py-8 px-4">
              <p className="text-xs text-muted-foreground">
                {view === "following" ? "No channels followed yet" : "No more channels"}
              </p>
              {view === "following" && (
                <Button size="sm" className="mt-2 text-xs" onClick={() => setView("discover")}>
                  Discover Channels
                </Button>
              )}
            </div>
          )}
          {filtered.map((ch: any) => {
            if (!ch) return null;
            const isActive = selectedChannelId === ch.id;
            const isFollowing = (followedChannels ?? []).some((f: any) => f?.id === ch.id);
            return (
              <button key={ch.id} onClick={() => setSelectedChannelId(ch.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-colors ${channelBg(ch.channel_type, isActive)}`}>
                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center text-lg shrink-0 ${
                  ch.channel_type === "platform" ? "bg-primary/20" :
                  ch.channel_type === "club" ? "bg-amber-500/20" : "bg-secondary"
                }`}>
                  {ch.avatar_url
                    ? <img src={ch.avatar_url} className="h-11 w-11 rounded-2xl object-cover" />
                    : channelIcon(ch.channel_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className={`text-base font-semibold truncate ${isActive ? "text-primary" : ""}`}>{ch.name}</p>
                    {ch.is_official && <span className="text-[9px] text-primary shrink-0">✓</span>}
                  </div>
                  <p className="text-[13px] text-muted-foreground">
                    {ch.follower_count?.toLocaleString() ?? 0} followers
                  </p>
                </div>
                {view === "discover" && (
                  <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 shrink-0"
                    onClick={e => { e.stopPropagation(); handleFollow(ch.id, isFollowing); }}>
                    Follow
                  </Button>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANEL — channel content */}
      <div className={`${isMobileDetail ? "flex" : "hidden lg:flex"} flex-1 flex-col overflow-hidden`}>
        {!selectedChannel ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <Megaphone className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm font-semibold text-muted-foreground">Select a channel</p>
            <p className="text-xs text-muted-foreground mt-1">Choose a channel from the left to see its posts</p>
          </div>
        ) : (
          <>
            {/* Channel header */}
            <div className="shrink-0 px-3 py-3 border-b border-border/50 flex items-center gap-3">
              {/* Back button — mobile only */}
              <button
                className="lg:hidden flex items-center justify-center h-8 w-8 rounded-full hover:bg-secondary shrink-0"
                onClick={() => setSelectedChannelId(null)}
              >
                ←
              </button>
              <div className={`h-10 w-10 rounded-2xl flex items-center justify-center text-lg ${
                selectedChannel.channel_type === "platform" ? "bg-primary/20" :
                selectedChannel.channel_type === "club" ? "bg-amber-500/20" : "bg-secondary"
              }`}>
                {selectedChannel.avatar_url
                  ? <img src={selectedChannel.avatar_url} className="h-10 w-10 rounded-2xl object-cover" />
                  : channelIcon(selectedChannel.channel_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-base font-bold truncate">{selectedChannel.name}</p>
                  {selectedChannel.is_official && (
                    <span className="text-[9px] bg-primary/15 text-primary border border-primary/30 px-1.5 py-0.5 rounded font-bold shrink-0">✓ Official</span>
                  )}
                </div>
                <p className="text-[13px] text-muted-foreground">
                  {selectedChannel.follower_count?.toLocaleString() ?? 0} followers
                </p>
              </div>
              {selectedChannel.channel_type !== "platform" && (
                <Button size="sm" variant="outline" className="h-7 text-xs shrink-0"
                  onClick={() => handleFollow(selectedChannel.id, true)}>
                  <BellOff className="h-3 w-3 mr-1" /> Unfollow
                </Button>
              )}
            </div>

            {/* Posts */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {!channelPosts?.length ? (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground">No posts yet in this channel</p>
                </div>
              ) : channelPosts.map((post: any) => (
                <div key={post.id} className="golf-card p-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={post.profiles?.avatar_url ?? ""} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {post.profiles?.full_name?.charAt(0) ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-[15px] font-semibold">{post.profiles?.full_name}</p>
                      <p className="text-[13px] text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <p className="text-[15px] text-foreground leading-relaxed whitespace-pre-line">{post.content}</p>
                  {post.image_url && (
                    <img src={post.image_url} className="w-full rounded-xl object-cover max-h-64 mt-3" />
                  )}
                  <div className="flex items-center gap-4 mt-3 pt-2 border-t border-border/30">
                    <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                      <Heart className="h-3.5 w-3.5" /> {post.likes_count ?? 0}
                    </button>
                    <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                      <MessageCircle className="h-3.5 w-3.5" /> {post.comments_count ?? 0}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChannelsTab;
