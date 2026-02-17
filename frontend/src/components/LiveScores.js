import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Radio, Clock } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const LiveScores = () => {
  const [liveScores, setLiveScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLiveScores();
    const interval = setInterval(loadLiveScores, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadLiveScores = async () => {
    try {
      const res = await axios.get(`${API}/live-scores`);
      setLiveScores(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading live scores:', error);
      setLoading(false);
    }
  };

  if (loading || liveScores.length === 0) return null;

  return (
    <div className="space-y-4" data-testid="live-scores-section">
      <div className="flex items-center gap-3">
        <Radio className="w-6 h-6 text-accent animate-pulse" />
        <h2 className="font-heading text-2xl font-bold gradient-text">Live-tulokset</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {liveScores.map((score) => (
          <Card key={score.id} className="p-4 border-accent/30 bg-card/50" data-testid={`live-score-${score.id}`}>
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="text-xs border-accent/40 text-accent">
                {score.league}
              </Badge>
              <div className="flex items-center gap-2 text-xs text-accent">
                {score.status === 'live' ? (
                  <>
                    <Radio className="w-3 h-3 animate-pulse" />
                    <span className="font-bold">{score.minute}</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3" />
                    <span className="font-bold">{score.minute}</span>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{score.home_team}</span>
                <span className="font-heading text-2xl font-bold text-primary">{score.home_score}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">{score.away_team}</span>
                <span className="font-heading text-2xl font-bold text-secondary">{score.away_score}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};