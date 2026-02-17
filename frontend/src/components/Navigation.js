import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { Button } from './ui/button';
import { Trophy, TrendingUp, BarChart3, User, LogOut, CreditCard } from 'lucide-react';

export const Navigation = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav data-testid="main-navigation" className="glassmorphism border-b border-white/5 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link to="/" className="flex items-center gap-3" data-testid="logo-link">
            <Trophy className="w-10 h-10 text-primary" strokeWidth={2.5} />
            <span className="font-heading text-3xl font-black tracking-tighter">
              NEON<span className="text-primary">BET</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/" data-testid="nav-home">
              <Button variant="ghost" className="font-bold uppercase text-sm">
                Etusivu
              </Button>
            </Link>
            <Link to="/live" data-testid="nav-live">
              <Button variant="ghost" className="font-bold uppercase text-sm">
                <TrendingUp className="w-4 h-4 mr-2" />
                Live
              </Button>
            </Link>
            <Link to="/analysis" data-testid="nav-analysis">
              <Button variant="ghost" className="font-bold uppercase text-sm">
                <BarChart3 className="w-4 h-4 mr-2" />
                Analyysit
              </Button>
            </Link>
            <Link to="/statistics" data-testid="nav-statistics">
              <Button variant="ghost" className="font-bold uppercase text-sm">
                Tilastot
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                {user.is_premium && (
                  <div data-testid="premium-badge" className="px-3 py-1 rounded-sm bg-accent/20 border border-accent text-accent text-xs font-bold uppercase">
                    PREMIUM
                  </div>
                )}
                <Link to="/profile" data-testid="nav-profile">
                  <Button variant="outline" className="gap-2">
                    <User className="w-4 h-4" />
                    {user.username}
                  </Button>
                </Link>
                <Button onClick={handleLogout} variant="ghost" data-testid="logout-button">
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Link to="/pricing" data-testid="nav-pricing">
                <Button className="neon-glow font-bold uppercase">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Aloita
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};