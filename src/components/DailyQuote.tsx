import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";
import { getDailyQuote } from "@/utils/dailyQuotes";

const DailyQuote = () => {
  const dailyQuote = getDailyQuote();

  return (
    <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Quote className="h-8 w-8 text-primary mt-1 flex-shrink-0" />
          <div className="flex-1">
            <blockquote className="text-lg font-medium text-foreground mb-2 leading-relaxed">
              "{dailyQuote.quote}"
            </blockquote>
            <cite className="text-sm text-muted-foreground font-medium">
              — {dailyQuote.author}
            </cite>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyQuote;