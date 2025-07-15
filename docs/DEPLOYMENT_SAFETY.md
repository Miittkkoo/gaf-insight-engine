# Deployment Safety & Migration Strategy

## 🛡️ Sichere Updates für Production

### 1. Database Migration Best Practices

#### ✅ Safe Migration Patterns
```sql
-- ✅ SICHER: Spalten hinzufügen mit DEFAULT Werten
ALTER TABLE user_profiles 
ADD COLUMN new_feature_enabled BOOLEAN DEFAULT false;

-- ✅ SICHER: Neue Tabellen erstellen
CREATE TABLE new_feature_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ✅ SICHER: Indizes hinzufügen (non-blocking)
CREATE INDEX CONCURRENTLY idx_daily_metrics_date 
ON daily_metrics(metric_date);
```

#### ❌ Dangerous Migration Patterns (VERMEIDEN)
```sql
-- ❌ GEFÄHRLICH: Spalten löschen
ALTER TABLE user_profiles DROP COLUMN old_field;

-- ❌ GEFÄHRLICH: NOT NULL ohne DEFAULT
ALTER TABLE user_profiles 
ADD COLUMN required_field TEXT NOT NULL; -- FEHLER!

-- ❌ GEFÄHRLICH: Datentyp ändern
ALTER TABLE daily_metrics 
ALTER COLUMN hrv_score TYPE INTEGER; -- Datenverlust!
```

### 2. Migration Workflow

#### Stufe 1: Additive Changes (Sicher)
```sql
-- Neue Felder mit DEFAULT-Werten hinzufügen
ALTER TABLE user_profiles 
ADD COLUMN feature_v2_enabled BOOLEAN DEFAULT false;

-- Neue optionale JSONB-Felder
ALTER TABLE daily_metrics 
ADD COLUMN extended_metrics JSONB DEFAULT '{}';
```

#### Stufe 2: Backward-Compatible Updates
```sql
-- Views für Rückwärtskompatibilität
CREATE OR REPLACE VIEW daily_metrics_v1 AS
SELECT 
  id, user_id, metric_date, hrv_score,
  -- Map neue Felder zu alten Strukturen
  COALESCE(extended_metrics->>'new_field', old_field) as old_field
FROM daily_metrics;
```

#### Stufe 3: Deprecation (nach 3+ Deployment-Zyklen)
```sql
-- Erst nach mehreren erfolgreichen Deployments
-- und Bestätigung dass keine alte App-Versionen mehr laufen
ALTER TABLE user_profiles DROP COLUMN deprecated_field;
```

### 3. RLS Policy Evolution

#### ✅ Sichere Policy Updates
```sql
-- Neue Policies hinzufügen ohne alte zu löschen
CREATE POLICY "v2_users_can_read_own_data" 
ON new_table FOR SELECT 
USING (auth.uid() = user_id);

-- Policies erst nach App-Update löschen
-- DROP POLICY "old_policy_name" ON table_name;
```

### 4. App Version Management

#### Frontend Compatibility
```typescript
// src/utils/appVersion.ts
export const APP_VERSION = '1.2.0';
export const MIN_SUPPORTED_DB_VERSION = '1.1.0';

export const checkDatabaseCompatibility = async () => {
  const { data } = await supabase
    .from('system_config')
    .select('db_version')
    .single();
  
  // Version Check Logic
  if (compareVersions(data.db_version, MIN_SUPPORTED_DB_VERSION) < 0) {
    throw new Error('Database version not supported');
  }
};
```

#### Database Version Tracking
```sql
-- System Config Table für Version Tracking
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

INSERT INTO system_config (key, value) 
VALUES ('db_version', '"1.0.0"'::jsonb)
ON CONFLICT (key) DO NOTHING;
```

### 5. Feature Flags System

#### Database Schema
```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  user_percentage NUMERIC DEFAULT 0,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS für Feature Flags
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read feature flags" 
ON feature_flags FOR SELECT 
USING (true);
```

#### TypeScript Implementation
```typescript
// src/utils/featureFlags.ts
export class FeatureFlags {
  private static flags: Map<string, boolean> = new Map();
  
  static async initialize() {
    const { data } = await supabase
      .from('feature_flags')
      .select('name, enabled, user_percentage, config');
    
    data?.forEach(flag => {
      this.flags.set(flag.name, this.shouldEnableFlag(flag));
    });
  }
  
  static isEnabled(flagName: string): boolean {
    return this.flags.get(flagName) ?? false;
  }
  
  private static shouldEnableFlag(flag: any): boolean {
    if (!flag.enabled) return false;
    
    // Percentage-based rollout
    if (flag.user_percentage < 100) {
      const userHash = this.getUserHash();
      return (userHash % 100) < flag.user_percentage;
    }
    
    return true;
  }
}
```

### 6. Rollback Strategy

#### Database Rollback Plan
```sql
-- Rollback-Skripte für jede Migration vorbereiten
-- migrations/rollback/20241215_rollback_new_feature.sql

-- 1. Neue Spalten auf DEFAULT setzen
UPDATE user_profiles SET new_feature_enabled = false;

-- 2. Neue Policies deaktivieren (nicht löschen)
ALTER POLICY "new_feature_policy" ON user_profiles 
RENAME TO "new_feature_policy_disabled";

-- 3. Old Views wiederherstellen
CREATE OR REPLACE VIEW legacy_user_view AS 
SELECT id, display_name, timezone, garmin_connected 
FROM user_profiles;
```

#### Application Rollback
```typescript
// Graceful Degradation
export const withFallback = async <T>(
  newFeature: () => Promise<T>,
  fallback: () => Promise<T>
): Promise<T> => {
  try {
    if (FeatureFlags.isEnabled('use_new_feature')) {
      return await newFeature();
    }
  } catch (error) {
    console.warn('New feature failed, falling back:', error);
  }
  
  return await fallback();
};
```

### 7. Monitoring & Health Checks

#### Database Health Check
```sql
-- Health Check Function
CREATE OR REPLACE FUNCTION health_check()
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  details JSONB
) AS $$
BEGIN
  -- Check RLS Policies
  RETURN QUERY
  SELECT 
    'rls_enabled'::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'ERROR' END::TEXT,
    jsonb_build_object('tables_with_rls', COUNT(*))
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public' 
    AND c.relrowsecurity = true;
    
  -- Check User Profiles
  RETURN QUERY
  SELECT 
    'user_profiles'::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'WARNING' END::TEXT,
    jsonb_build_object('total_users', COUNT(*))
  FROM user_profiles;
  
  -- Add more checks...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Frontend Health Monitor
```typescript
// src/utils/healthCheck.ts
export const performHealthCheck = async () => {
  const checks = await Promise.allSettled([
    supabase.rpc('health_check'),
    checkAuthStatus(),
    checkDatabaseConnectivity(),
    validateUserPermissions()
  ]);
  
  const results = checks.map((check, index) => ({
    name: ['database', 'auth', 'connectivity', 'permissions'][index],
    status: check.status,
    result: check.status === 'fulfilled' ? check.value : check.reason
  }));
  
  return results;
};
```

### 8. Deployment Checklist

#### Pre-Deployment
- [ ] Migration scripts tested in staging
- [ ] Rollback scripts prepared
- [ ] Feature flags configured
- [ ] Health checks passing
- [ ] User data backup verified

#### During Deployment
- [ ] Apply migrations in correct order
- [ ] Monitor error rates
- [ ] Check RLS policies active
- [ ] Verify user access working

#### Post-Deployment
- [ ] Run health checks
- [ ] Monitor user activity
- [ ] Check error logs
- [ ] Validate feature functionality
- [ ] Prepare hotfix if needed

### 9. Emergency Procedures

#### Immediate Rollback Triggers
1. Error rate > 5%
2. User login failures > 2%
3. Database query timeouts > 1%
4. RLS policy violations detected

#### Emergency Response
```bash
# Quick rollback commands
supabase db reset --linked
supabase db push --linked --include-all

# Health check
supabase functions invoke health-check
```

## 🎯 Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Implement version tracking
- [ ] Create health check functions
- [ ] Set up feature flags system
- [ ] Document current schema

### Phase 2: Safety Measures (Week 3-4)
- [ ] Implement graceful degradation
- [ ] Create rollback scripts
- [ ] Set up monitoring
- [ ] Test migration procedures

### Phase 3: Production Hardening (Week 5-6)
- [ ] Automated health checks
- [ ] Performance monitoring
- [ ] User experience tracking
- [ ] Emergency procedures testing

## 📋 Success Metrics

- Zero user data loss during updates
- < 30 seconds downtime during deployments
- 100% rollback success rate in testing
- < 1% user impact during feature rollouts
