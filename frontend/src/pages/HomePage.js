import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Navigation } from '../components/Navigation';
import { AuthDialog } from '../components/AuthDialog';
import { LiveScores } from '../components/LiveScores';
import { NewsFeed } from '../components/NewsFeed';
import { AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { TrendingUp, Calendar, Trophy, Zap, BarChart3, Target } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function HomePage() {
  const { user } = useContext(AuthContext);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [selectedSport, setSelectedSport] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    seedData();
    loadMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSport]);

  useEffect(() => {
    // Update odds every 15 seconds
    const interval = setInterval(() => {
      updateLiveOdds();
    }, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches]);

  const seedData = async () => {
    try {
      await axios.post(`${API}/seed-data`);
    } catch (error) {
      console.log('Data already seeded');
    }
  };

  const loadMatches = async () => {
    try {
      const query = selectedSport !== 'all' ? `?sport=${selectedSport}` : '';
      const res = await axios.get(`${API}/matches${query}`);
      setMatches(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading matches:', error);
      setLoading(false);
    }

  const updateLiveOdds = async () => {
    if (matches.length === 0) return;
    
    // Update odds for a random match
    const randomMatch = matches[Math.floor(Math.random() * matches.length)];
    try {
      const res = await axios.post(`${API}/matches/${randomMatch.id}/update-odds`);
      setMatches(prevMatches =>
        prevMatches.map(m => m.id === res.data.id ? res.data : m)
      );
    } catch (error) {
      console.error('Error updating odds:', error);
    }
  };

  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fi-FI', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-primary text-2xl font-heading neon-text">Ladataan...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" data-testid="home-page">
      <Navigation />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-primary/20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center space-y-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 text-primary px-4 py-2 rounded-full text-sm font-semibold neon-glow">
              <Zap className="w-4 h-4" />
              GPT-5.2 Teko\u00e4ly + Todenn\u00e4k\u00f6isyyslaskelmat
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight" data-testid="hero-title">
              <span className="gradient-text neon-text">Asiantuntija</span><br />
              <span className="text-foreground">Analyysit</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed" data-testid="hero-subtitle">
              Syvälliset tilastolliset analyysit, vedonlyöntivinkit ja ennusteet<br />
              suurimpiin urheilusarjoihin - yksi ilmainen analyysi käytettävissä!
            </p>
            {!user && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button 
                  onClick={() => setAuthOpen(true)} 
                  size="lg" 
                  className="gradient-button text-lg px-10 py-6 font-bold uppercase tracking-wider"
                  data-testid="hero-cta-button"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Aloita ilmaiseksi
                </Button>
                <Button 
                  onClick={() => navigate('/pricing')} 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-10 py-6 font-semibold border-primary/30 hover:border-primary"
                  data-testid="hero-pricing-button"
                >
                  Näytä hinnat
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Matches Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Live Scores */}
        <div className="mb-16">
          <LiveScores />
        </div>

        {/* News Feed */}
        <div className="mb-16">
          <NewsFeed />
        </div>

        <div className="mb-10">
          <h2 className="font-heading text-4xl font-bold mb-2 gradient-text" data-testid="analyses-heading">
            Tulevat analyysit
          </h2>
          <p className="text-muted-foreground">Valitse ottelu ja näe yksityiskohtainen analyysi</p>
        </div>

        <Tabs value={selectedSport} onValueChange={setSelectedSport} className="w-full mb-10" data-testid="sport-tabs">
          <TabsList className="bg-card border border-primary/20">
            <TabsTrigger value="all">Kaikki</TabsTrigger>
            <TabsTrigger value="Football">Jalkapallo</TabsTrigger>
            <TabsTrigger value="Ice Hockey">Jääkiekko</TabsTrigger>
            <TabsTrigger value="Basketball">Koripallo</TabsTrigger>
            <TabsTrigger value="Tennis">Tennis</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="matches-grid">
          {matches.map((match) => (
            <Card 
              key={match.id} 
              className="match-card p-6 space-y-5 group"
              data-testid={`match-card-${match.id}`}
            >
              <div className="flex items-start justify-between">
                <Badge variant="outline" className="text-xs border-primary/40 text-primary" data-testid={`league-badge-${match.id}`}>
                  {match.league}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {formatDate(match.start_time)}
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-center" data-testid={`teams-${match.id}`}>
                  <div className="font-bold text-lg group-hover:text-primary transition-colors">{match.home_team}</div>
                  <div className="text-muted-foreground text-sm my-3 font-semibold">VS</div>
                  <div className="font-bold text-lg group-hover:text-primary transition-colors">{match.away_team}</div>
                </div>

                {match.home_form && match.away_form && (
                  <div className="flex justify-between text-xs pt-3 border-t border-border">
                    <div className="flex gap-1">
                      {match.home_form.split('').map((result, i) => (
                        <span key={i} className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                          result === 'W' ? 'bg-green-500/20 text-green-400' : 
                          result === 'D' ? 'bg-yellow-500/20 text-yellow-400' : 
                          'bg-red-500/20 text-red-400'
                        }`}>{result}</span>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      {match.away_form.split('').map((result, i) => (
                        <span key={i} className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                          result === 'W' ? 'bg-green-500/20 text-green-400' : 
                          result === 'D' ? 'bg-yellow-500/20 text-yellow-400' : 
                          'bg-red-500/20 text-red-400'
                        }`}>{result}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button 
                onClick={() => navigate(`/analysis/${match.id}`)}
                className="w-full gradient-button font-bold uppercase tracking-wider group-hover:scale-105 transition-transform"
                data-testid={`view-analysis-${match.id}`}
              >
                <Target className="w-4 h-4 mr-2" />
                Näytä analyysi
              </Button>
            </Card>
          ))}
        </div>

        {matches.length === 0 && (
          <Card className="p-16 text-center border-primary/20" data-testid="no-matches">
            <Trophy className="w-20 h-20 text-primary/50 mx-auto mb-4" />
            <div className="text-muted-foreground text-lg">
              Ei otteluita valitulle lajille
            </div>
          </Card>
        )}
      </div>

      {/* Features Section */}
      <div className="border-t border-primary/20 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-4xl font-bold text-center mb-4 gradient-text">Miksi JPTips?</h2>
          <p className="text-center text-muted-foreground mb-16 text-lg">Ammattimaisia analyysejä joka päivä</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="text-center space-y-4 p-6 rounded-lg border border-primary/20 hover:border-primary/40 transition-colors">
              <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto border border-primary/30">
                <TrendingUp className="w-10 h-10 text-primary" />
              </div>
              <h3 className="font-heading text-xl font-bold">AI-analyysit</h3>
              <p className="text-muted-foreground">GPT-5.2 -pohjainen syväanalyysi joka otteluun todennäköisyyslaskelmilla</p>
            </div>
            <div className="text-center space-y-4 p-6 rounded-lg border border-primary/20 hover:border-primary/40 transition-colors">
              <div className="w-20 h-20 bg-gradient-to-br from-secondary/20 to-primary/20 rounded-full flex items-center justify-center mx-auto border border-secondary/30">
                <BarChart3 className="w-10 h-10 text-secondary" />
              </div>
              <h3 className="font-heading text-xl font-bold">Tilastot</h3>
              <p className="text-muted-foreground">Kattavat tilastot, joukkueiden muoto ja head-to-head vertailut</p>
            </div>
            <div className="text-center space-y-4 p-6 rounded-lg border border-primary/20 hover:border-primary/40 transition-colors">
              <div className="w-20 h-20 bg-gradient-to-br from-accent/20 to-secondary/20 rounded-full flex items-center justify-center mx-auto border border-accent/30">
                <Trophy className="w-10 h-10 text-accent" />
              </div>
              <h3 className="font-heading text-xl font-bold">Vedonlyöntivinkit</h3>
              <p className="text-muted-foreground">Konkreettiset vinkit ja perustelut vedonlyöntiin asiantuntijoilta</p>
            </div>
          </div>
        </div>
      </div>

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
