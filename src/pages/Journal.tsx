import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Edit3, TrendingUp, Heart, Brain, User, Filter, Search } from 'lucide-react';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface DailyMetric {
  id: string;
  metric_date: string;
  hrv_score: number | null;
  hrv_status: string | null;
  mind_status: string | null;
  body_status: string | null;
  soul_status: string | null;
  tag_bewertung: number | null;
  werte_zufriedenheit: number | null;
  stress_level: number | null;
  schlafqualitaet: string | null;
  fokus_heute: string | null;
  sport_heute: boolean;
  meditation_heute: boolean;
  werte_gelebt: string[] | null;
  mood_boosting_events: string[] | null;
  mood_killing_events: string[] | null;
  notizen: string | null;
  erkenntnisse: string | null;
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
  const { updateMetrics, loadAllMetrics } = useDailyMetrics();

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const data = await loadAllMetrics();
      setEntries(data);
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateEntry = async (updatedEntry: Partial<DailyMetric>) => {
    if (!selectedEntry) return;

    try {
      await updateMetrics(selectedEntry.id, updatedEntry);
      await fetchEntries();
      setEditMode(false);
    } catch (error) {
      console.error('Error updating entry:', error);
    }
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return 'secondary';
    if (status.includes('Grün') || status.includes('Normal') || status.includes('Optimal')) return 'default';
    if (status.includes('Gelb') || status.includes('Unter')) return 'secondary';
    if (status.includes('Rot') || status.includes('Kritisch')) return 'destructive';
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
            <Card key={entry.id} className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary/20">
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
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedEntry(entry);
                          setEditMode(false);
                        }}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <EntryDetailDialog 
                        entry={selectedEntry}
                        editMode={editMode}
                        onEdit={() => setEditMode(true)}
                        onCancel={() => setEditMode(false)}
                        onSave={updateEntry}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Quick Status Overview */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
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
                      <User className="h-3 w-3 mr-1" />
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
      </div>
    </div>
  );
};

// Entry Detail Dialog Component
const EntryDetailDialog: React.FC<{
  entry: DailyMetric | null;
  editMode: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (data: Partial<DailyMetric>) => void;
}> = ({ entry, editMode, onEdit, onCancel, onSave }) => {
  const [formData, setFormData] = useState<Partial<DailyMetric>>({});

  useEffect(() => {
    if (entry) {
      setFormData(entry);
    }
  }, [entry]);

  if (!entry) return null;

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center justify-between">
          <span>
            📅 {format(parseISO(entry.metric_date), 'dd. MMMM yyyy', { locale: de })}
          </span>
          {!editMode && (
            <Button onClick={onEdit} variant="outline" size="sm">
              <Edit3 className="h-4 w-4 mr-2" />
              Bearbeiten
            </Button>
          )}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* HRV & Framework Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">📊 HRV & Framework Assessment</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>HRV Score</Label>
              {editMode ? (
                <Input
                  type="number"
                  value={formData.hrv_score || ''}
                  onChange={(e) => setFormData({...formData, hrv_score: e.target.value ? Number(e.target.value) : null})}
                />
              ) : (
                <p className="mt-1 p-2 bg-muted rounded">{entry.hrv_score || 'N/A'}</p>
              )}
            </div>
            <div>
              <Label>HRV Status</Label>
              {editMode ? (
                <Select value={formData.hrv_status || ''} onValueChange={(value) => setFormData({...formData, hrv_status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="🔴 Kritisch (≤22ms)">🔴 Kritisch (≤22ms)</SelectItem>
                    <SelectItem value="🟡 Unter Bereich (23-26ms)">🟡 Unter Bereich (23-26ms)</SelectItem>
                    <SelectItem value="🟢 Normal (27-35ms)">🟢 Normal (27-35ms)</SelectItem>
                    <SelectItem value="💚 Optimal (≥35ms)">💚 Optimal (≥35ms)</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="mt-1 p-2 bg-muted rounded">{entry.hrv_status || 'N/A'}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Mind Status</Label>
              {editMode ? (
                <Select value={formData.mind_status || ''} onValueChange={(value) => setFormData({...formData, mind_status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="🟢 Grün - Klar & Motiviert">🟢 Klar & Motiviert</SelectItem>
                    <SelectItem value="🟡 Gelb - Funktional aber angestrengt">🟡 Funktional aber angestrengt</SelectItem>
                    <SelectItem value="🔴 Rot - Überlastet & Erschöpft">🔴 Überlastet & Erschöpft</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="mt-1 p-2 bg-muted rounded">{entry.mind_status || 'N/A'}</p>
              )}
            </div>
            <div>
              <Label>Body Status</Label>
              {editMode ? (
                <Select value={formData.body_status || ''} onValueChange={(value) => setFormData({...formData, body_status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="🟢 Grün - Energievoll & Vital">🟢 Energievoll & Vital</SelectItem>
                    <SelectItem value="🟡 Gelb - Müde aber okay">🟡 Müde aber okay</SelectItem>
                    <SelectItem value="🔴 Rot - Erschöpft & Schmerzen">🔴 Erschöpft & Schmerzen</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="mt-1 p-2 bg-muted rounded">{entry.body_status || 'N/A'}</p>
              )}
            </div>
            <div>
              <Label>Soul Status</Label>
              {editMode ? (
                <Select value={formData.soul_status || ''} onValueChange={(value) => setFormData({...formData, soul_status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="🟢 Grün - Zufrieden & Sinnhaft">🟢 Zufrieden & Sinnhaft</SelectItem>
                    <SelectItem value="🟡 Gelb - Neutral & Funktional">🟡 Neutral & Funktional</SelectItem>
                    <SelectItem value="🔴 Rot - Unzufrieden & Sinnlos">🔴 Unzufrieden & Sinnlos</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="mt-1 p-2 bg-muted rounded">{entry.soul_status || 'N/A'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Activities & Scores */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">🎯 Aktivitäten & Bewertungen</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              {editMode ? (
                <Checkbox
                  checked={formData.sport_heute || false}
                  onCheckedChange={(checked) => setFormData({...formData, sport_heute: !!checked})}
                />
              ) : (
                <span>{entry.sport_heute ? '✅' : '❌'}</span>
              )}
              <Label>Sport heute</Label>
            </div>
            <div className="flex items-center space-x-2">
              {editMode ? (
                <Checkbox
                  checked={formData.meditation_heute || false}
                  onCheckedChange={(checked) => setFormData({...formData, meditation_heute: !!checked})}
                />
              ) : (
                <span>{entry.meditation_heute ? '✅' : '❌'}</span>
              )}
              <Label>Meditation heute</Label>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Tag-Bewertung (1-10)</Label>
              {editMode ? (
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.tag_bewertung || ''}
                  onChange={(e) => setFormData({...formData, tag_bewertung: e.target.value ? Number(e.target.value) : null})}
                />
              ) : (
                <p className="mt-1 p-2 bg-muted rounded">{entry.tag_bewertung || 'N/A'}/10</p>
              )}
            </div>
            <div>
              <Label>Werte-Zufriedenheit (1-10)</Label>
              {editMode ? (
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.werte_zufriedenheit || ''}
                  onChange={(e) => setFormData({...formData, werte_zufriedenheit: e.target.value ? Number(e.target.value) : null})}
                />
              ) : (
                <p className="mt-1 p-2 bg-muted rounded">{entry.werte_zufriedenheit || 'N/A'}/10</p>
              )}
            </div>
            <div>
              <Label>Stress Level (1-10)</Label>
              {editMode ? (
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.stress_level || ''}
                  onChange={(e) => setFormData({...formData, stress_level: e.target.value ? Number(e.target.value) : null})}
                />
              ) : (
                <p className="mt-1 p-2 bg-muted rounded">{entry.stress_level || 'N/A'}/10</p>
              )}
            </div>
          </div>
        </div>

        {/* Reflection */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">💭 Reflexion & Notizen</h3>
          <div>
            <Label>Notizen</Label>
            {editMode ? (
              <Textarea
                value={formData.notizen || ''}
                onChange={(e) => setFormData({...formData, notizen: e.target.value})}
                rows={3}
              />
            ) : (
              <p className="mt-1 p-3 bg-muted rounded min-h-[80px]">{entry.notizen || 'Keine Notizen'}</p>
            )}
          </div>
          <div>
            <Label>Erkenntnisse des Tages</Label>
            {editMode ? (
              <Textarea
                value={formData.erkenntnisse || ''}
                onChange={(e) => setFormData({...formData, erkenntnisse: e.target.value})}
                rows={3}
              />
            ) : (
              <p className="mt-1 p-3 bg-muted rounded min-h-[80px]">{entry.erkenntnisse || 'Keine Erkenntnisse'}</p>
            )}
          </div>
        </div>

        {/* Garmin Sync Info */}
        {entry.garmin_last_sync && (
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              ⌚ Letzte Garmin-Synchronisation: {format(parseISO(entry.garmin_last_sync), 'dd.MM.yyyy HH:mm', { locale: de })}
            </p>
          </div>
        )}
      </div>

      {editMode && (
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button onClick={handleSave}>
            Speichern & Analyse-Update
          </Button>
        </div>
      )}
    </>
  );
};

export default Journal;