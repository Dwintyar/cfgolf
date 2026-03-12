import { Heart, MessageCircle, Share2, Bell } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import heroImg from "@/assets/golf-hero.jpg";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const posts = [
  {
    id: 1,
    author: "Sarah Parmenter",
    initials: "SP",
    category: "THINGS TO DO",
    time: "2h ago",
    title: "When setting up major championship courses, length matters less than you think.",
    text: "At more than 7,300 yards, the Robert Trent Jones design known locally as the "Green Monster of Ladue" is feared for its crowned fairways, deep bunkers and huge greens.",
    image: true,
    likes: 24,
    comments: 5,
  },
  {
    id: 2,
    author: "James Walker",
    initials: "JW",
    category: "TIPS",
    time: "5h ago",
    title: "Amazing round at Pine Valley today!",
    text: "Shot my personal best 🏌️‍♂️ The greens were in perfect condition and the weather was ideal for a round.",
    image: false,
    likes: 12,
    comments: 8,
  },
  {
    id: 3,
    author: "Mike O'Brien",
    initials: "MO",
    category: "GEAR",
    time: "1d ago",
    title: "New clubs arrived!",
    text: "Can't wait to test them on the range tomorrow. The new irons feel incredible in hand.",
    image: false,
    likes: 31,
    comments: 14,
  },
];

const NewsFeed = () => {
  return (
    <div className="bottom-nav-safe">
      <AppHeader
        title="Feeds"
        rightContent={
          <button className="relative rounded-full bg-secondary p-2">
            <Bell className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary" />
          </button>
        }
      />

      <div className="space-y-4 px-4">
        {posts.map((post, i) => (
          <article
            key={post.id}
            className="overflow-hidden animate-fade-in"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {/* Hero post with image overlay like reference GD_Mob_30 */}
            {post.image && (
              <div className="relative rounded-xl overflow-hidden">
                <img
                  src={heroImg}
                  alt="Golf course"
                  className="h-56 w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                {/* Author overlay at bottom of image */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <Avatar className="h-9 w-9 border-2 border-foreground/50">
                    <AvatarFallback className="bg-secondary text-xs font-semibold">
                      {post.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs font-semibold drop-shadow">{post.author}</p>
                    <p className="text-[10px] uppercase tracking-wider text-foreground/70">{post.category}</p>
                  </div>
                </div>
              </div>
            )}

            <div className={post.image ? "pt-3" : "golf-card p-4"}>
              {!post.image && (
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="h-8 w-8 border border-primary/30">
                    <AvatarFallback className="bg-secondary text-xs font-semibold">
                      {post.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs font-semibold">{post.author}</p>
                    <p className="text-[10px] text-muted-foreground">{post.time}</p>
                  </div>
                </div>
              )}

              <h2 className="font-display text-lg font-semibold leading-snug">
                {post.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {post.text}
              </p>

              <div className="mt-3 flex items-center gap-6 text-muted-foreground">
                <button className="flex items-center gap-1.5 text-xs hover:text-primary transition-colors">
                  <Heart className="h-4 w-4" /> {post.likes}
                </button>
                <button className="flex items-center gap-1.5 text-xs hover:text-primary transition-colors">
                  <MessageCircle className="h-4 w-4" /> {post.comments}
                </button>
                <button className="ml-auto hover:text-primary transition-colors">
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default NewsFeed;
