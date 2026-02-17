import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Navigation } from '../components/Navigation';
import { AuthDialog } from '../components/AuthDialog';
import { AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Check, Zap, Crown, Star, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function PricingPage() {
  const { user } = useContext(AuthContext);
  const [authOpen, setAuthOpen] = useState(false);
  const [loading, setLoading] = useState(null);
  const navigate = useNavigate();

  const handleSubscribe = async (tier) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }

    if (user.subscription_tier !== 'free') {
      toast.info('Sinulla on jo aktiivinen tilaus!');
      return;
    }

    setLoading(tier);
    try {
      const res = await axios.post(
        `${API}/payments/checkout`,
        { tier },
        { 
          headers: { 
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Origin': window.location.origin
          } 
        }
      );
      window.location.href = res.data.url;
    } catch (error) {
      toast.error('Maksun käynnistäminen epäonnistui');
      setLoading(null);
    }
  };

  const plans = [
    {
      tier: 'basic',
      name: 'Basic',
      price: 4.99,
      icon: Zap,
      gradient: 'from-blue-500 to-blue-600',
      features: [
        'Rajattomat analyysit',
        'Perustilastot',
        'Ennusteet',
        'Vedonlyöntivinkit',
        'Päivittäiset päivitykset'
      ]
    },
    {
      tier: 'pro',
      name: 'Pro',
      price: 9.99,
      icon: Crown,
      gradient: 'from-purple-500 to-purple-600',
      popular: true,
      features: [
        'Kaikki Basic-ominaisuudet',
        'Syväanalyysit',
        'Live-tilastot',
        'Todennäköisyyslaskelmat',
        'Head-to-head vertailut',
        'Priority-tuki'
      ]
    },
    {
      tier: 'premium',
      name: 'Premium',
      price: 14.99,
      icon: Star,
      gradient: 'from-pink-500 to-pink-600',
      features: [
        'Kaikki Pro-ominaisuudet',
        'AI-powered ennusteet',
        'Erikoisanalyysit',
        'Joukkueiden muoto-analyysi',
        'Loukkaantumisraportit',
        'VIP-tuki 24/7',
        'Varhainen pääsy uusiin ominaisuuksiin'
      ]
    }
  ];

  return (
    <div className="min-h-screen" data-testid="pricing-page">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-6 neon-glow">
            <Crown className="w-4 h-4" />
            Valitse sopiva paketti
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold mb-4" data-testid="pricing-heading">
            <span className="gradient-text neon-text">Hinnoittelu</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Aloita ilmaisella analyysillä, päivitä milloin tahansa
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card 
                key={plan.tier}
                className={`p-8 space-y-6 relative overflow-hidden ${
                  plan.popular ? 'border-primary/50 shadow-2xl' : 'border-primary/30'
                }`}
                data-testid={`${plan.tier}-plan-card`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-gradient-to-r from-primary to-accent text-white px-4 py-1 text-xs font-bold uppercase">
                      Suosituin
                    </div>
                  </div>
                )}

                <div className="text-center">
                  <div className={`w-16 h-16 bg-gradient-to-br ${plan.gradient} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-heading text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-heading font-bold gradient-text">€{plan.price.toFixed(2)}</span>
                    <span className="text-muted-foreground">/kk</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3" data-testid={`${plan.tier}-feature-${i}`}>
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => handleSubscribe(plan.tier)}
                  disabled={loading === plan.tier || (user && user.subscription_tier !== 'free')}
                  className={`w-full font-bold uppercase tracking-wider ${
                    plan.popular ? 'gradient-button' : 'bg-primary/20 hover:bg-primary/30 border border-primary/40'
                  }`}
                  size="lg"
                  data-testid={`${plan.tier}-subscribe-button`}
                >
                  {loading === plan.tier ? 'Käsitellään...' : 
                   user && user.subscription_tier !== 'free' ? 'Aktiivinen' : 
                   'Tilaa nyt'}
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Payment Methods */}
        <div className="text-center mb-16">
          <h2 className="font-heading text-2xl font-bold mb-6 gradient-text">Maksutavat</h2>
          <div className="flex flex-wrap items-center justify-center gap-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="w-6 h-6" />
              <span>Pankkikortit</span>
            </div>
            <div className="text-muted-foreground font-semibold">PayPal</div>
            <div className="text-muted-foreground font-semibold">Trustly</div>
            <div className="text-muted-foreground font-semibold">Neteller</div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">Turvallinen maksu Stripe-palvelun kautta</p>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="font-heading text-3xl font-bold text-center mb-8 gradient-text">Usein kysytyt kysymykset</h2>
          <div className="space-y-4">
            <Card className="p-6 border-primary/30" data-testid="faq-1">
              <div className="font-bold mb-2 text-primary">Miten ilmainen analyysi toimii?</div>
              <div className="text-sm text-muted-foreground">
                Rekisteröidy ilmaiseksi ja saat yhden täydellisen analyysin ilmaiseksi. Sen jälkeen voit tilata Premium-paketin nähdäksesi rajattomat analyysit.
              </div>
            </Card>
            <Card className="p-6 border-primary/30" data-testid="faq-2">
              <div className="font-bold mb-2 text-primary">Voinko peruuttaa tilauksen?</div>
              <div className="text-sm text-muted-foreground">
                Kyllä, voit peruuttaa tilauksen milloin tahansa. Tilaus pysyy aktiivisena laskutuskauden loppuun asti.
              </div>
            </Card>
            <Card className="p-6 border-primary/30" data-testid="faq-3">
              <div className="font-bold mb-2 text-primary">Kuinka tarkkoja ennusteet ovat?</div>
              <div className="text-sm text-muted-foreground">
                Ennusteemme perustuvat GPT-5.2 -tekoälyyn ja kattavaan tilastoanalyysiin. Todennäköisyydet lasketaan historiallisen datan ja joukkueiden muodon perusteella.
              </div>
            </Card>
            <Card className="p-6 border-primary/30" data-testid="faq-4">
              <div className="font-bold mb-2 text-primary">Mitä maksutapoja hyväksytään?</div>
              <div className="text-sm text-muted-foreground">
                Hyväksymme kaikki suurimmat pankkikortit, PayPalin, Trustlyn ja Netellerin Stripen kautta.
              </div>
            </Card>
          </div>
        </div>
      </div>

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}