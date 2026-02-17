import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Navigation } from '../components/Navigation';
import { AuthDialog } from '../components/AuthDialog';
import { AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Lock, TrendingUp, Target, BarChart3, Lightbulb, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AnalysisPage() {
  const { matchId } = useParams();
  const { user, token, refreshUser } = useContext(AuthContext);
  const [match, setMatch] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadMatchAndAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, user]);

  const loadMatchAndAnalysis = async () => {
    try {
      const matchRes = await axios.get(`${API}/matches/${matchId}`);
      setMatch(matchRes.data);

      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const analysisRes = await axios.get(`${API}/analyses/${matchId}`, { headers });
        setAnalysis(analysisRes.data);
      } catch (error) {
        if (error.response?.status === 404) {
          await generateAnalysis();
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const generateAnalysis = async () => {
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/analyses/generate?match_id=${matchId}`);
      setAnalysis({ ...res.data, locked: true });
    } catch (error) {
      console.error('Error generating analysis:', error);
    }
    setGenerating(false);
  };

  const unlockAnalysis = async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }

    if (user.subscription_tier !== 'free') {
      await loadMatchAndAnalysis();
      return;
    }

    if (user.free_analyses_used >= 1) {
      toast.error('Ilmainen analyysi on käytetty. Tilaa premium!');
      navigate('/pricing');
      return;
    }

    setUnlocking(true);
    try {
      await axios.post(
        `${API}/analyses/${matchId}/unlock`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await refreshUser();
      await loadMatchAndAnalysis();
      toast.success('Analyysi avattu!');
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Ilmainen analyysi on käytetty!');
        navigate('/pricing');
      } else {
        toast.error('Virhe analyysin avaamisessa');
      }
    }
    setUnlocking(false);
  };

  if (loading || !match) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-primary text-2xl font-heading neon-text">Ladataan...</div>
        </div>
      </div>
    );
  }

  const isLocked = analysis?.locked !== false;
  const canUnlock = user && user.subscription_tier === 'free' && user.free_analyses_used < 1;
  const hasSubscription = user && user.subscription_tier !== 'free';

  return (
    <div className="min-h-screen" data-testid="analysis-page">
      <Navigation />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Match Header */}
        <Card className="p-8 mb-8 border-primary/30">
          <div className="flex items-start justify-between mb-6">
            <Badge variant="outline" className="border-primary/40 text-primary">{match.league}</Badge>
            <Badge variant="outline">{match.sport}</Badge>
          </div>
          <div className="text-center space-y-4">
            <div className="font-heading text-3xl font-bold gradient-text">{match.home_team}</div>
            <div className="text-muted-foreground font-bold text-xl">VS</div>
            <div className="font-heading text-3xl font-bold gradient-text">{match.away_team}</div>
          </div>
          {match.home_form && match.away_form && (
            <div className="flex justify-between mt-6 pt-6 border-t border-border">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-2">Kotimuoto</div>
                <div className="flex gap-1 justify-center">
                  {match.home_form.split('').map((result, i) => (
                    <span key={i} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      result === 'W' ? 'bg-green-500/20 text-green-400' : 
                      result === 'D' ? 'bg-yellow-500/20 text-yellow-400' : 
                      'bg-red-500/20 text-red-400'
                    }`}>{result}</span>
                  ))}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-2">Vierasmuoto</div>
                <div className="flex gap-1 justify-center">
                  {match.away_form.split('').map((result, i) => (
                    <span key={i} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      result === 'W' ? 'bg-green-500/20 text-green-400' : 
                      result === 'D' ? 'bg-yellow-500/20 text-yellow-400' : 
                      'bg-red-500/20 text-red-400'
                    }`}>{result}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Analysis Content */}
        {generating ? (
          <Card className="p-12 text-center border-primary/30">
            <div className="text-primary text-xl font-heading mb-4 neon-text">Generoidaan analyysiä...</div>
            <Progress value={66} className="w-full" />
          </Card>
        ) : analysis ? (
          <div className="space-y-6">
            {/* Prediction */}
            <Card className="p-6 border-primary/30">
              <div className="flex items-center gap-3 mb-4">
                <Target className="w-6 h-6 text-primary" />
                <h2 className="font-heading text-2xl font-bold">Ennuste</h2>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-heading font-bold gradient-text">{analysis.prediction}</div>
                  <div className="text-sm text-muted-foreground mt-1">Todennäköisyys</div>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-heading font-bold text-primary">{(analysis.confidence * 100).toFixed(0)}%</div>
                  <Progress value={analysis.confidence * 100} className="w-32 mt-2" />
                </div>
              </div>
            </Card>

            {/* Key Factors - Always visible */}
            <Card className="p-6 border-primary/30">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-6 h-6 text-primary" />
                <h2 className="font-heading text-2xl font-bold">Keskeiset tekijät</h2>
              </div>
              <ul className="space-y-3">
                {analysis.key_factors.map((factor, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary font-bold text-sm">{i + 1}</span>
                    </div>
                    <span className="text-foreground">{factor}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Preview - Always visible */}
            <Card className="p-6 border-primary/30">
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="w-6 h-6 text-primary" />
                <h2 className="font-heading text-2xl font-bold">Analyysi esikatselu</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">{analysis.preview}</p>
            </Card>

            {/* Locked Content */}
            {isLocked && (
              <Card className="p-8 text-center border-primary/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card"></div>
                <Lock className="w-16 h-16 text-primary mx-auto mb-4 neon-glow" />
                <h3 className="font-heading text-2xl font-bold mb-2 gradient-text">Syväanalyysi lukittu</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {canUnlock ? (
                    <>Käytä ilmainen analyysisi ja näe täydellinen analyysi, tilastot ja vedonlyöntivinkit!</>
                  ) : hasSubscription ? (
                    <>Lataa sivu uudelleen nähdäksesi täydellisen analyysin tilauksellasi.</>                  ) : (
                    <>Tilaa Premium nähdäksesi täydelliset analyysit, tilastot ja vedonlyöntivinkit!</>
                  )}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {canUnlock && (
                    <Button
                      onClick={unlockAnalysis}
                      disabled={unlocking}
                      className="gradient-button font-bold uppercase tracking-wider"
                      size="lg"
                      data-testid="unlock-free-button"
                    >
                      {unlocking ? 'Avataan...' : 'Käytä ilmainen analyysi'}
                    </Button>
                  )}
                  {!hasSubscription && (
                    <Button
                      onClick={() => navigate('/pricing')}
                      variant="outline"
                      className="border-primary/40 hover:border-primary"
                      size="lg"
                      data-testid="upgrade-button"
                    >
                      Tilaa Premium
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {/* Full Analysis - Only visible when unlocked */}
            {!isLocked && (
              <>
                <Card className="p-6 border-primary/30">
                  <div className="flex items-center gap-3 mb-4">
                    <BarChart3 className="w-6 h-6 text-primary" />
                    <h2 className="font-heading text-2xl font-bold">Tilastollinen analyysi</h2>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">{analysis.stats_analysis}</p>
                  </div>
                </Card>

                <Card className="p-6 border-primary/30">
                  <div className="flex items-center gap-3 mb-4">
                    <Lightbulb className="w-6 h-6 text-primary" />
                    <h2 className="font-heading text-2xl font-bold">Vedonlyöntivinkit</h2>
                  </div>
                  <div className="space-y-4">
                    {analysis.betting_tips.map((tip, i) => (
                      <div key={i} className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold">{i + 1}</span>
                          </div>
                          <p className="text-foreground pt-1">{tip}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6 border-primary/30">
                  <div className="flex items-center gap-3 mb-4">
                    <TrendingUp className="w-6 h-6 text-primary" />
                    <h2 className="font-heading text-2xl font-bold">Syväanalyysi</h2>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">{analysis.full_analysis}</p>
                  </div>
                </Card>
              </>
            )}
          </div>
        ) : (
          <Card className="p-12 text-center border-primary/30">
            <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <div className="text-muted-foreground text-lg">Analyysiä ei löytynyt</div>
          </Card>
        )}
      </div>

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}