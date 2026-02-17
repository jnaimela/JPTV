import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Navigation } from '../components/Navigation';
import { AuthContext } from '../App';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Trophy, TrendingUp, TrendingDown } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ProfilePage() {
  const { user } = useContext(AuthContext);
  const [bets, setBets] = useState([]);
  const [betSlips, setBetSlips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [betsRes, slipsRes] = await Promise.all([
        axios.get(`${API}/bets`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/bet-slips`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setBets(betsRes.data);
      setBetSlips(slipsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
      setLoading(false);
    }
  };

  const stats = {
    total: bets.length + betSlips.length,
    won: [...bets, ...betSlips].filter(b => b.status === 'won').length,
    lost: [...bets, ...betSlips].filter(b => b.status === 'lost').length,
    pending: [...bets, ...betSlips].filter(b => b.status === 'pending').length
  };

  const winRate = stats.total > 0 ? ((stats.won / stats.total) * 100).toFixed(1) : 0;

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
    <div className="min-h-screen" data-testid="profile-page">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Profile Header */}
        <div className="mb-12">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-heading text-5xl font-black tracking-tight mb-2" data-testid="profile-username">
                {user?.username}
              </h1>
              <div className="text-muted-foreground" data-testid="profile-email">{user?.email}</div>
            </div>
            {user?.is_premium && (
              <Badge className="bg-accent text-accent-foreground px-4 py-2 text-sm" data-testid="premium-status">
                PREMIUM
              </Badge>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="glassmorphism p-6" data-testid="stat-total">
            <div className="text-sm text-muted-foreground mb-2">Vetoja yhteensä</div>
            <div className="font-heading text-4xl font-black text-primary">{stats.total}</div>
          </Card>
          <Card className="glassmorphism p-6" data-testid="stat-won">
            <div className="text-sm text-muted-foreground mb-2">Voitettu</div>
            <div className="font-heading text-4xl font-black text-success flex items-center gap-2">
              {stats.won}
              <TrendingUp className="w-6 h-6" />
            </div>
          </Card>
          <Card className="glassmorphism p-6" data-testid="stat-lost">
            <div className="text-sm text-muted-foreground mb-2">Hävitty</div>
            <div className="font-heading text-4xl font-black text-error flex items-center gap-2">
              {stats.lost}
              <TrendingDown className="w-6 h-6" />
            </div>
          </Card>
          <Card className="glassmorphism p-6" data-testid="stat-winrate">
            <div className="text-sm text-muted-foreground mb-2">Voitto-%</div>
            <div className="font-heading text-4xl font-black text-secondary flex items-center gap-2">
              {winRate}%
              <Trophy className="w-6 h-6" />
            </div>
          </Card>
        </div>

        {/* Bet History */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6" data-testid="history-tabs">
            <TabsTrigger value="all">Kaikki</TabsTrigger>
            <TabsTrigger value="pending">Odottaa</TabsTrigger>
            <TabsTrigger value="won">Voitettu</TabsTrigger>
            <TabsTrigger value="lost">Hävitty</TabsTrigger>
          </TabsList>

          <TabsContent value="all" data-testid="all-bets-tab">
            <div className="space-y-4">
              {[...bets, ...betSlips].map((bet, index) => (
                <Card key={index} className="glassmorphism p-6" data-testid={`bet-history-${index}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-heading text-lg font-bold">
                        {bet.total_odds ? `Moniveto (${bet.bets?.length} vetoa)` : `Yksittäisveto`}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {new Date(bet.created_at).toLocaleString('fi-FI')}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Kertoimet</div>
                        <div className="font-heading text-xl font-black text-primary">
                          {bet.total_odds?.toFixed(2) || bet.odds?.toFixed(2)}
                        </div>
                      </div>
                      <Badge 
                        className={`
                          ${bet.status === 'won' ? 'bg-success text-black' : ''}
                          ${bet.status === 'lost' ? 'bg-error text-white' : ''}
                          ${bet.status === 'pending' ? 'bg-warning text-black' : ''}
                        `}
                        data-testid={`bet-status-${index}`}
                      >
                        {bet.status === 'won' ? 'Voitettu' : bet.status === 'lost' ? 'Hävitty' : 'Odottaa'}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
              {[...bets, ...betSlips].length === 0 && (
                <Card className="glassmorphism p-12 text-center" data-testid="no-bets">
                  <div className="text-muted-foreground">Ei vetohistoriaa vielä</div>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="pending">
            <div className="space-y-4">
              {[...bets, ...betSlips].filter(b => b.status === 'pending').map((bet, index) => (
                <Card key={index} className="glassmorphism p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-heading text-lg font-bold">
                        {bet.total_odds ? 'Moniveto' : 'Yksittäisveto'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(bet.created_at).toLocaleString('fi-FI')}
                      </div>
                    </div>
                    <Badge className="bg-warning text-black">Odottaa</Badge>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="won">
            <div className="space-y-4">
              {[...bets, ...betSlips].filter(b => b.status === 'won').map((bet, index) => (
                <Card key={index} className="glassmorphism p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-heading text-lg font-bold">
                        {bet.total_odds ? 'Moniveto' : 'Yksittäisveto'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(bet.created_at).toLocaleString('fi-FI')}
                      </div>
                    </div>
                    <Badge className="bg-success text-black">Voitettu</Badge>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="lost">
            <div className="space-y-4">
              {[...bets, ...betSlips].filter(b => b.status === 'lost').map((bet, index) => (
                <Card key={index} className="glassmorphism p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-heading text-lg font-bold">
                        {bet.total_odds ? 'Moniveto' : 'Yksittäisveto'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(bet.created_at).toLocaleString('fi-FI')}
                      </div>
                    </div>
                    <Badge className="bg-error text-white">Hävitty</Badge>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}