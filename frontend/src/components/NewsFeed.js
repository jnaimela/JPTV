import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Newspaper, Clock } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const NewsFeed = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      const res = await axios.get(`${API}/news`);
      setNews(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading news:', error);
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins} minuuttia sitten`;
    } else if (diffHours < 24) {
      return `${diffHours} tuntia sitten`;
    } else {
      return date.toLocaleDateString('fi-FI');
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-4" data-testid="news-feed-section">
      <div className="flex items-center gap-3">
        <Newspaper className="w-6 h-6 text-primary" />
        <h2 className="font-heading text-2xl font-bold gradient-text">Tuoreimmat uutiset</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {news.map((item) => (
          <Card 
            key={item.id} 
            className="p-5 border-primary/30 hover:border-primary/50 transition-colors cursor-pointer group"
            data-testid={`news-item-${item.id}`}
          >
            <div className="flex items-start justify-between mb-3">
              <Badge variant="outline" className="text-xs border-primary/40">
                {item.category}
              </Badge>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {getTimeAgo(item.published_at)}
              </div>
            </div>
            <h3 className="font-heading text-lg font-bold mb-2 group-hover:text-primary transition-colors">
              {item.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {item.summary}
            </p>
            <div className="mt-3 text-xs text-muted-foreground">
              Lähde: {item.source}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};