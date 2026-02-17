import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Navigation } from '../components/Navigation';
import { AuthDialog } from '../components/AuthDialog';
import { AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { TrendingUp, Calendar, Trophy } from 'lucide-react';
import { toast } from 'sonner';

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
  }, [selectedSport]);

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
          <div className="text-primary text-2xl font-heading">Ladataan...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="home-page">
      <Navigation />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-secondary/10 via-background to-primary/5 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold">
              <TrendingUp className="w-4 h-4" />
              AI-pohjaiset analyysit
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight" data-testid="hero-title">
              Asiantuntija-analyysit<br />
              <span className="text-primary">jokaiseen otteluun</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto" data-testid="hero-subtitle">
              Syvälliset tilastolliset analyysit, vedonlyöntivinkit ja ennusteet suurimpiin urheilusarjoihin
            </p>
            {!user && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => setAuthOpen(true)} 
                  size="lg" 
                  className="bg-primary hover:bg-primary/90 text-lg px-8 font-semibold"
                  data-testid="hero-cta-button"
                >
                  Aloita ilmaiseksi
                </Button>
                <Button 
                  onClick={() => navigate('/pricing')} 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-8 font-semibold"
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="font-heading text-3xl font-bold mb-6" data-testid="analyses-heading">
            Tulevat analyysit
          </h2>
          
          <Tabs value={selectedSport} onValueChange={setSelectedSport} className="w-full" data-testid="sport-tabs">
            <TabsList className="mb-6">
              <TabsTrigger value="all">Kaikki</TabsTrigger>
              <TabsTrigger value="Football">Jalkapallo</TabsTrigger>
              <TabsTrigger value="Ice Hockey">Jääkiekko</TabsTrigger>
              <TabsTrigger value="Basketball">Koripallo</TabsTrigger>
              <TabsTrigger value="Tennis">Tennis</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="matches-grid">
          {matches.map((match) => (
            <Card 
              key={match.id} 
              className="match-card p-6 space-y-4 hover:shadow-lg cursor-pointer"
              onClick={() => navigate(`/analysis/${match.id}`)}
              data-testid={`match-card-${match.id}`}
            >
              <div className="flex items-start justify-between">
                <Badge variant="outline" className="text-xs" data-testid={`league-badge-${match.id}`}>
                  {match.league}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {formatDate(match.start_time)}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-center" data-testid={`teams-${match.id}`}>
                  <div className="font-semibold text-lg">{match.home_team}</div>
                  <div className="text-muted-foreground text-sm my-2">vs</div>
                  <div className="font-semibold text-lg">{match.away_team}</div>
                </div>

                {match.home_form && match.away_form && (
                  <div className="flex justify-between text-xs">
                    <div className="flex gap-1">
                      {match.home_form.split('').map((result, i) => (
                        <span key={i} className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          result === 'W' ? 'bg-green-500/20 text-green-500' : 
                          result === 'D' ? 'bg-yellow-500/20 text-yellow-500' : 
                          'bg-red-500/20 text-red-500'
                        }`}>{result}</span>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      {match.away_form.split('').map((result, i) => (
                        <span key={i} className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          result === 'W' ? 'bg-green-500/20 text-green-500' : 
                          result === 'D' ? 'bg-yellow-500/20 text-yellow-500' : 
                          'bg-red-500/20 text-red-500'
                        }`}>{result}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button 
                className="w-full bg-primary hover:bg-primary/90 font-semibold"
                data-testid={`view-analysis-${match.id}`}
              >
                Näytä analyysi
              </Button>
            </Card>
          ))}
        </div>

        {matches.length === 0 && (
          <Card className="p-12 text-center" data-testid="no-matches">
            <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <div className="text-muted-foreground text-lg">
              Ei otteluita valitulle lajille
            </div>
          </Card>
        )}
      </div>

      {/* Features Section */}
      <div className="bg-muted/30 py-16 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-3xl font-bold text-center mb-12">Miksi ProSportsTips?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-heading text-xl font-bold">AI-analyysit</h3>
              <p className="text-muted-foreground">GPT-5.2 -pohjainen syväanalyysi joka otteluun</p>
            </div>
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <BarChart3 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-heading text-xl font-bold">Tilastot</h3>
              <p className="text-muted-foreground">Kattavat tilastot ja joukkueiden muoto-analyysi</p>
            </div>
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Trophy className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-heading text-xl font-bold">Vedonlyöntivinkit</h3>
              <p className="text-muted-foreground">Konkreettiset vinkit ja perustelut vedonlyöntiin</p>
            </div>
          </div>
        </div>
      </div>

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}