import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Navigation } from '../components/Navigation';
import { AuthDialog } from '../components/AuthDialog';
import { AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Sparkles, Brain, TrendingUp, Lock } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AnalysisPage() {
  const { user } = useContext(AuthContext);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(null);
  const [analysis, setAnalysis] = useState({});
  const [authOpen, setAuthOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      const res = await axios.get(`${API}/matches`);
      setMatches(res.data.filter(m => m.status === 'upcoming').slice(0, 8));
      setLoading(false);
    } catch (error) {
      console.error('Error loading matches:', error);
      setLoading(false);
    }
  };

  const generateBet = async (matchId) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }

    if (!user.is_premium) {
      navigate('/pricing');
      toast.error('Premium-tilaus vaaditaan AI-ominaisuuksiin');
      return;
    }

    setAnalyzing(matchId);
    try {
      const res = await axios.post(
        `${API}/ai/generate-bet?match_id=${matchId}`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setAnalysis({ ...analysis, [matchId]: res.data });
      toast.success('AI-ennuste luotu!');
    } catch (error) {
      toast.error('Ennusteen luonti epäonnistui');
    }
    setAnalyzing(null);
  };

  const analyzeMatch = async (matchId) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }

    if (!user.is_premium) {
      navigate('/pricing');
      toast.error('Premium-tilaus vaaditaan AI-ominaisuuksiin');
      return;
    }

    setAnalyzing(matchId);
    try {
      const res = await axios.post(
        `${API}/ai/analyze-match?match_id=${matchId}`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setAnalysis({ ...analysis, [matchId]: { ...analysis[matchId], detail: res.data.analysis } });
      toast.success('Syväanalyysi valmis!');
    } catch (error) {
      toast.error('Analyysi epäonnistui');
    }
    setAnalyzing(null);
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
    <div className="min-h-screen" data-testid="analysis-page">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-10 h-10 text-primary" />
            <h1 className="font-heading text-5xl font-black tracking-tight" data-testid="analysis-heading">
              AI <span className="text-primary">ANALYYSIT</span>
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Hyödynnä GPT-5.2 -tekoälyn voimaa vetoennusteiden ja otteluanalyysien tekemisessä
          </p>
        </div>

        {!user?.is_premium && (
          <Card className="glassmorphism p-8 mb-8 border-accent/30" data-testid="premium-banner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Lock className="w-12 h-12 text-accent" />
                <div>
                  <div className="font-heading text-2xl font-bold">Premium-ominaisuus</div>
                  <div className="text-muted-foreground mt-1">
                    Pääse käsiksi AI-analyyseihin ja vetoennusteisiin Premium-tilauksella
                  </div>
                </div>
              </div>
              <Button onClick={() => navigate('/pricing')} className="neon-glow" data-testid="upgrade-premium-button">
                Päivitä Premium
              </Button>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="analysis-matches-grid">
          {matches.map((match) => (
            <Card 
              key={match.id} 
              className="glassmorphism p-6 space-y-6"
              data-testid={`analysis-match-card-${match.id}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="outline" className="mb-2">{match.sport}</Badge>
                  <div className="font-heading text-2xl font-bold">
                    {match.home_team} <span className="text-muted-foreground">vs</span> {match.away_team}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => generateBet(match.id)}
                  disabled={analyzing === match.id}
                  className="flex-1 gap-2"
                  variant="outline"
                  data-testid={`generate-bet-${match.id}`}
                >
                  <Sparkles className="w-4 h-4" />
                  {analyzing === match.id ? 'Generoidaan...' : 'Generoi veto'}
                </Button>
                <Button
                  onClick={() => analyzeMatch(match.id)}
                  disabled={analyzing === match.id}
                  className="flex-1 gap-2"
                  variant="outline"
                  data-testid={`analyze-match-${match.id}`}
                >
                  <TrendingUp className="w-4 h-4" />
                  {analyzing === match.id ? 'Analysoidaan...' : 'Syväanalyysi'}
                </Button>
              </div>

              {analysis[match.id] && (
                <div className="space-y-4 pt-4 border-t border-white/10" data-testid={`analysis-result-${match.id}`}>
                  {analysis[match.id].prediction && (
                    <div className="glassmorphism p-4 rounded-sm">
                      <div className="text-sm text-muted-foreground mb-2">AI-ennuste</div>
                      <div className="flex items-center justify-between">
                        <div className="font-heading text-xl font-bold text-primary">
                          {analysis[match.id].prediction.toUpperCase()}
                        </div>
                        <div className="text-lg">
                          Varmuus: <span className="font-heading font-black text-secondary">
                            {(analysis[match.id].confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="text-sm mt-3">{analysis[match.id].analysis}</div>
                    </div>
                  )}
                  {analysis[match.id].detail && (
                    <div className="glassmorphism p-4 rounded-sm">
                      <div className="text-sm text-muted-foreground mb-2">Syväanalyysi</div>
                      <div className="text-sm whitespace-pre-wrap">{analysis[match.id].detail}</div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}