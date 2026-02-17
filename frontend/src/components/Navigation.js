import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { AuthDialog } from './AuthDialog';
import { Button } from './ui/button';
import { TrendingUp, User, LogOut } from 'lucide-react';

export const Navigation = () => {
  const { user, logout } = useContext(AuthContext);
  const [authOpen, setAuthOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getTierBadge = (tier) => {
    const badges = {
      basic: { text: 'BASIC', gradient: 'from-blue-500 to-blue-600' },
      pro: { text: 'PRO', gradient: 'from-purple-500 to-purple-600' },
      premium: { text: 'PREMIUM', gradient: 'from-pink-500 to-pink-600' }
    };
    return badges[tier] || null;
  };

  return (
    <>
      <nav data-testid="main-navigation" className="border-b border-primary/20 bg-card/30 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-3 group" data-testid="logo-link">
              <TrendingUp className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" strokeWidth={2.5} />
              <span className="font-heading text-2xl font-bold tracking-wider neon-text">
                <span className="gradient-text">JP</span>Tips
              </span>
            </Link>

            <div className="flex items-center gap-4">
              {user ? (
                <>
                  {user.subscription_tier !== 'free' && getTierBadge(user.subscription_tier) && (
                    <div data-testid="tier-badge" className={`px-3 py-1 rounded-md bg-gradient-to-r ${getTierBadge(user.subscription_tier).gradient} text-white text-xs font-bold uppercase`}>
                      {getTierBadge(user.subscription_tier).text}
                    </div>
                  )}
                  <Link to="/profile" data-testid="nav-profile">
                    <Button variant="ghost" className="gap-2 hover:text-primary">
                      <User className="w-4 h-4" />
                      {user.username}
                    </Button>
                  </Link>
                  <Button onClick={handleLogout} variant="ghost" size="icon" className="hover:text-primary" data-testid="logout-button">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={() => setAuthOpen(true)}
                    variant="outline" 
                    className="border-primary/40 hover:border-primary font-semibold"
                    data-testid="nav-login-button"
                  >
                    Kirjaudu sisään
                  </Button>
                  <Link to="/pricing" data-testid="nav-pricing">
                    <Button className="gradient-button font-semibold">
                      Aloita ilmaiseksi
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
};
