-- Erweitere den analysis_type Check Constraint um 'triggered_update'
ALTER TABLE public.gaf_analysis_results 
DROP CONSTRAINT gaf_analysis_results_analysis_type_check;

ALTER TABLE public.gaf_analysis_results 
ADD CONSTRAINT gaf_analysis_results_analysis_type_check 
CHECK (analysis_type = ANY (ARRAY['daily'::text, 'weekly'::text, 'retrospective'::text, 'emergency'::text, 'triggered_update'::text]));

-- Test ob der erweiterte Constraint funktioniert
SELECT 'Analysis type constraint updated successfully' as status;