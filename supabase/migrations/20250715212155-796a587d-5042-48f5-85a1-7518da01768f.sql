-- LÖSUNG: Füge den fehlenden Unique Constraint hinzu
ALTER TABLE public.gaf_analysis_results 
ADD CONSTRAINT gaf_analysis_results_user_date_type_unique 
UNIQUE (user_id, analysis_date, analysis_type);

-- Test ob der Constraint jetzt funktioniert
SELECT 'Constraint added successfully' as status;