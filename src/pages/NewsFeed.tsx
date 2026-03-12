import { Heart, MessageCircle, Share2, Bell } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import heroImg from "@/assets/golf-hero.jpg";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const posts = [
  {
    id: 1,
    author: "James Walker",
    initials: "JW",
    time: "2h ago",
    text: "Amazing round at Pine Valley today! Shot my personal best 🏌️‍♂️",
    image: true,
    likes: 24,
    comments: 5,
  },
  {
    id: 2,
    author: "Sarah Chen",
    initials: "SC",
    time: "5h ago",
    text: "Just joined the Spring Championship. Who else is playing?",
    image: false,
    likes: 12,
    comments: 8,
  },
  {
    id: 3,
    author: "Mike O'Brien",
    initials: "MO",
    time: "1d ago",
    text: "New clubs arrived! Can't wait to test them on the range tomorrow.",
    image: false,
    likes: 31,
    comments: 14,
  },
];

const NewsFeed = () => {
  return (
    <div className="bottom-nav-safe">
      <AppHeader
        title="News"
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
            className="golf-card overflow-hidden animate-fade-in"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {post.image && (
              <img
                src={heroImg}
                alt="Golf course"
                className="h-48 w-full object-cover"
              />
            )}
            <div className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-primary/30">
                  <AvatarFallback className="bg-secondary text-sm font-semibold">
                    {post.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">{post.author}</p>
                  <p className="text-xs text-muted-foreground">{post.time}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-secondary-foreground">
                {post.text}
              </p>
              <div className="mt-4 flex items-center gap-6 text-muted-foreground">
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
