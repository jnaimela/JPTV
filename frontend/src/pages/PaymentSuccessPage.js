import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Navigation } from '../components/Navigation';
import { AuthContext } from '../App';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('loading');
  const [attempts, setAttempts] = useState(0);
  const navigate = useNavigate();
  const { refreshUser } = useContext(AuthContext);

  useEffect(() => {
    if (sessionId) {
      checkPaymentStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, attempts]);

  const checkPaymentStatus = async () => {
    if (attempts >= 5) {
      setStatus('timeout');
      return;
    }

    try {
      const res = await axios.get(
        `${API}/payments/status/${sessionId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      if (res.data.payment_status === 'paid') {
        setStatus('success');
        await refreshUser();
      } else if (res.data.status === 'expired') {
        setStatus('error');
      } else {
        setTimeout(() => setAttempts(attempts + 1), 2000);
      }
    } catch (error) {
      // Error logged
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen" data-testid="payment-success-page">
      <Navigation />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {status === 'loading' && (
          <Card className="p-12 text-center border-primary/30" data-testid="payment-loading">
            <Loader2 className="w-20 h-20 text-primary mx-auto mb-6 animate-spin" />
            <h1 className="font-heading text-3xl font-bold mb-4 gradient-text">Tarkistetaan maksua...</h1>
            <p className="text-muted-foreground">
              Odota hetki, käsittelemme maksusi.
            </p>
          </Card>
        )}

        {status === 'success' && (
          <Card className="p-12 text-center border-green-500/30" data-testid="payment-success">
            <CheckCircle2 className="w-20 h-20 text-green-400 mx-auto mb-6" />
            <h1 className="font-heading text-4xl font-bold mb-4 gradient-text">
              MAKSU ONNISTUI!
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Kiitos tilauksestasi! Premium-ominaisuudet ovat nyt käytettävissäsi.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('/')} 
                className="gradient-button font-bold uppercase"
                size="lg"
                data-testid="browse-analyses-button"
              >
                Selaa analyysejä
              </Button>
              <Button 
                onClick={() => navigate('/profile')} 
                variant="outline" 
                className="border-primary/40 hover:border-primary"
                size="lg"
                data-testid="go-to-profile-button"
              >
                Profiiliin
              </Button>
            </div>
          </Card>
        )}

        {status === 'error' && (
          <Card className="p-12 text-center border-red-500/30" data-testid="payment-error">
            <AlertCircle className="w-20 h-20 text-red-400 mx-auto mb-6" />
            <h1 className="font-heading text-3xl font-bold mb-4 text-red-400">
              Maksun käsittely epäonnistui
            </h1>
            <p className="text-muted-foreground mb-8">
              Jotain meni pieleen. Yritä uudelleen tai ota yhteyttä tukeen.
            </p>
            <Button 
              onClick={() => navigate('/pricing')} 
              className="gradient-button"
              size="lg"
              data-testid="retry-payment-button"
            >
              Takaisin hinnoitteluun
            </Button>
          </Card>
        )}

        {status === 'timeout' && (
          <Card className="p-12 text-center border-yellow-500/30" data-testid="payment-timeout">
            <AlertCircle className="w-20 h-20 text-yellow-400 mx-auto mb-6" />
            <h1 className="font-heading text-3xl font-bold mb-4 text-yellow-400">
              Maksun tarkistus aikakatkais tui
            </h1>
            <p className="text-muted-foreground mb-8">
              Maksun käsittely voi kestää hetken. Tarkista sähköpostisi vahvistusta varten.
            </p>
            <Button 
              onClick={() => navigate('/profile')} 
              className="gradient-button"
              size="lg"
              data-testid="check-profile-button"
            >
              Tarkista profiili
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
