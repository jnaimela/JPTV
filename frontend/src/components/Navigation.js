import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { Button } from './ui/button';
import { BarChart3, User, LogOut } from 'lucide-react';

export const Navigation = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getTierBadge = (tier) => {
    const badges = {
      basic: { text: 'BASIC', color: 'bg-blue-500' },
      pro: { text: 'PRO', color: 'bg-primary' },
      premium: { text: 'PREMIUM', color: 'bg-purple-500' }
    };
    return badges[tier] || null;
  };

  return (
    <nav data-testid="main-navigation" className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-3" data-testid="logo-link">
            <BarChart3 className="w-8 h-8 text-primary" strokeWidth={2.5} />
            <span className="font-heading text-2xl font-bold tracking-tight">
              ProSports<span className="text-primary">Tips</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                {user.subscription_tier !== 'free' && getTierBadge(user.subscription_tier) && (
                  <div data-testid="tier-badge" className={`px-3 py-1 rounded-md ${getTierBadge(user.subscription_tier).color} text-white text-xs font-bold uppercase`}>
                    {getTierBadge(user.subscription_tier).text}
                  </div>
                )}
                <Link to="/profile" data-testid="nav-profile">
                  <Button variant="ghost" className="gap-2">
                    <User className="w-4 h-4" />
                    {user.username}
                  </Button>
                </Link>
                <Button onClick={handleLogout} variant="ghost" size="icon" data-testid="logout-button">
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Link to="/pricing" data-testid="nav-pricing">
                <Button className="bg-primary hover:bg-primary/90 font-semibold">
                  Tilaa nyt
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};