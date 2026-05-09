import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Navigation } from '../components/Navigation';
import { AuthDialog } from '../components/AuthDialog';
import { AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Radio } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function LiveBetsPage() {
  const { user } = useContext(AuthContext);
  const [liveMatches, setLiveMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    loadLiveMatches();
    const interval = setInterval(loadLiveMatches, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadLiveMatches = async () => {
    try {
      const res = await axios.get(`${API}/matches?status=live`);
      setLiveMatches(res.data);
      setLoading(false);
    } catch (error) {
      // Error logged
      setLoading(false);
    }
  };

  const placeBet = async (match, betType, odds) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }

    try {
      await axios.post(
        `${API}/bets`,
        {
          match_id: match.id,
          bet_type: betType,
          odds: odds,
          amount: 10.0
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success('Veto asetettu!');
    } catch (error) {
      toast.error('Vedon asettaminen epäonnistui');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-primary text-2xl font-heading">Ladataan...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" data-testid="live-bets-page">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Radio className="w-8 h-8 text-accent live-indicator" />
            <h1 className="font-heading text-5xl font-black tracking-tight" data-testid="live-heading">
              LIVE <span className="text-accent">VEDOT</span>
            </h1>
          </div>
        </div>

        {liveMatches.length === 0 ? (
          <Card className="glassmorphism p-12 text-center" data-testid="no-live-matches">
            <div className="text-muted-foreground text-lg">
              Ei live-otteluita juuri nyt. Tarkista myöhemmin!
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="live-matches-grid">
            {liveMatches.map((match) => (
              <Card 
                key={match.id} 
                className="bet-card glassmorphism p-6 space-y-6 border-accent/30"
                data-testid={`live-match-card-${match.id}`}
              >
                <div className="flex items-start justify-between">
                  <Badge className="bg-accent text-accent-foreground" data-testid={`live-badge-${match.id}`}>
                    <Radio className="w-3 h-3 mr-1 live-indicator" />
                    LIVE
                  </Badge>
                  <Badge variant="outline">{match.sport}</Badge>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-2xl font-heading font-black">
                    <div className="flex-1">
                      <div>{match.home_team}</div>
                      <div className="text-5xl text-primary mt-2">{match.home_score || 0}</div>
                    </div>
                    <div className="text-muted-foreground">:</div>
                    <div className="flex-1 text-right">
                      <div>{match.away_team}</div>
                      <div className="text-5xl text-secondary mt-2">{match.away_score || 0}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      onClick={() => placeBet(match, 'home', match.home_odds)}
                      variant="outline"
                      className="odds-button flex-col h-auto py-4 border-primary/30 hover:bg-primary hover:text-primary-foreground"
                      data-testid={`live-bet-home-${match.id}`}
                    >
                      <span className="text-xs opacity-70">Koti</span>
                      <span className="font-heading text-2xl font-black text-primary">{match.home_odds}</span>
                    </Button>
                    {match.draw_odds && (
                      <Button
                        onClick={() => placeBet(match, 'draw', match.draw_odds)}
                        variant="outline"
                        className="odds-button flex-col h-auto py-4 border-secondary/30 hover:bg-secondary hover:text-secondary-foreground"
                        data-testid={`live-bet-draw-${match.id}`}
                      >
                        <span className="text-xs opacity-70">Tasapeli</span>
                        <span className="font-heading text-2xl font-black text-secondary">{match.draw_odds}</span>
                      </Button>
                    )}
                    <Button
                      onClick={() => placeBet(match, 'away', match.away_odds)}
                      variant="outline"
                      className="odds-button flex-col h-auto py-4 border-accent/30 hover:bg-accent hover:text-accent-foreground"
                      data-testid={`live-bet-away-${match.id}`}
                    >
                      <span className="text-xs opacity-70">Vieras</span>
                      <span className="font-heading text-2xl font-black text-accent">{match.away_odds}</span>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
