import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Navigation } from '../components/Navigation';
import { AuthDialog } from '../components/AuthDialog';
import { AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Flame, TrendingUp, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function HomePage() {
  const { user, token } = useContext(AuthContext);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [selectedBets, setSelectedBets] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadMatches();
    seedData();
  }, []);

  const seedData = async () => {
    try {
      await axios.post(`${API}/seed-data`);
    } catch (error) {
      console.log('Data already seeded or error:', error);
    }
  };

  const loadMatches = async () => {
    try {
      const res = await axios.get(`${API}/matches`);
      setMatches(res.data.filter(m => m.status === 'upcoming').slice(0, 12));
      setLoading(false);
    } catch (error) {
      console.error('Error loading matches:', error);
      setLoading(false);
    }
  };

  const addToBetSlip = (match, betType, odds) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }

    const bet = {
      match_id: match.id,
      match: `${match.home_team} vs ${match.away_team}`,
      bet_type: betType,
      odds: odds,
      sport: match.sport
    };

    const existing = selectedBets.find(b => b.match_id === match.id);
    if (existing) {
      setSelectedBets(selectedBets.map(b => b.match_id === match.id ? bet : b));
    } else {
      setSelectedBets([...selectedBets, bet]);
    }
    toast.success(`Lisätty vetolapppuun: ${betType}`);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fi-FI', { day: 'numeric', month: 'short' });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
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
    <div className="min-h-screen" data-testid="home-page">
      <Navigation />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1730652128205-f5e98e542786?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzZ8MHwxfHNlYXJjaHwzfHxzb2NjZXIlMjBwbGF5ZXIlMjBzY29yaW5nJTIwZ29hbCUyMHN0YWRpdW0lMjBuaWdodCUyMG5lb24lMjBsaWdodHMlMjBhY3Rpb258ZW58MHx8fHwxNzcxMzQ5MDU1fDA&ixlib=rb-4.1.0&q=85)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center space-y-8">
            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter" data-testid="hero-title">
              VOITA <span className="text-primary">SUURESTI</span>
              <br />
              <span className="text-secondary">PELAA ÄLYKÄÄSTI</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto" data-testid="hero-subtitle">
              AI-pohjaiset analyysit, reaaliaikaiset kertoimet ja tilastot viimeiseltä 5 vuodelta
            </p>
            {!user && (
              <Button 
                onClick={() => setAuthOpen(true)} 
                size="lg" 
                className="neon-glow text-lg px-8 py-6 font-bold uppercase"
                data-testid="hero-cta-button"
              >
                <Flame className="w-5 h-5 mr-2" />
                Aloita nyt
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Matches Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-heading text-4xl font-black tracking-tight" data-testid="matches-heading">
            TULEVAT OTTELUT
          </h2>
          <Button onClick={() => navigate('/live')} variant="outline" className="gap-2" data-testid="view-live-button">
            <TrendingUp className="w-4 h-4" />
            Katso live-vedot
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="matches-grid">
          {matches.map((match) => (
            <Card 
              key={match.id} 
              className="bet-card glassmorphism p-6 space-y-4 group hover:border-primary/50"
              data-testid={`match-card-${match.id}`}
            >
              <div className="flex items-start justify-between">
                <Badge variant="outline" className="text-xs" data-testid={`sport-badge-${match.id}`}>
                  {match.sport}
                </Badge>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(match.start_time)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(match.start_time)}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between" data-testid={`teams-${match.id}`}>
                  <div className="font-heading text-xl font-bold">{match.home_team}</div>
                  <div className="text-muted-foreground font-bold">VS</div>
                  <div className="font-heading text-xl font-bold">{match.away_team}</div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={() => addToBetSlip(match, 'home', match.home_odds)}
                    variant="outline"
                    className="odds-button flex-col h-auto py-3 border-primary/30 hover:bg-primary hover:text-primary-foreground"
                    data-testid={`bet-home-${match.id}`}
                  >
                    <span className="text-xs opacity-70">Koti</span>
                    <span className="font-heading text-lg font-black text-primary">{match.home_odds}</span>
                  </Button>
                  {match.draw_odds && (
                    <Button
                      onClick={() => addToBetSlip(match, 'draw', match.draw_odds)}
                      variant="outline"
                      className="odds-button flex-col h-auto py-3 border-secondary/30 hover:bg-secondary hover:text-secondary-foreground"
                      data-testid={`bet-draw-${match.id}`}
                    >
                      <span className="text-xs opacity-70">Tasapeli</span>
                      <span className="font-heading text-lg font-black text-secondary">{match.draw_odds}</span>
                    </Button>
                  )}
                  <Button
                    onClick={() => addToBetSlip(match, 'away', match.away_odds)}
                    variant="outline"
                    className="odds-button flex-col h-auto py-3 border-accent/30 hover:bg-accent hover:text-accent-foreground"
                    data-testid={`bet-away-${match.id}`}
                  >
                    <span className="text-xs opacity-70">Vieras</span>
                    <span className="font-heading text-lg font-black text-accent">{match.away_odds}</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Floating Bet Slip */}
      {selectedBets.length > 0 && (
        <div className="fixed bottom-8 right-8 z-40" data-testid="floating-bet-slip">
          <Button
            onClick={() => {
              localStorage.setItem('betSlip', JSON.stringify(selectedBets));
              navigate('/bet-slip');
            }}
            size="lg"
            className="neon-glow-accent rounded-full px-8 py-6 font-bold shadow-2xl"
            data-testid="open-bet-slip-button"
          >
            Vetolappu ({selectedBets.length})
          </Button>
        </div>
      )}

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}