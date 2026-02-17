import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Navigation } from '../components/Navigation';
import { Card } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { BarChart3 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function StatisticsPage() {
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const res = await axios.get(`${API}/statistics`);
      setStatistics(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading statistics:', error);
      setLoading(false);
    }
  };

  const sports = ['all', ...new Set(statistics.map(s => s.sport))];
  const years = ['all', ...new Set(statistics.map(s => s.year))].sort().reverse();

  const filteredStats = statistics.filter(stat => {
    if (selectedSport !== 'all' && stat.sport !== selectedSport) return false;
    if (selectedYear !== 'all' && stat.year !== parseInt(selectedYear)) return false;
    return true;
  });

  const groupedByTeam = filteredStats.reduce((acc, stat) => {
    if (!acc[stat.team]) {
      acc[stat.team] = [];
    }
    acc[stat.team].push(stat);
    return acc;
  }, {});

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
    <div className="min-h-screen" data-testid="statistics-page">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-10 h-10 text-primary" />
            <h1 className="font-heading text-5xl font-black tracking-tight" data-testid="statistics-heading">
              TILASTOT <span className="text-primary">2020-2025</span>
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Kattavat tilastot viimeiseltä 5 vuodelta auttavat tekemään parempia vetopaatoksia
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-8" data-testid="statistics-filters">
          <div className="flex-1">
            <Select value={selectedSport} onValueChange={setSelectedSport}>
              <SelectTrigger data-testid="sport-filter">
                <SelectValue placeholder="Valitse laji" />
              </SelectTrigger>
              <SelectContent>
                {sports.map(sport => (
                  <SelectItem key={sport} value={sport}>
                    {sport === 'all' ? 'Kaikki lajit' : sport}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger data-testid="year-filter">
                <SelectValue placeholder="Valitse vuosi" />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year === 'all' ? 'Kaikki vuodet' : year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="space-y-6" data-testid="statistics-grid">
          {Object.entries(groupedByTeam).map(([team, stats]) => (
            <Card key={team} className="glassmorphism p-6" data-testid={`team-stats-${team}`}>
              <div className="font-heading text-2xl font-bold mb-4">{team}</div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center p-4 glassmorphism rounded-sm" data-testid={`stat-${team}-${stat.year}`}>
                    <div className="text-sm text-muted-foreground mb-2">{stat.year}</div>
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs text-muted-foreground">Voitot</div>
                        <div className="font-heading text-2xl font-black text-success">{stat.wins}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Tappiot</div>
                        <div className="font-heading text-2xl font-black text-error">{stat.losses}</div>
                      </div>
                      {stat.draws > 0 && (
                        <div>
                          <div className="text-xs text-muted-foreground">Tasapelit</div>
                          <div className="font-heading text-2xl font-black text-warning">{stat.draws}</div>
                        </div>
                      )}
                      {stat.goals_scored !== null && (
                        <div className="pt-2 border-t border-white/10">
                          <div className="text-xs text-muted-foreground">Maalit</div>
                          <div className="font-heading text-lg font-bold">
                            <span className="text-primary">{stat.goals_scored}</span>
                            <span className="text-muted-foreground mx-1">-</span>
                            <span className="text-secondary">{stat.goals_conceded}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
          {Object.keys(groupedByTeam).length === 0 && (
            <Card className="glassmorphism p-12 text-center" data-testid="no-statistics">
              <div className="text-muted-foreground">Ei tilastoja valituilla suodattimilla</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}