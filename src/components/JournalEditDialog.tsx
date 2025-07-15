import React, { useState, useEffect } from 'react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Edit3, Save, X } from 'lucide-react';
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

interface JournalEditDialogProps {
  entry: DailyMetric | null;
  editMode: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (data: Partial<DailyMetric>) => void;
}

export const JournalEditDialog: React.FC<JournalEditDialogProps> = ({
  entry,
  editMode,
  onEdit,
  onCancel,
  onSave
}) => {
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

  const updateArrayField = (field: keyof DailyMetric, value: string, checked: boolean) => {
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
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center justify-between">
          <span>
            📅 {format(parseISO(entry.metric_date), 'dd. MMMM yyyy', { locale: de })}
          </span>
          {!editMode ? (
            <Button onClick={onEdit} variant="outline" size="sm">
              <Edit3 className="h-4 w-4 mr-2" />
              Bearbeiten
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Speichern
              </Button>
              <Button onClick={onCancel} variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                Abbrechen
              </Button>
            </div>
          )}
        </DialogTitle>
      </DialogHeader>

      <div className="max-h-[70vh] overflow-y-auto">
        {editMode ? (
          <Tabs defaultValue="morning" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="morning">🌅 Morgen</TabsTrigger>
              <TabsTrigger value="day">☀️ Tag</TabsTrigger>
              <TabsTrigger value="evening">🌙 Abend</TabsTrigger>
            </TabsList>

            {/* MORNING TAB */}
            <TabsContent value="morning" className="space-y-6">
              {/* HRV Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">📊 HRV & Framework Assessment</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>HRV Score</Label>
                    <Input
                      type="number"
                      value={formData.hrv_score || ''}
                      onChange={(e) => setFormData({...formData, hrv_score: e.target.value ? Number(e.target.value) : null})}
                      placeholder="z.B. 35"
                    />
                  </div>
                  <div>
                    <Label>HRV Status</Label>
                    <Select value={formData.hrv_status || ''} onValueChange={(value) => setFormData({...formData, hrv_status: value})}>
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

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Mind Status</Label>
                    <Select value={formData.mind_status || ''} onValueChange={(value) => setFormData({...formData, mind_status: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="klar_motiviert">🟢 Klar & Motiviert</SelectItem>
                        <SelectItem value="funktional_angestrengt">🟡 Funktional aber angestrengt</SelectItem>
                        <SelectItem value="ueberlastet_erschoepft">🔴 Überlastet & Erschöpft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Body Status</Label>
                    <Select value={formData.body_status || ''} onValueChange={(value) => setFormData({...formData, body_status: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="energievoll_vital">🟢 Energievoll & Vital</SelectItem>
                        <SelectItem value="muede_okay">🟡 Müde aber okay</SelectItem>
                        <SelectItem value="erschoepft_schmerzen">🔴 Erschöpft & Schmerzen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Soul Status</Label>
                    <Select value={formData.soul_status || ''} onValueChange={(value) => setFormData({...formData, soul_status: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zufrieden_sinnhaft">🟢 Zufrieden & Sinnhaft</SelectItem>
                        <SelectItem value="neutral_funktional">🟡 Neutral & Funktional</SelectItem>
                        <SelectItem value="unzufrieden_sinnlos">🔴 Unzufrieden & Sinnlos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Schlaf Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">😴 Schlaf & Aufwachen</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Schlafqualität</Label>
                    <Select value={formData.schlafqualitaet || ''} onValueChange={(value) => setFormData({...formData, schlafqualitaet: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Qualität wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="schlecht">😴 Schlecht</SelectItem>
                        <SelectItem value="okay">😐 Okay</SelectItem>
                        <SelectItem value="gut">😊 Gut</SelectItem>
                        <SelectItem value="sehr_gut">😁 Sehr gut</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Aufwach-Gefühl</Label>
                    <Select value={formData.aufwach_gefuehl || ''} onValueChange={(value) => setFormData({...formData, aufwach_gefuehl: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Gefühl wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="erschoepft">😵 Erschöpft</SelectItem>
                        <SelectItem value="muede">😴 Müde</SelectItem>
                        <SelectItem value="erholt">😌 Erholt</SelectItem>
                        <SelectItem value="energiegeladen">⚡ Energiegeladen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Schlafenszeitpunkt</Label>
                    <Select value={formData.schlafenszeitpunkt || ''} onValueChange={(value) => setFormData({...formData, schlafenszeitpunkt: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Zeit wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vor_22">🕘 Vor 22:00</SelectItem>
                        <SelectItem value="22_23">🕙 22:00-23:00</SelectItem>
                        <SelectItem value="23_24">🕙 23:00-24:00</SelectItem>
                        <SelectItem value="nach_24">🕐 Nach 24:00</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Schlafbereitschaft</Label>
                    <Select value={formData.schlaf_bereitschaft || ''} onValueChange={(value) => setFormData({...formData, schlaf_bereitschaft: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Bereitschaft wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aufgedreht">⚡ Aufgedreht</SelectItem>
                        <SelectItem value="normal">😐 Normal</SelectItem>
                        <SelectItem value="muede">😴 Müde</SelectItem>
                        <SelectItem value="sehr_muede">😵 Sehr müde</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Tagesplanung */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">🎯 Tagesplanung</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Fokus heute</Label>
                    <Select value={formData.fokus_heute || ''} onValueChange={(value) => setFormData({...formData, fokus_heute: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Fokus wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regeneration">🛋️ Regeneration</SelectItem>
                        <SelectItem value="balance">⚖️ Balance</SelectItem>
                        <SelectItem value="produktivitaet">🚀 Produktivität</SelectItem>
                        <SelectItem value="ueberleben">😵 Überleben</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Energie-Budget</Label>
                    <Select value={formData.energie_budget || ''} onValueChange={(value) => setFormData({...formData, energie_budget: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Budget wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="niedrig">🔋 Niedrig</SelectItem>
                        <SelectItem value="mittel">🔋🔋 Mittel</SelectItem>
                        <SelectItem value="hoch">🔋🔋🔋 Hoch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* DAY TAB */}
            <TabsContent value="day" className="space-y-6">
              {/* Aktivitäten */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">🏃 Aktivitäten</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.sport_heute || false}
                      onCheckedChange={(checked) => setFormData({...formData, sport_heute: !!checked})}
                    />
                    <Label>Sport heute</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.meditation_heute || false}
                      onCheckedChange={(checked) => setFormData({...formData, meditation_heute: !!checked})}
                    />
                    <Label>Meditation heute</Label>
                  </div>
                </div>

                {formData.sport_heute && (
                  <div>
                    <Label>Sport-Intensität</Label>
                    <Select value={formData.sport_intensitaet || ''} onValueChange={(value) => setFormData({...formData, sport_intensitaet: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Intensität wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="leicht">🚶 Leicht</SelectItem>
                        <SelectItem value="mittel">🏃 Mittel</SelectItem>
                        <SelectItem value="hoch">🏃‍♂️💨 Hoch</SelectItem>
                        <SelectItem value="sehr_hoch">🏃‍♂️💨💨 Sehr hoch</SelectItem>
                        <SelectItem value="keine">🚫 Keine</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.meditation_heute && (
                  <div>
                    <Label>Meditation Timing</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {MEDITATION_TIMING_OPTIONS.map(timing => (
                        <div key={timing} className="flex items-center space-x-2">
                          <Checkbox
                            checked={(formData.meditation_timing || []).includes(timing)}
                            onCheckedChange={(checked) => updateArrayField('meditation_timing', timing, !!checked)}
                          />
                          <Label className="text-sm">{timing}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.oliver_arbeit_heute || false}
                    onCheckedChange={(checked) => setFormData({...formData, oliver_arbeit_heute: !!checked})}
                  />
                  <Label>Oliver-Arbeit heute</Label>
                </div>
              </div>

              {/* Werte */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">⭐ Werte & Events</h3>
                
                <div>
                  <Label>Werte gelebt</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {WERTE_OPTIONS.map(wert => (
                      <div key={wert} className="flex items-center space-x-2">
                        <Checkbox
                          checked={(formData.werte_gelebt || []).includes(wert)}
                          onCheckedChange={(checked) => updateArrayField('werte_gelebt', wert, !!checked)}
                        />
                        <Label className="text-sm">{wert}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Werte-Kreis Balance</Label>
                    <Select value={formData.werte_kreis_balance || ''} onValueChange={(value) => setFormData({...formData, werte_kreis_balance: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Balance wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="innerer_dominiert">🧘 Innerer dominiert</SelectItem>
                        <SelectItem value="ausgewogen">⚖️ Ausgewogen</SelectItem>
                        <SelectItem value="aeusserer_zuviel">📈 Äußerer zu viel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Werte-Zufriedenheit: {formData.werte_zufriedenheit || 5}/10</Label>
                    <Slider
                      value={[formData.werte_zufriedenheit || 5]}
                      onValueChange={(value) => setFormData({...formData, werte_zufriedenheit: value[0]})}
                      max={10}
                      min={1}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label>Mood-Boosting Events</Label>
                  <div className="grid grid-cols-1 gap-2 mt-2 max-h-40 overflow-y-auto">
                    {MOOD_BOOSTING_OPTIONS.map(event => (
                      <div key={event} className="flex items-center space-x-2">
                        <Checkbox
                          checked={(formData.mood_boosting_events || []).includes(event)}
                          onCheckedChange={(checked) => updateArrayField('mood_boosting_events', event, !!checked)}
                        />
                        <Label className="text-sm">{event}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Mood-Killing Events</Label>
                  <div className="grid grid-cols-1 gap-2 mt-2 max-h-40 overflow-y-auto">
                    {MOOD_KILLING_OPTIONS.map(event => (
                      <div key={event} className="flex items-center space-x-2">
                        <Checkbox
                          checked={(formData.mood_killing_events || []).includes(event)}
                          onCheckedChange={(checked) => updateArrayField('mood_killing_events', event, !!checked)}
                        />
                        <Label className="text-sm">{event}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Events-Bilanz</Label>
                  <Select value={formData.events_bilanz || ''} onValueChange={(value) => setFormData({...formData, events_bilanz: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Bilanz wählen" />
                    </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mehr_booster">📈 Mehr Booster</SelectItem>
                        <SelectItem value="ausgeglichen">⚖️ Ausgeglichen</SelectItem>
                        <SelectItem value="mehr_killer">📉 Mehr Killer</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Alkohol & Ernährung */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">🍽️ Ernährung & Alkohol</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Alkohol-Konsum</Label>
                    <Select value={formData.alkohol_konsum || ''} onValueChange={(value) => setFormData({...formData, alkohol_konsum: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Konsum wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kein">🚫 Kein</SelectItem>
                        <SelectItem value="ein_glas">🍷 Ein Glas</SelectItem>
                        <SelectItem value="moderat">🍷🍷 Moderat</SelectItem>
                        <SelectItem value="hoch">🍷🍷🍷 Hoch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Alkohol-Timing</Label>
                    <Select value={formData.alkohol_timing || ''} onValueChange={(value) => setFormData({...formData, alkohol_timing: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Timing wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kein">🚫 Kein</SelectItem>
                        <SelectItem value="mittags">🌞 Mittags</SelectItem>
                        <SelectItem value="nachmittags">🌅 Nachmittags</SelectItem>
                        <SelectItem value="abends">🌇 Abends</SelectItem>
                        <SelectItem value="spaet_abends">🌙 Spät abends</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.alkohol_konsum && formData.alkohol_konsum !== 'kein' && (
                  <div>
                    <Label>Alkohol-Details</Label>
                    <Textarea
                      value={formData.alkohol_details || ''}
                      onChange={(e) => setFormData({...formData, alkohol_details: e.target.value})}
                      placeholder="Was genau, wie viel, Anlass..."
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Letzte Hauptmahlzeit</Label>
                    <Select value={formData.letzte_hauptmahlzeit || ''} onValueChange={(value) => setFormData({...formData, letzte_hauptmahlzeit: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Zeit wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vor_12">🕚 Vor 12:00</SelectItem>
                        <SelectItem value="12_14">🕐 12:00-14:00</SelectItem>
                        <SelectItem value="14_16">🕑 14:00-16:00</SelectItem>
                        <SelectItem value="16_18">🕕 16:00-18:00</SelectItem>
                        <SelectItem value="18_19">🕕 18:00-19:00</SelectItem>
                        <SelectItem value="19_20">🕖 19:00-20:00</SelectItem>
                        <SelectItem value="nach_20">🕗 Nach 20:00</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Abendliche Nahrung</Label>
                    <Select value={formData.abendliche_nahrung || ''} onValueChange={(value) => setFormData({...formData, abendliche_nahrung: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Art wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="keine">🚫 Keine</SelectItem>
                        <SelectItem value="leichte_snacks">🥨 Leichte Snacks</SelectItem>
                        <SelectItem value="normale_mahlzeit">🍽️ Normale Mahlzeit</SelectItem>
                        <SelectItem value="schwere_mahlzeit">🍖 Schwere Mahlzeit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Verdauungsgefühl</Label>
                  <Select value={formData.verdauungsgefuehl || ''} onValueChange={(value) => setFormData({...formData, verdauungsgefuehl: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Gefühl wählen" />
                    </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="leicht_gut">✅ Leicht & gut</SelectItem>
                        <SelectItem value="normal">😐 Normal</SelectItem>
                        <SelectItem value="schwer_voll">😵 Schwer & voll</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* EVENING TAB */}
            <TabsContent value="evening" className="space-y-6">
              {/* Mental & Emotional */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">🧠 Mental & Emotional</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Gedanken-Aktivität</Label>
                    <Select value={formData.gedanken_aktivitaet || ''} onValueChange={(value) => setFormData({...formData, gedanken_aktivitaet: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Aktivität wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ruhig_klar">🧘 Ruhig & klar</SelectItem>
                        <SelectItem value="normal">😐 Normal</SelectItem>
                        <SelectItem value="kopf_voll_unruhe">🌪️ Kopf voll & Unruhe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Emotionale Belastung</Label>
                    <Select value={formData.emotionale_belastung || ''} onValueChange={(value) => setFormData({...formData, emotionale_belastung: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Belastung wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="keine">😌 Keine</SelectItem>
                        <SelectItem value="leicht">😟 Leicht</SelectItem>
                        <SelectItem value="mittel">😰 Mittel</SelectItem>
                        <SelectItem value="hoch">😫 Hoch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Stress Level: {formData.stress_level || 5}/10</Label>
                    <Slider
                      value={[formData.stress_level || 5]}
                      onValueChange={(value) => setFormData({...formData, stress_level: value[0]})}
                      max={10}
                      min={1}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Task Feeling</Label>
                    <Select value={formData.task_feeling || ''} onValueChange={(value) => setFormData({...formData, task_feeling: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Feeling wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mehr_geschafft">✅ Mehr geschafft</SelectItem>
                        <SelectItem value="normal_produktiv">😐 Normal produktiv</SelectItem>
                        <SelectItem value="weniger_geschafft">❌ Weniger geschafft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Körperliche Symptome */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">🏥 Körperliche Symptome</h3>
                
                <div className="grid grid-cols-3 gap-2">
                  {SYMPTOME_OPTIONS.map(symptom => (
                    <div key={symptom} className="flex items-center space-x-2">
                      <Checkbox
                        checked={(formData.koerperliche_symptome || []).includes(symptom)}
                        onCheckedChange={(checked) => updateArrayField('koerperliche_symptome', symptom, !!checked)}
                      />
                      <Label className="text-sm">{symptom}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tagesabschluss */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">🌅 Tagesabschluss</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Energie-Level Ende</Label>
                    <Select value={formData.energie_level_ende || ''} onValueChange={(value) => setFormData({...formData, energie_level_ende: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Level wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="erschoepft">😵 Erschöpft</SelectItem>
                        <SelectItem value="muede">😴 Müde</SelectItem>
                        <SelectItem value="okay">😐 Okay</SelectItem>
                        <SelectItem value="energievoll">⚡ Energievoll</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tag-Bewertung: {formData.tag_bewertung || 5}/10</Label>
                    <Slider
                      value={[formData.tag_bewertung || 5]}
                      onValueChange={(value) => setFormData({...formData, tag_bewertung: value[0]})}
                      max={10}
                      min={1}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label>Kontemplative Aktivitäten</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {KONTEMPLATIVE_OPTIONS.map(aktivitaet => (
                      <div key={aktivitaet} className="flex items-center space-x-2">
                        <Checkbox
                          checked={(formData.kontemplative_aktivitaeten || []).includes(aktivitaet)}
                          onCheckedChange={(checked) => updateArrayField('kontemplative_aktivitaeten', aktivitaet, !!checked)}
                        />
                        <Label className="text-sm">{aktivitaet}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Kognitive Verarbeitung</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {KOGNITIVE_OPTIONS.map(verarbeitung => (
                      <div key={verarbeitung} className="flex items-center space-x-2">
                        <Checkbox
                          checked={(formData.kognitive_verarbeitung || []).includes(verarbeitung)}
                          onCheckedChange={(checked) => updateArrayField('kognitive_verarbeitung', verarbeitung, !!checked)}
                        />
                        <Label className="text-sm">{verarbeitung}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Größter Widerstand</Label>
                  <Textarea
                    value={formData.groesster_widerstand || ''}
                    onChange={(e) => setFormData({...formData, groesster_widerstand: e.target.value})}
                    placeholder="Was war heute der größte Widerstand oder die größte Herausforderung?"
                  />
                </div>

                <div>
                  <Label>Erkenntnisse</Label>
                  <Textarea
                    value={formData.erkenntnisse || ''}
                    onChange={(e) => setFormData({...formData, erkenntnisse: e.target.value})}
                    placeholder="Welche wichtigen Erkenntnisse habe ich heute gewonnen?"
                  />
                </div>

                <div>
                  <Label>Anpassungen morgen</Label>
                  <Textarea
                    value={formData.anpassungen_morgen || ''}
                    onChange={(e) => setFormData({...formData, anpassungen_morgen: e.target.value})}
                    placeholder="Was werde ich morgen anders machen?"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Regenerationsbedarf morgen</Label>
                    <Select value={formData.regenerations_bedarf_morgen || ''} onValueChange={(value) => setFormData({...formData, regenerations_bedarf_morgen: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Bedarf wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hoch">🛋️ Hoch</SelectItem>
                        <SelectItem value="mittel">😐 Mittel</SelectItem>
                        <SelectItem value="niedrig">⚡ Niedrig</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Erwartete HRV morgen</Label>
                    <Select value={formData.erwartete_hrv_morgen || ''} onValueChange={(value) => setFormData({...formData, erwartete_hrv_morgen: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Erwartung wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="niedrig">🔴 Niedrig</SelectItem>
                        <SelectItem value="normal">🟡 Normal</SelectItem>
                        <SelectItem value="hoch">🟢 Hoch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Notizen</Label>
                  <Textarea
                    value={formData.notizen || ''}
                    onChange={(e) => setFormData({...formData, notizen: e.target.value})}
                    placeholder="Weitere Notizen oder Gedanken zum Tag..."
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          // Read-only view
          <div className="space-y-6">
            {/* ... existing read-only view content ... */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">📊 HRV & Framework Assessment</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>HRV Score</Label>
                  <p className="mt-1 p-2 bg-muted rounded">{entry.hrv_score || 'N/A'}</p>
                </div>
                <div>
                  <Label>HRV Status</Label>
                  <p className="mt-1 p-2 bg-muted rounded">{entry.hrv_status || 'N/A'}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Mind Status</Label>
                  <p className="mt-1 p-2 bg-muted rounded">{entry.mind_status || 'N/A'}</p>
                </div>
                <div>
                  <Label>Body Status</Label>
                  <p className="mt-1 p-2 bg-muted rounded">{entry.body_status || 'N/A'}</p>
                </div>
                <div>
                  <Label>Soul Status</Label>
                  <p className="mt-1 p-2 bg-muted rounded">{entry.soul_status || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">🎯 Aktivitäten & Bewertungen</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <span>{entry.sport_heute ? '✅' : '❌'}</span>
                  <Label>Sport heute</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <span>{entry.meditation_heute ? '✅' : '❌'}</span>
                  <Label>Meditation heute</Label>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Stress Level</Label>
                  <p className="mt-1 p-2 bg-muted rounded">{entry.stress_level || 'N/A'}/10</p>
                </div>
                <div>
                  <Label>Werte-Zufriedenheit</Label>
                  <p className="mt-1 p-2 bg-muted rounded">{entry.werte_zufriedenheit || 'N/A'}/10</p>
                </div>
                <div>
                  <Label>Tag-Bewertung</Label>
                  <p className="mt-1 p-2 bg-muted rounded">{entry.tag_bewertung || 'N/A'}/10</p>
                </div>
              </div>
            </div>

            {entry.notizen && (
              <div className="space-y-2">
                <Label>Notizen</Label>
                <p className="p-3 bg-muted rounded-lg">{entry.notizen}</p>
              </div>
            )}

            {entry.erkenntnisse && (
              <div className="space-y-2">
                <Label>Erkenntnisse</Label>
                <p className="p-3 bg-muted rounded-lg">{entry.erkenntnisse}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
