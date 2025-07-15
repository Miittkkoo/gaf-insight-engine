import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Calendar, Clock, Heart, Brain, Sparkles, Target, Moon, Sun, Coffee } from 'lucide-react';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';

interface DailyMetrics {
  metric_date: string;
  hrv_score?: number;
  hrv_status?: string;
  mind_status?: string;
  body_status?: string;
  soul_status?: string;
  fokus_heute?: string;
  energie_budget?: string;
  schlafqualitaet?: string;
  aufwach_gefuehl?: string;
  schlafenszeitpunkt?: string;
  schlaf_bereitschaft?: string;
  sport_heute: boolean;
  sport_intensitaet?: string;
  meditation_heute: boolean;
  meditation_timing: string[];
  oliver_arbeit_heute: boolean;
  werte_gelebt: string[];
  werte_kreis_balance?: string;
  werte_zufriedenheit?: number;
  mood_boosting_events: string[];
  mood_killing_events: string[];
  events_bilanz?: string;
  alkohol_konsum?: string;
  alkohol_timing?: string;
  alkohol_details?: string;
  letzte_hauptmahlzeit?: string;
  abendliche_nahrung?: string;
  verdauungsgefuehl?: string;
  gedanken_aktivitaet?: string;
  emotionale_belastung?: string;
  stress_level?: number;
  task_feeling?: string;
  koerperliche_symptome: string[];
  energie_level_ende?: string;
  regenerations_bedarf_morgen?: string;
  erwartete_hrv_morgen?: string;
  anpassungen_morgen?: string;
  erkenntnisse?: string;
  groesster_widerstand?: string;
  tag_bewertung?: number;
  kontemplative_aktivitaeten: string[];
  kognitive_verarbeitung: string[];
  notizen?: string;
}

const WERTE_OPTIONS = [
  'Integrität & Authentizität',
  'Familie & Vaterschaft',
  'Kreativität & Problemlösung',
  'Kontinuierliches Wachstum',
  'Liebe & Verbindung',
  'Lebenlanges Lernen'
];

const MOOD_BOOSTING_OPTIONS = [
  '🎯 Erfolgreiche PRIME-Task beendet',
  '👨‍👧‍👧 Quality-Time mit Kindern',
  '💼 Oliver-Klarheit / Sicherheit',
  '🌲 Wald-Session ohne Handy',
  '🎮 Erfolgreiche Gaming-Session',
  '🔧 Experimentierend neue Sachen geschaffen',
  '💪 Training / Sport erfolgreich',
  '📚 Neues Wissen gelernt',
  '💰 Finanzielle Klarheit',
  '🧘 Meditation / Ruhe gefunden',
  '❤️ Romantische / intime Momente',
  '🏠 Wohlfühl-Momente zu Hause'
];

const MOOD_KILLING_OPTIONS = [
  '💼 Oliver-Unsicherheit / Existenzangst',
  '👨‍👧‍👧 Vater-Guilt / schlechtes Gewissen',
  '📋 Bürokratie-Marathon / Äußerer Kreis',
  '📱 Handy-Suchtverlauf ohne Befriedigung',
  '🔄 Perfektionismus-Spirale ohne Ende',
  '😴 Schlechter Schlaf / Müdigkeit',
  '⚡ Überlastung / zu viele SOFORT-Tasks',
  '🤝 Soziale Überforderung',
  '💰 Geld-Sorgen / 100k-Angst',
  '🏠 Chaos / Unordnung im Umfeld',
  '🚫 Kreative Blockade / Lustlosigkeit',
  '⏰ Zeitdruck ohne Kontrolle',
  '🪫 Arbeit aufgeschoben / Prokastination',
  '💔 Liebeskummer'
];

const KONTEMPLATIVE_OPTIONS = [
  'Wald/Natur',
  'Lesen',
  'Entspannung',
  'Musik',
  'Meditation'
];

const SYMPTOME_OPTIONS = [
  'Verspannungen',
  'Kopfschmerzen',
  'Unruhe',
  'Müdigkeit',
  'Schmerzen',
  'Verdauungsprobleme',
  'Keine'
];

const MEDITATION_TIMING_OPTIONS = [
  'Morgens',
  'Mittags',
  'Nachmittags',
  'Abends',
  'Nachts'
];

const KOGNITIVE_OPTIONS = [
  'Retrospektive',
  'Tagesplanung',
  'Reflexion',
  'Problemlösung'
];

const DailyEntry = () => {
  const [formData, setFormData] = useState<DailyMetrics>({
    metric_date: new Date().toISOString().split('T')[0],
    sport_heute: false,
    meditation_heute: false,
    oliver_arbeit_heute: false,
    werte_gelebt: [],
    mood_boosting_events: [],
    mood_killing_events: [],
    koerperliche_symptome: [],
    kontemplative_aktivitaeten: [],
    kognitive_verarbeitung: [],
    meditation_timing: []
  });
  
  const [activeTab, setActiveTab] = useState('morning');
  const { saveMetrics, loadMetrics, isLoading } = useDailyMetrics();

  useEffect(() => {
    loadExistingData();
  }, [formData.metric_date]);

  const loadExistingData = async () => {
    try {
      const data = await loadMetrics(formData.metric_date);
      if (data) {
        setFormData(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  };

  const handleSubmit = async () => {
    await saveMetrics(formData);
  };

  const calculateCompleteness = () => {
    const totalFields = 30; // Grobe Schätzung wichtiger Felder
    let filledFields = 0;
    
    if (formData.hrv_score) filledFields++;
    if (formData.mind_status) filledFields++;
    if (formData.body_status) filledFields++;
    if (formData.soul_status) filledFields++;
    if (formData.schlafqualitaet) filledFields++;
    if (formData.werte_gelebt.length > 0) filledFields++;
    if (formData.mood_boosting_events.length > 0) filledFields++;
    // ... weitere Felder
    
    return Math.round((filledFields / totalFields) * 100);
  };

  const updateArrayField = (field: keyof DailyMetrics, value: string, checked: boolean) => {
    setFormData(prev => {
      const currentArray = (prev[field] as string[]) || [];
      let newArray: string[];
      
      if (checked) {
        newArray = [...currentArray, value];
      } else {
        newArray = currentArray.filter(item => item !== value);
      }
      
      return { ...prev, [field]: newArray };
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Tägliche GAF-Eingabe</h1>
        <p className="text-muted-foreground">Erfassen Sie Ihre täglichen Metriken für eine optimale Analyse</p>
        
        <div className="flex items-center gap-4 mt-4">
          <Label htmlFor="date">Datum:</Label>
          <Input
            id="date"
            type="date"
            value={formData.metric_date}
            onChange={(e) => setFormData(prev => ({ ...prev, metric_date: e.target.value }))}
            className="w-auto"
          />
          <Badge variant="outline">
            Vollständigkeit: {calculateCompleteness()}%
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="morning" className="flex items-center gap-2">
            <Sun className="w-4 h-4" />
            Morgen
          </TabsTrigger>
          <TabsTrigger value="day" className="flex items-center gap-2">
            <Coffee className="w-4 h-4" />
            Tag
          </TabsTrigger>
          <TabsTrigger value="evening" className="flex items-center gap-2">
            <Moon className="w-4 h-4" />
            Abend
          </TabsTrigger>
        </TabsList>

        {/* MORGEN TAB */}
        <TabsContent value="morning" className="space-y-6">
          {/* HRV & Aufwachen */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                HRV & Aufwachen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hrv-score">HRV Score (ms)</Label>
                  <Input
                    id="hrv-score"
                    type="number"
                    min="15"
                    max="50"
                    step="0.1"
                    value={formData.hrv_score || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, hrv_score: parseFloat(e.target.value) || undefined }))}
                  />
                </div>
                <div>
                  <Label htmlFor="hrv-status">HRV Status</Label>
                  <Select value={formData.hrv_status || ''} onValueChange={(value) => setFormData(prev => ({ ...prev, hrv_status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kritisch">🔴 Kritisch (≤22ms)</SelectItem>
                      <SelectItem value="unter_bereich">🟡 Unter Bereich (23-26ms)</SelectItem>
                      <SelectItem value="normal">🟢 Normal (27-35ms)</SelectItem>
                      <SelectItem value="optimal">💚 Optimal (≥35ms)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="aufwach-gefuehl">Aufwach-Gefühl</Label>
                  <Select value={formData.aufwach_gefuehl || ''} onValueChange={(value) => setFormData(prev => ({ ...prev, aufwach_gefuehl: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Gefühl wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="erschoepft">🔴 Erschöpft</SelectItem>
                      <SelectItem value="muede">🟡 Müde</SelectItem>
                      <SelectItem value="erholt">🟢 Erholt</SelectItem>
                      <SelectItem value="energiegeladen">💚 Energiegeladen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="schlafqualitaet">Schlafqualität subjektiv</Label>
                  <Select value={formData.schlafqualitaet || ''} onValueChange={(value) => setFormData(prev => ({ ...prev, schlafqualitaet: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Qualität wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="schlecht">🔴 Schlecht</SelectItem>
                      <SelectItem value="okay">🟡 Okay</SelectItem>
                      <SelectItem value="gut">🟢 Gut</SelectItem>
                      <SelectItem value="sehr_gut">💚 Sehr gut</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Framework Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-blue-500" />
                7-Dimensionales Framework
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="mind-status">Mind Status</Label>
                  <Select value={formData.mind_status || ''} onValueChange={(value) => setFormData(prev => ({ ...prev, mind_status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Mind Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="klar_motiviert">🟢 Klar & Motiviert</SelectItem>
                      <SelectItem value="funktional_angestrengt">🟡 Funktional aber angestrengt</SelectItem>
                      <SelectItem value="ueberlastet_erschoepft">🔴 Überlastet & Erschöpft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="body-status">Body Status</Label>
                  <Select value={formData.body_status || ''} onValueChange={(value) => setFormData(prev => ({ ...prev, body_status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Body Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="energievoll_vital">🟢 Energievoll & Vital</SelectItem>
                      <SelectItem value="muede_okay">🟡 Müde aber okay</SelectItem>
                      <SelectItem value="erschoepft_schmerzen">🔴 Erschöpft & Schmerzen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="soul-status">Soul Status</Label>
                  <Select value={formData.soul_status || ''} onValueChange={(value) => setFormData(prev => ({ ...prev, soul_status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Soul Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zufrieden_sinnhaft">🟢 Zufrieden & Sinnhaft</SelectItem>
                      <SelectItem value="neutral_funktional">🟡 Neutral & Funktional</SelectItem>
                      <SelectItem value="unzufrieden_sinnlos">🔴 Unzufrieden & Sinnlos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fokus-heute">Fokus heute</Label>
                  <Select value={formData.fokus_heute || ''} onValueChange={(value) => setFormData(prev => ({ ...prev, fokus_heute: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Fokus wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regeneration">Regeneration</SelectItem>
                      <SelectItem value="balance">Balance</SelectItem>
                      <SelectItem value="produktivitaet">Produktivität</SelectItem>
                      <SelectItem value="ueberleben">Überleben</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="energie-budget">Energie-Budget heute</Label>
                  <Select value={formData.energie_budget || ''} onValueChange={(value) => setFormData(prev => ({ ...prev, energie_budget: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Budget wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="niedrig">🔴 Niedrig &lt;40%</SelectItem>
                      <SelectItem value="mittel">🟡 Mittel 40-60%</SelectItem>
                      <SelectItem value="hoch">🟢 Hoch 70%+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAG TAB */}
        <TabsContent value="day" className="space-y-6">
          {/* Aktivitäten */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-green-500" />
                Aktivitäten & Gewohnheiten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sport"
                    checked={formData.sport_heute}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sport_heute: checked as boolean }))}
                  />
                  <Label htmlFor="sport">Sport heute</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="meditation"
                    checked={formData.meditation_heute}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, meditation_heute: checked as boolean }))}
                  />
                  <Label htmlFor="meditation">Meditation heute</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="oliver-arbeit"
                    checked={formData.oliver_arbeit_heute}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, oliver_arbeit_heute: checked as boolean }))}
                  />
                  <Label htmlFor="oliver-arbeit">Oliver-Arbeit heute</Label>
                </div>
              </div>

              {formData.sport_heute && (
                <div>
                  <Label htmlFor="sport-intensitaet">Sport Intensität</Label>
                  <Select value={formData.sport_intensitaet || ''} onValueChange={(value) => setFormData(prev => ({ ...prev, sport_intensitaet: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Intensität wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leicht">Leicht</SelectItem>
                      <SelectItem value="mittel">Mittel</SelectItem>
                      <SelectItem value="hoch">Hoch</SelectItem>
                      <SelectItem value="sehr_hoch">Sehr hoch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.meditation_heute && (
                <div>
                  <Label>Meditation Timing</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {MEDITATION_TIMING_OPTIONS.map((timing) => (
                      <div key={timing} className="flex items-center space-x-2">
                        <Checkbox
                          id={`meditation-${timing}`}
                          checked={formData.meditation_timing.includes(timing)}
                          onCheckedChange={(checked) => updateArrayField('meditation_timing', timing, checked as boolean)}
                        />
                        <Label htmlFor={`meditation-${timing}`} className="text-sm">{timing}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Werte & Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Werte & Events
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Werte gelebt heute</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {WERTE_OPTIONS.map((wert) => (
                    <div key={wert} className="flex items-center space-x-2">
                      <Checkbox
                        id={`wert-${wert}`}
                        checked={formData.werte_gelebt.includes(wert)}
                        onCheckedChange={(checked) => updateArrayField('werte_gelebt', wert, checked as boolean)}
                      />
                      <Label htmlFor={`wert-${wert}`} className="text-sm">{wert}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="werte-zufriedenheit">Werte-Zufriedenheit: {formData.werte_zufriedenheit || 5}</Label>
                  <Slider
                    id="werte-zufriedenheit"
                    min={1}
                    max={10}
                    step={1}
                    value={[formData.werte_zufriedenheit || 5]}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, werte_zufriedenheit: value[0] }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 (niedrig)</span>
                    <span>10 (hoch)</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stress-level">Stress Level: {formData.stress_level || 5}</Label>
                  <Slider
                    id="stress-level"
                    min={1}
                    max={10}
                    step={1}
                    value={[formData.stress_level || 5]}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, stress_level: value[0] }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 (niedrig)</span>
                    <span>10 (hoch)</span>
                  </div>
                </div>
              </div>

              <div>
                <Label>Mood-Boosting Events</Label>
                <div className="grid grid-cols-1 gap-2 mt-2 max-h-48 overflow-y-auto">
                  {MOOD_BOOSTING_OPTIONS.map((event) => (
                    <div key={event} className="flex items-center space-x-2">
                      <Checkbox
                        id={`boost-${event}`}
                        checked={formData.mood_boosting_events.includes(event)}
                        onCheckedChange={(checked) => updateArrayField('mood_boosting_events', event, checked as boolean)}
                      />
                      <Label htmlFor={`boost-${event}`} className="text-sm">{event}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Mood-Killing Events</Label>
                <div className="grid grid-cols-1 gap-2 mt-2 max-h-48 overflow-y-auto">
                  {MOOD_KILLING_OPTIONS.map((event) => (
                    <div key={event} className="flex items-center space-x-2">
                      <Checkbox
                        id={`kill-${event}`}
                        checked={formData.mood_killing_events.includes(event)}
                        onCheckedChange={(checked) => updateArrayField('mood_killing_events', event, checked as boolean)}
                      />
                      <Label htmlFor={`kill-${event}`} className="text-sm">{event}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABEND TAB */}
        <TabsContent value="evening" className="space-y-6">
          {/* Alkohol & Ernährung */}
          <Card>
            <CardHeader>
              <CardTitle>Alkohol & Ernährung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="alkohol-konsum">Alkohol-Konsum</Label>
                  <Select value={formData.alkohol_konsum || ''} onValueChange={(value) => setFormData(prev => ({ ...prev, alkohol_konsum: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Konsum wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kein">🟢 0 (Kein Alkohol)</SelectItem>
                      <SelectItem value="ein_glas">🟡 1 (1 Bier/Glas Wein)</SelectItem>
                      <SelectItem value="moderat">🟠 2-3 (Moderat)</SelectItem>
                      <SelectItem value="hoch">🔴 4+ (Hoch)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="alkohol-timing">Alkohol Timing</Label>
                  <Select value={formData.alkohol_timing || ''} onValueChange={(value) => setFormData(prev => ({ ...prev, alkohol_timing: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Timing wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kein">Kein Alkohol</SelectItem>
                      <SelectItem value="mittags">Mittags</SelectItem>
                      <SelectItem value="nachmittags">Nachmittags</SelectItem>
                      <SelectItem value="abends">Abends</SelectItem>
                      <SelectItem value="spaet_abends">Spät abends</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="letzte-hauptmahlzeit">Letzte Hauptmahlzeit Zeit</Label>
                  <Select value={formData.letzte_hauptmahlzeit || ''} onValueChange={(value) => setFormData(prev => ({ ...prev, letzte_hauptmahlzeit: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Zeit wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vor_12">Vor 12:00</SelectItem>
                      <SelectItem value="12_14">12:00-14:00</SelectItem>
                      <SelectItem value="14_16">14:00-16:00</SelectItem>
                      <SelectItem value="16_18">16:00-18:00</SelectItem>
                      <SelectItem value="18_19">18:00-19:00</SelectItem>
                      <SelectItem value="19_20">19:00-20:00</SelectItem>
                      <SelectItem value="nach_20">Nach 20:00</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="abendliche-nahrung">Abendliche Nahrung</Label>
                  <Select value={formData.abendliche_nahrung || ''} onValueChange={(value) => setFormData(prev => ({ ...prev, abendliche_nahrung: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Nahrung wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keine">🟢 Keine</SelectItem>
                      <SelectItem value="leichte_snacks">🟡 Leichte Snacks</SelectItem>
                      <SelectItem value="normale_mahlzeit">🟠 Normale Mahlzeit</SelectItem>
                      <SelectItem value="schwere_mahlzeit">🔴 Schwere Mahlzeit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reflexion & Planung */}
          <Card>
            <CardHeader>
              <CardTitle>Reflexion & Planung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tag-bewertung">Tag-Bewertung gesamt: {formData.tag_bewertung || 5}</Label>
                  <Slider
                    id="tag-bewertung"
                    min={1}
                    max={10}
                    step={1}
                    value={[formData.tag_bewertung || 5]}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, tag_bewertung: value[0] }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 (schlecht)</span>
                    <span>10 (ausgezeichnet)</span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="regenerations-bedarf">Regenerations-Bedarf morgen</Label>
                  <Select value={formData.regenerations_bedarf_morgen || ''} onValueChange={(value) => setFormData(prev => ({ ...prev, regenerations_bedarf_morgen: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Bedarf wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hoch">🔴 Hoch</SelectItem>
                      <SelectItem value="mittel">🟡 Mittel</SelectItem>
                      <SelectItem value="niedrig">🟢 Niedrig</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="erkenntnisse">Erkenntnisse des Tages</Label>
                <Textarea
                  id="erkenntnisse"
                  placeholder="Was haben Sie heute gelernt oder erkannt?"
                  value={formData.erkenntnisse || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, erkenntnisse: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="anpassungen-morgen">Anpassungen für morgen</Label>
                <Textarea
                  id="anpassungen-morgen"
                  placeholder="Was werden Sie morgen anders machen?"
                  value={formData.anpassungen_morgen || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, anpassungen_morgen: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="erwartete-hrv">Erwartete HRV morgen</Label>
                <Textarea
                  id="erwartete-hrv"
                  placeholder="Ihre Vorhersage für die morgige HRV mit Begründung"
                  value={formData.erwartete_hrv_morgen || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, erwartete_hrv_morgen: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="notizen">Allgemeine Notizen</Label>
                <Textarea
                  id="notizen"
                  placeholder="Zusätzliche Beobachtungen und Gedanken"
                  value={formData.notizen || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notizen: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Körperliche Symptome & Kontemplatives */}
          <Card>
            <CardHeader>
              <CardTitle>Körperliches & Kontemplatives</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Körperliche Symptome Abend</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {SYMPTOME_OPTIONS.map((symptom) => (
                    <div key={symptom} className="flex items-center space-x-2">
                      <Checkbox
                        id={`symptom-${symptom}`}
                        checked={formData.koerperliche_symptome.includes(symptom)}
                        onCheckedChange={(checked) => updateArrayField('koerperliche_symptome', symptom, checked as boolean)}
                      />
                      <Label htmlFor={`symptom-${symptom}`} className="text-sm">{symptom}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Kontemplative Aktivitäten</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {KONTEMPLATIVE_OPTIONS.map((aktivitat) => (
                    <div key={aktivitat} className="flex items-center space-x-2">
                      <Checkbox
                        id={`kontemp-${aktivitat}`}
                        checked={formData.kontemplative_aktivitaeten.includes(aktivitat)}
                        onCheckedChange={(checked) => updateArrayField('kontemplative_aktivitaeten', aktivitat, checked as boolean)}
                      />
                      <Label htmlFor={`kontemp-${aktivitat}`} className="text-sm">{aktivitat}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Kognitive Verarbeitung heute</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {KOGNITIVE_OPTIONS.map((verarbeitung) => (
                    <div key={verarbeitung} className="flex items-center space-x-2">
                      <Checkbox
                        id={`kognitiv-${verarbeitung}`}
                        checked={formData.kognitive_verarbeitung.includes(verarbeitung)}
                        onCheckedChange={(checked) => updateArrayField('kognitive_verarbeitung', verarbeitung, checked as boolean)}
                      />
                      <Label htmlFor={`kognitiv-${verarbeitung}`} className="text-sm">{verarbeitung}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4 mt-8">
        <Button variant="outline" onClick={() => window.location.reload()}>
          Zurücksetzen
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? 'Speichert...' : 'Speichern'}
        </Button>
      </div>
    </div>
  );
};

export default DailyEntry;