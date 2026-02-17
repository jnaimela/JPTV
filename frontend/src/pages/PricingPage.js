import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Navigation } from '../components/Navigation';
import { AuthDialog } from '../components/AuthDialog';
import { AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Check, Sparkles, Crown } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function PricingPage() {
  const { user } = useContext(AuthContext);
  const [authOpen, setAuthOpen] = useState(false);
  const [loading, setLoading] = useState(null);
  const navigate = useNavigate();

  const handleSubscribe = async (packageId) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }

    setLoading(packageId);
    try {
      const res = await axios.post(
        `${API}/payments/checkout`,
        { package_id: packageId },
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

  const features = [
    'AI-pohjainen veto generaattori',
    'Syvälliset otteluanalyysit',
    'Tilastot viimeiseltä 5 vuodelta',
    'Reaaliaikaiset kertoimet',
    'Priority-tuki',
    'Rajoittamaton vetohistoria'
  ];

  return (
    <div className="min-h-screen" data-testid="pricing-page">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Crown className="w-12 h-12 text-accent" />
            <h1 className="font-heading text-5xl sm:text-6xl font-black tracking-tight" data-testid="pricing-heading">
              <span className="text-primary">PREMIUM</span> PAKETIT
            </h1>
          </div>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Avaa AI-analyysien voima ja tee parempia vetopaatoksia
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Monthly Plan */}
          <Card 
            className="glassmorphism p-8 space-y-6 border-primary/30 hover:border-primary/50 transition-all"
            data-testid="monthly-plan-card"
          >
            <div>
              <div className="text-sm text-muted-foreground mb-2">Kuukausittainen</div>
              <div className="flex items-baseline gap-2">
                <span className="font-heading text-5xl font-black text-primary">€9.99</span>
                <span className="text-muted-foreground">/kk</span>
              </div>
            </div>

            <div className="space-y-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3" data-testid={`monthly-feature-${index}`}>
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={() => handleSubscribe('premium_monthly')}
              disabled={loading === 'premium_monthly' || user?.is_premium}
              className="w-full neon-glow text-lg py-6 font-bold uppercase"
              data-testid="monthly-subscribe-button"
            >
              {loading === 'premium_monthly' ? 'Käsitellään...' : user?.is_premium ? 'Aktiivinen' : 'Tilaa nyt'}
            </Button>
          </Card>

          {/* Yearly Plan */}
          <Card 
            className="glassmorphism p-8 space-y-6 border-accent/50 relative overflow-hidden"
            data-testid="yearly-plan-card"
          >
            <div className="absolute top-4 right-4">
              <div className="bg-accent text-accent-foreground px-3 py-1 rounded-sm text-xs font-bold uppercase">
                SÄÄSTÄ 17%
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-2">Vuosittainen</div>
              <div className="flex items-baseline gap-2">
                <span className="font-heading text-5xl font-black text-accent">€99.99</span>
                <span className="text-muted-foreground">/vuosi</span>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Vain €8.33/kk
              </div>
            </div>

            <div className="space-y-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3" data-testid={`yearly-feature-${index}`}>
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
              <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                <Sparkles className="w-5 h-5 text-accent flex-shrink-0" />
                <span className="font-bold text-accent">2 kuukautta ilmaiseksi!</span>
              </div>
            </div>

            <Button
              onClick={() => handleSubscribe('premium_yearly')}
              disabled={loading === 'premium_yearly' || user?.is_premium}
              className="w-full neon-glow-accent text-lg py-6 font-bold uppercase"
              data-testid="yearly-subscribe-button"
            >
              {loading === 'premium_yearly' ? 'Käsitellään...' : user?.is_premium ? 'Aktiivinen' : 'Tilaa nyt'}
            </Button>
          </Card>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="font-heading text-3xl font-bold text-center mb-8">Usein kysytyttä</h2>
          <div className="space-y-4">
            <Card className="glassmorphism p-6" data-testid="faq-1">
              <div className="font-bold mb-2">Miten AI-analyysit toimivat?</div>
              <div className="text-sm text-muted-foreground">
                Käytämme GPT-5.2 -tekoälyä analysoimaan otteluita ja luomaan vetoennusteita perustuen laajaan tilastotietoon ja historiallisiin trendeihin.
              </div>
            </Card>
            <Card className="glassmorphism p-6" data-testid="faq-2">
              <div className="font-bold mb-2">Voinko peruuttaa tilauksen?</div>
              <div className="text-sm text-muted-foreground">
                Kyllä, voit peruuttaa tilauksen milloin tahansa. Tilaus pysyy aktiivisena laskutuskauden loppuun asti.
              </div>
            </Card>
            <Card className="glassmorphism p-6" data-testid="faq-3">
              <div className="font-bold mb-2">Mitä maksutapoja hyväksytään?</div>
              <div className="text-sm text-muted-foreground">
                Hyväksymme kaikki suurimmat luotto- ja pankkikortit Stripen kautta.
              </div>
            </Card>
          </div>
        </div>
      </div>

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}