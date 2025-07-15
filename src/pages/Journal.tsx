import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Calendar, Search, Filter, Heart, Brain, Users, Edit3 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import GarminDataCard from '@/components/GarminDataCard';
import { JournalEditDialog } from '@/components/JournalEditDialog';

interface DailyMetric {
  id: string;
  metric_date: string;
  hrv_score: number | null;
  hrv_status: string | null;
  mind_status: string | null;
  body_status: string | null;
  soul_status: string | null;
  fokus_heute: string | null;
  energie_budget: string | null;
  schlafqualitaet: string | null;
  aufwach_gefuehl: string | null;
  schlafenszeitpunkt: string | null;
  schlaf_bereitschaft: string | null;
  sport_heute: boolean;
  sport_intensitaet: string | null;
  meditation_heute: boolean;
  meditation_timing: string[] | null;
  oliver_arbeit_heute: boolean | null;
  werte_gelebt: string[] | null;
  werte_kreis_balance: string | null;
  werte_zufriedenheit: number | null;
  mood_boosting_events: string[] | null;
  mood_killing_events: string[] | null;
  events_bilanz: string | null;
  alkohol_konsum: string | null;
  alkohol_timing: string | null;
  alkohol_details: string | null;
  letzte_hauptmahlzeit: string | null;
  abendliche_nahrung: string | null;
  verdauungsgefuehl: string | null;
  gedanken_aktivitaet: string | null;
  emotionale_belastung: string | null;
  stress_level: number | null;
  tag_bewertung: number | null;
  task_feeling: string | null;
  koerperliche_symptome: string[] | null;
  energie_level_ende: string | null;
  regenerations_bedarf_morgen: string | null;
  erwartete_hrv_morgen: string | null;
  anpassungen_morgen: string | null;
  erkenntnisse: string | null;
  groesster_widerstand: string | null;
  kontemplative_aktivitaeten: string[] | null;
  kognitive_verarbeitung: string[] | null;
  notizen: string | null;
  garmin_last_sync: string | null;
  created_at: string;
  updated_at: string;
}

const Journal: React.FC = () => {
  const [entries, setEntries] = useState<DailyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<DailyMetric | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('daily_metrics')
        .select('*')
        .eq('user_id', user.id)
        .order('metric_date', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error loading entries:', error);
      toast({
        title: "Fehler beim Laden",
        description: "Einträge konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
  };

  const handleSaveEntry = async (updatedData: Partial<DailyMetric>) => {
    if (!selectedEntry) return;

    try {
      const { error } = await supabase
        .from('daily_metrics')
        .update(updatedData)
        .eq('id', selectedEntry.id);

      if (error) throw error;

      setEditMode(false);
      loadEntries();
      
      toast({
        title: "Eintrag gespeichert",
        description: "Ihre Änderungen wurden erfolgreich gespeichert.",
      });
    } catch (error) {
      toast({
        title: "Fehler beim Speichern",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return 'secondary';
    if (status.includes('klar_motiviert') || status.includes('energievoll_vital') || status.includes('zufrieden_sinnhaft')) return 'default';
    if (status.includes('funktional_angestrengt') || status.includes('muede_okay') || status.includes('neutral_funktional')) return 'secondary';
    if (status.includes('ueberlastet_erschoepft') || status.includes('erschoepft_schmerzen') || status.includes('unzufrieden_sinnlos')) return 'destructive';
    return 'outline';
  };

  const getScoreColor = (score: number | null, max: number = 10) => {
    if (!score) return 'text-muted-foreground';
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = !searchFilter || 
      entry.metric_date.includes(searchFilter) ||
      entry.notizen?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      entry.erkenntnisse?.toLowerCase().includes(searchFilter.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'good' && entry.tag_bewertung && entry.tag_bewertung >= 7) ||
      (statusFilter === 'medium' && entry.tag_bewertung && entry.tag_bewertung >= 4 && entry.tag_bewertung < 7) ||
      (statusFilter === 'poor' && entry.tag_bewertung && entry.tag_bewertung < 4);
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">Lädt Journal...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              📖 HRV & Werte Journal
            </h1>
            <p className="text-muted-foreground mt-2">
              Übersicht aller Tageseinträge mit Detailansicht und Bearbeitungsmöglichkeit
            </p>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Datum, Notizen durchsuchen..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Einträge</SelectItem>
                <SelectItem value="good">Gute Tage (7-10)</SelectItem>
                <SelectItem value="medium">Mittlere Tage (4-6)</SelectItem>
                <SelectItem value="poor">Schwere Tage (1-3)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Entries Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEntries.map((entry) => (
            <Card 
              key={entry.id} 
              className={`cursor-pointer transition-all hover:shadow-lg border-l-4 border-l-primary/20 ${
                selectedEntry?.id === entry.id ? 'ring-2 ring-primary shadow-md' : ''
              }`}
              onClick={() => {
                if (selectedEntry?.id === entry.id) {
                  setSelectedEntry(null);
                } else {
                  setSelectedEntry(entry);
                  setEditMode(false);
                }
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(parseISO(entry.metric_date), 'dd. MMM yyyy', { locale: de })}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(entry.updated_at), 'HH:mm', { locale: de })} Uhr
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEntry(entry);
                      setEditMode(true);
                    }}
                  >
                    <Edit3 className="h-3 w-3 mr-1" />
                    Bearbeiten
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Quick Status Overview */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">HRV</p>
                      <p className="font-semibold">{entry.hrv_score || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Tag</p>
                      <p className={`font-semibold ${getScoreColor(entry.tag_bewertung)}`}>
                        {entry.tag_bewertung || 'N/A'}/10
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap gap-1">
                  {entry.mind_status && (
                    <Badge variant={getStatusColor(entry.mind_status)} className="text-xs">
                      <Brain className="h-3 w-3 mr-1" />
                      Mind
                    </Badge>
                  )}
                  {entry.body_status && (
                    <Badge variant={getStatusColor(entry.body_status)} className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      Body
                    </Badge>
                  )}
                  {entry.soul_status && (
                    <Badge variant={getStatusColor(entry.soul_status)} className="text-xs">
                      <Heart className="h-3 w-3 mr-1" />
                      Soul
                    </Badge>
                  )}
                </div>

                {/* Quick Activities */}
                <div className="flex gap-2 text-xs">
                  {entry.sport_heute && <span className="text-green-600">🏃 Sport</span>}
                  {entry.meditation_heute && <span className="text-purple-600">🧘 Meditation</span>}
                  {entry.garmin_last_sync && <span className="text-blue-600">⌚ Garmin</span>}
                </div>

                {/* Quick Notes Preview */}
                {entry.notizen && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    💭 {entry.notizen}
                  </p>
                )}

                {/* Garmin Data Card for selected entry */}
                {selectedEntry?.id === entry.id && (
                  <div className="mt-4 border-t pt-4">
                    <GarminDataCard date={entry.metric_date} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredEntries.length === 0 && (
          <Card className="text-center py-8">
            <CardContent>
              <p className="text-muted-foreground">
                {searchFilter || statusFilter !== 'all' 
                  ? 'Keine Einträge gefunden für diese Filter.'
                  : 'Noch keine Journal-Einträge vorhanden.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={editMode} onOpenChange={() => setEditMode(false)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            {selectedEntry && (
              <JournalEditDialog
                entry={selectedEntry}
                editMode={true}
                onEdit={handleEdit}
                onCancel={handleCancelEdit}
                onSave={handleSaveEntry}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Journal;