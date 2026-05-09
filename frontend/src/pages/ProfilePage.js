import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '../components/Navigation';
import { AuthContext } from '../App';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { User, Mail, Calendar, TrendingUp, Crown } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const getTierInfo = (tier) => {
    const tiers = {
      free: { name: 'Ilmainen', color: 'bg-gray-500', icon: User },
      basic: { name: 'Basic', color: 'bg-blue-500', icon: TrendingUp },
      pro: { name: 'Pro', color: 'bg-purple-500', icon: Crown },
      premium: { name: 'Premium', color: 'bg-pink-500', icon: Crown }
    };
    return tiers[tier] || tiers.free;
  };

  const tierInfo = getTierInfo(user?.subscription_tier);
  const Icon = tierInfo.icon;

  return (
    <div className="min-h-screen" data-testid="profile-page">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-heading text-4xl font-bold mb-2 gradient-text" data-testid="profile-heading">
          Profiili
        </h1>
        <p className="text-muted-foreground mb-12">Hallinnoi tiliäsi ja tilauksiasi</p>

        {/* User Info Card */}
        <Card className="p-8 mb-8 border-primary/30">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="font-heading text-2xl font-bold" data-testid="profile-username">{user?.username}</h2>
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  <Mail className="w-4 h-4" />
                  <span data-testid="profile-email">{user?.email}</span>
                </div>
              </div>
            </div>
            <Badge className={`${tierInfo.color} text-white px-4 py-2 flex items-center gap-2`} data-testid="tier-badge">
              <Icon className="w-4 h-4" />
              {tierInfo.name}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Liittymispäivä</div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>{new Date(user?.created_at).toLocaleDateString('fi-FI')}</span>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Tilaus</div>
              <div className="font-semibold">{tierInfo.name}-tilaus</div>
            </div>
          </div>
        </Card>

        {/* Subscription Info */}
        <Card className="p-8 mb-8 border-primary/30">
          <h3 className="font-heading text-xl font-bold mb-6">Tilauksen tiedot</h3>
          
          {user?.subscription_tier === 'free' ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-4">
                Sinulla on ilmainen tilaus.
              </div>
              <div className="mb-6">
                <div className="text-3xl font-heading font-bold gradient-text mb-2">
                  {user?.free_analyses_used || 0} / 1
                </div>
                <div className="text-sm text-muted-foreground">Ilmaisia analyysejä käytetty</div>
              </div>
              <Button 
                onClick={() => navigate('/pricing')} 
                className="gradient-button font-bold uppercase tracking-wider"
                size="lg"
                data-testid="upgrade-button"
              >
                <Crown className="w-5 h-5 mr-2" />
                Päivitä Premium
              </Button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Aktiivinen paketti</div>
                  <div className="font-heading text-2xl font-bold gradient-text">{tierInfo.name}</div>
                </div>
                <Badge className={`${tierInfo.color} text-white px-4 py-2`}>
                  Aktiivinen
                </Badge>
              </div>
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="text-sm text-muted-foreground">Ominaisuudet:</div>
                <ul className="mt-2 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    Rajattomat analyysit
                  </li>
                  {user?.subscription_tier !== 'basic' && (
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      Syväanalyysit ja tilastot
                    </li>
                  )}
                  {user?.subscription_tier === 'premium' && (
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      AI-powered ennusteet
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button 
            onClick={() => navigate('/')} 
            variant="outline" 
            className="border-primary/40 hover:border-primary"
            data-testid="browse-analyses-button"
          >
            Selaa analyysejä
          </Button>
          {user?.subscription_tier === 'free' && (
            <Button 
              onClick={() => navigate('/pricing')} 
              className="gradient-button font-semibold"
              data-testid="view-plans-button"
            >
              Katso paketit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
