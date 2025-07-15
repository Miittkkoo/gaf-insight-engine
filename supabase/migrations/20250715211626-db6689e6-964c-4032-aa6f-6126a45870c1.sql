-- SCHRITT 1: Entferne ALLE komplexen save_daily_metrics Funktionen
DROP FUNCTION IF EXISTS public.save_daily_metrics_final(uuid, date, jsonb);
DROP FUNCTION IF EXISTS public.save_daily_metrics_v2(uuid, date, jsonb);
DROP FUNCTION IF EXISTS public.save_daily_metrics(uuid, date, jsonb);

-- SCHRITT 2: Stelle sicher, dass die Tabelle für einfache CRUD-Operationen bereit ist
-- (Die unique constraint bleibt für Datenintegrität)
SELECT 'Table ready for simple CRUD operations' as status;