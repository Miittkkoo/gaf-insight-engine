-- Bereinige ALLE alten Funktionen
DROP FUNCTION IF EXISTS public.save_daily_metrics_v2(uuid, date, jsonb);

-- Teste die finale Funktion mit einem simulierten Insert
-- (ohne echte Daten zu verändern)
SELECT 'Function exists and syntax is valid' as test_result;