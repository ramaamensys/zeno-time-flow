import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Quote, X } from "lucide-react";
import { getDailyQuote } from "@/utils/dailyQuotes";

const DailyQuote = () => {
  const [isVisible, setIsVisible] = useState(true);
  const dailyQuote = getDailyQuote();

  useEffect(() => {
    const isHidden = localStorage.getItem('dailyQuoteHidden');
    if (isHidden) {
      setIsVisible(false);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('dailyQuoteHidden', 'true');
  };

  if (!isVisible) return null;

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
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyQuote;