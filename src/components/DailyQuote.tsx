import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";
import { getDailyQuote } from "@/utils/dailyQuotes";

const DailyQuote = () => {
  const dailyQuote = getDailyQuote();

  return (
    <Card className="mb-6 mx-auto max-w-2xl bg-gradient-to-br from-primary/15 via-primary/8 to-accent/10 border-primary/30 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-full bg-primary/20 backdrop-blur-sm">
            <Quote className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <blockquote className="text-base font-medium text-foreground mb-3 leading-relaxed italic">
              "{dailyQuote.quote}"
            </blockquote>
            <cite className="text-sm text-muted-foreground font-semibold tracking-wide">
              — {dailyQuote.author}
            </cite>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyQuote;