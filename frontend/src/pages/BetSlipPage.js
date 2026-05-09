import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Navigation } from '../components/Navigation';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Trash2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function BetSlipPage() {
  const [bets, setBets] = useState([]);
  const [amount, setAmount] = useState(10);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('betSlip');
    if (saved) {
      setBets(JSON.parse(saved));
    }
  }, []);

  const removeBet = (index) => {
    const updated = bets.filter((_, i) => i !== index);
    setBets(updated);
    localStorage.setItem('betSlip', JSON.stringify(updated));
    toast.success('Poistettu vetolapusta');
  };

  const totalOdds = bets.reduce((acc, bet) => acc * bet.odds, 1);
  const potentialWin = (amount * totalOdds).toFixed(2);

  const placeBetSlip = async () => {
    try {
      await axios.post(
        `${API}/bet-slips`,
        {
          bets: bets,
          total_amount: parseFloat(amount)
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success('Vetolappu asetettu!');
      localStorage.removeItem('betSlip');
      navigate('/profile');
    } catch (error) {
      toast.error('Vetolappun asettaminen epäonnistui');
    }
  };

  if (bets.length === 0) {
    return (
      <div className="min-h-screen" data-testid="bet-slip-page">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="glassmorphism p-12 text-center" data-testid="empty-bet-slip">
            <div className="text-muted-foreground text-lg">
              Vetolappu on tyhjä. Lisää vetoja aloittaaksesi!
            </div>
            <Button onClick={() => navigate('/')} className="mt-6" data-testid="back-to-home-button">
              Takaisin etusivulle
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" data-testid="bet-slip-page">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-heading text-5xl font-black tracking-tight mb-8" data-testid="bet-slip-heading">
          VETOLAPPU
        </h1>

        <div className="space-y-6">
          {bets.map((bet, index) => (
            <Card key={`bet-${bet.match_id || index}`} className="glassmorphism p-6" data-testid={`bet-item-${index}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-heading text-xl font-bold">{bet.match}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {bet.sport} - {bet.bet_type}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="font-heading text-2xl font-black text-primary" data-testid={`bet-odds-${index}`}>
                    {bet.odds}
                  </div>
                  <Button
                    onClick={() => removeBet(index)}
                    variant="ghost"
                    size="icon"
                    data-testid={`remove-bet-${index}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          <Card className="glassmorphism p-6 space-y-6 border-primary/30">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-lg">
                <span>Kokonaiskertoimet:</span>
                <span className="font-heading text-3xl font-black text-primary" data-testid="total-odds">
                  {totalOdds.toFixed(2)}
                </span>
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground">Panoksen määrä (€)</label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-2"
                  min="1"
                  step="0.01"
                  data-testid="bet-amount-input"
                />
              </div>

              <div className="flex items-center justify-between text-xl border-t border-white/10 pt-4">
                <span className="font-heading font-bold">Mahdollinen voitto:</span>
                <span className="font-heading text-4xl font-black text-success" data-testid="potential-win">
                  €{potentialWin}
                </span>
              </div>
            </div>

            <Button
              onClick={placeBetSlip}
              className="w-full neon-glow text-lg py-6 font-bold uppercase"
              data-testid="place-bet-button"
            >
              <DollarSign className="w-5 h-5 mr-2" />
              Aseta veto
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
