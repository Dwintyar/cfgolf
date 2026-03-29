import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Megaphone, Users, MapPin, Globe, Heart, MessageCircle, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

const ChannelsTab = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [view, setView] = useState<"following" | "discover">("following");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Auto-follow GolfBuana Official on mount
  useEffect(() => {
    if (!userId) return;
    const autoFollow = async () => {
      const { data: official } = await supabase
        .from("channels").select("id").eq("channel_type", "platform").eq("is_official", true).single();
      if (!official) return;
      await supabase.from("channel_follows")
        .upsert({ channel_id: official.id, user_id: userId }, { onConflict: "channel_id,user_id" });
    };
    autoFollow();
  }, [userId]);

  // My club channels — auto-follow
  useEffect(() => {
    if (!userId) return;
    const autoFollowClubs = async () => {
      const { data: memberships } = await supabase
        .from("members").select("club_id").eq("user_id", userId);
      if (!memberships?.length) return;
      const clubIds = memberships.map((m: any) => m.club_id);
      const { data: clubChannels } = await supabase
        .from("channels").select("id").in("club_id", clubIds);
      if (!clubChannels?.length) return;
      for (const ch of clubChannels) {
        await supabase.from("channel_follows")
          .upsert({ channel_id: ch.id, user_id: userId }, { onConflict: "channel_id,user_id" });
      }
    };
    autoFollowClubs();
  }, [userId]);

  // Channels I follow
  const { data: followedChannels } = useQuery({
    queryKey: ["followed-channels", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from("channel_follows")
        .select("*, channels(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return (data ?? []).map((f: any) => f.channels).filter(Boolean);
    },
    enabled: !!userId,
  });

  // Posts from followed channels
  const { data: channelPosts } = useQuery({
    queryKey: ["channel-posts", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data: follows } = await supabase
        .from("channel_follows").select("channel_id").eq("user_id", userId);
      const channelIds = (follows ?? []).map((f: any) => f.channel_id);
      if (!channelIds.length) return [];
      const { data } = await supabase
        .from("posts")
        .select("*, profiles:author_id(full_name, avatar_url), channels(name, channel_type)")
        .in("channel_id", channelIds)
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
    enabled: !!userId,
  });

  // Discover channels (not following)
  const { data: discoverChannels } = useQuery({
    queryKey: ["discover-channels", userId],
    queryFn: async () => {
      const { data: all } = await supabase
        .from("channels").select("*").order("follower_count", { ascending: false }).limit(30);
      if (!userId) return all ?? [];
      const { data: follows } = await supabase
        .from("channel_follows").select("channel_id").eq("user_id", userId);
      const followedIds = new Set((follows ?? []).map((f: any) => f.channel_id));
      return (all ?? []).filter((ch: any) => !followedIds.has(ch.id));
    },
    enabled: !!userId,
  });

  const handleFollow = async (channelId: string, isFollowing: boolean) => {
    if (!userId) return;
    if (isFollowing) {
      await supabase.from("channel_follows").delete()
        .eq("channel_id", channelId).eq("user_id", userId);
      toast.success("Unfollowed");
    } else {
      await supabase.from("channel_follows")
        .upsert({ channel_id: channelId, user_id: userId }, { onConflict: "channel_id,user_id" });
      toast.success("Following!");
    }
    queryClient.invalidateQueries({ queryKey: ["followed-channels", userId] });
    queryClient.invalidateQueries({ queryKey: ["discover-channels", userId] });
  };

  const channelIcon = (type: string) => {
    if (type === "platform") return <Megaphone className="h-4 w-4" />;
    if (type === "club") return <Users className="h-4 w-4" />;
    if (type === "course") return <MapPin className="h-4 w-4" />;
    return <Globe className="h-4 w-4" />;
  };

  const channelColor = (type: string) => {
    if (type === "platform") return "bg-primary/20 text-primary";
    if (type === "club") return "bg-amber-500/20 text-amber-400";
    if (type === "course") return "bg-green-500/20 text-green-400";
    return "bg-secondary text-muted-foreground";
  };

  const ChannelRow = ({ ch, isFollowing }: { ch: any; isFollowing: boolean }) => (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0">
      <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${channelColor(ch.channel_type)}`}>
        {ch.avatar_url
          ? <img src={ch.avatar_url} className="h-11 w-11 rounded-2xl object-cover" />
          : channelIcon(ch.channel_type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold truncate">{ch.name}</p>
          {ch.is_official && (
            <span className="text-[9px] bg-primary/15 text-primary border border-primary/30 px-1 py-0.5 rounded font-bold shrink-0">✓ Official</span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground truncate">{ch.description ?? ch.channel_type}</p>
        <p className="text-[10px] text-muted-foreground">{ch.follower_count?.toLocaleString() ?? 0} followers</p>
      </div>
      {ch.channel_type !== "platform" ? (
        <Button
          size="sm"
          variant={isFollowing ? "outline" : "default"}
          className="h-7 text-xs shrink-0"
          onClick={() => handleFollow(ch.id, isFollowing)}
        >
          {isFollowing ? <><BellOff className="h-3 w-3 mr-1" />Unfollow</> : <><Bell className="h-3 w-3 mr-1" />Follow</>}
        </Button>
      ) : (
        <span className="text-[10px] text-muted-foreground shrink-0">Required</span>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tabs */}
      <div className="flex border-b border-border/50 bg-card shrink-0">
        <button
          onClick={() => setView("following")}
          className={`flex-1 py-2 text-xs font-semibold transition-colors border-b-2 ${
            view === "following" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
          }`}
        >
          Following {followedChannels?.length ? `(${followedChannels.length})` : ""}
        </button>
        <button
          onClick={() => setView("discover")}
          className={`flex-1 py-2 text-xs font-semibold transition-colors border-b-2 ${
            view === "discover" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
          }`}
        >
          Discover
        </button>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-auto px-4 py-2">
        {view === "following" && (
          <>
            {/* Followed channel pills */}
            {(followedChannels?.length ?? 0) > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
                {followedChannels!.map((ch: any) => (
                  <div key={ch.id} className="flex items-center gap-1.5 shrink-0 bg-secondary rounded-full px-3 py-1">
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${
                      ch.channel_type === "platform" ? "bg-primary/20 text-primary" :
                      ch.channel_type === "club" ? "bg-amber-500/20 text-amber-400" : "bg-secondary text-muted-foreground"
                    }`}>
                      {ch.channel_type === "platform" ? "📢" : ch.channel_type === "club" ? "🏌️" : "🌐"}
                    </div>
                    <span className="text-xs font-medium truncate max-w-[80px]">{ch.name}</span>
                  </div>
                ))}
                <button onClick={() => setView("discover")}
                  className="shrink-0 flex items-center gap-1 bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium">
                  + Follow
                </button>
              </div>
            )}

            {/* Posts from followed channels */}
            {!channelPosts?.length ? (
              <div className="text-center py-12">
                <Megaphone className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-semibold">No posts yet</p>
                <p className="text-xs text-muted-foreground mt-1">Channels you follow will post updates here</p>
                <Button size="sm" className="mt-3" onClick={() => setView("discover")}>Discover Channels</Button>
              </div>
            ) : channelPosts.map((post: any) => (
              <div key={post.id} className="golf-card p-3 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={post.profiles?.avatar_url ?? ""} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {post.profiles?.full_name?.charAt(0) ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{post.profiles?.full_name}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      {post.channels && (
                        <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                          {post.channels.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-foreground leading-relaxed mb-2">{post.content}</p>
                {post.image_url && (
                  <img src={post.image_url} className="w-full rounded-lg object-cover max-h-48 mb-2" />
                )}
                <div className="flex items-center gap-4 pt-1 border-t border-border/30">
                  <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                    <Heart className="h-3.5 w-3.5" /> {post.likes_count ?? 0}
                  </button>
                  <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                    <MessageCircle className="h-3.5 w-3.5" /> {post.comments_count ?? 0}
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {view === "discover" && (
          <>
            {!discoverChannels?.length ? (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">No more channels to discover</p>
              </div>
            ) : discoverChannels.map((ch: any) => (
              <ChannelRow key={ch.id} ch={ch} isFollowing={false} />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default ChannelsTab;
