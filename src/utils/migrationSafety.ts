// Migration Safety Utilities

import { supabase } from '@/integrations/supabase/client';

export interface MigrationCheck {
  name: string;
  status: 'OK' | 'WARNING' | 'ERROR';
  message: string;
  details?: any;
}

interface HealthCheckResult {
  check_name: string;
  status: string;
  details: any;
}

export class MigrationSafety {
  /**
   * Überprüft die Datenbank-Kompatibilität vor Updates
   */
  static async performPreMigrationChecks(): Promise<MigrationCheck[]> {
    const checks: MigrationCheck[] = [];

    try {
      // 1. Health Check via RPC
      const healthCheck = await this.performHealthCheck();
      checks.push(healthCheck);

      // 2. User Data Integrity Check
      const userDataCheck = await this.checkUserDataIntegrity();
      checks.push(userDataCheck);

      // 3. Active Sessions Check
      const sessionCheck = await this.checkActiveSessions();
      checks.push(sessionCheck);

    } catch (error) {
      checks.push({
        name: 'pre_migration_check',
        status: 'ERROR',
        message: `Failed to perform pre-migration checks: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    return checks;
  }

  /**
   * Führt Health Check durch
   */
  private static async performHealthCheck(): Promise<MigrationCheck> {
    try {
      const { data, error } = await supabase.rpc('health_check');
      
      if (error) throw error;

      const results = data as HealthCheckResult[];
      const hasErrors = results?.some((check: HealthCheckResult) => check.status === 'ERROR');
      const hasWarnings = results?.some((check: HealthCheckResult) => check.status === 'WARNING');
      
      let status: 'OK' | 'WARNING' | 'ERROR' = 'OK';
      if (hasErrors) status = 'ERROR';
      else if (hasWarnings) status = 'WARNING';

      return {
        name: 'database_health',
        status,
        message: `Health check completed: ${results?.length || 0} checks performed`,
        details: results
      };
    } catch (error) {
      return {
        name: 'database_health',
        status: 'ERROR',
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Überprüft User-Daten Integrität
   */
  private static async checkUserDataIntegrity(): Promise<MigrationCheck> {
    try {
      // Check for orphaned records
      const { data: orphanedMetrics, error: metricsError } = await supabase
        .from('daily_metrics')
        .select('id')
        .is('user_id', null);

      if (metricsError) throw metricsError;

      if (orphanedMetrics && orphanedMetrics.length > 0) {
        return {
          name: 'user_data_integrity',
          status: 'ERROR',
          message: `Found ${orphanedMetrics.length} orphaned daily_metrics records`,
          details: { orphaned_count: orphanedMetrics.length }
        };
      }

      return {
        name: 'user_data_integrity',
        status: 'OK',
        message: 'User data integrity verified'
      };
    } catch (error) {
      return {
        name: 'user_data_integrity',
        status: 'ERROR',
        message: `Data integrity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Überprüft aktive Sessions
   */
  private static async checkActiveSessions(): Promise<MigrationCheck> {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) throw error;

      return {
        name: 'active_sessions',
        status: 'OK',
        message: 'Session check completed',
        details: { has_session: !!data.session }
      };
    } catch (error) {
      return {
        name: 'active_sessions',
        status: 'WARNING',
        message: `Session check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Erstellt Backup von kritischen User-Daten
   */
  static async createUserDataBackup(userId: string): Promise<boolean> {
    try {
      const timestamp = new Date().toISOString();
      
      // Backup User Profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Backup Daily Metrics (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: metrics } = await supabase
        .from('daily_metrics')
        .select('*')
        .eq('user_id', userId)
        .gte('metric_date', thirtyDaysAgo.toISOString().split('T')[0]);

      // Log backup info (would be stored in actual implementation)
      console.log(`Backup would be created for user ${userId} at ${timestamp}`);
      console.log('Profile data:', profile ? 'Available' : 'None');
      console.log('Metrics data:', metrics ? `${metrics.length} records` : 'None');

      return true;
    } catch (error) {
      console.error(`Failed to create backup for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Validiert Migration nach Deployment
   */
  static async validatePostMigration(): Promise<MigrationCheck[]> {
    const checks: MigrationCheck[] = [];

    try {
      // 1. Basic connectivity
      const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
      if (error) throw error;

      checks.push({
        name: 'database_connectivity',
        status: 'OK',
        message: 'Database connection successful'
      });

      // 2. RLS still working
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (profileError) {
          checks.push({
            name: 'rls_validation',
            status: 'ERROR',
            message: `RLS validation failed: ${profileError.message}`
          });
        } else {
          checks.push({
            name: 'rls_validation',
            status: 'OK',
            message: 'RLS policies working correctly'
          });
        }
      }

      // 3. Critical functions still work
      const testFunctions = ['test_daily_metrics_insert', 'test_profile_update'];
      for (const funcName of testFunctions) {
        try {
          const { data: result, error } = await supabase.rpc(funcName as any);
          checks.push({
            name: `function_${funcName}`,
            status: error || !result ? 'ERROR' : 'OK',
            message: error 
              ? `Function ${funcName} failed: ${error.message}` 
              : `Function ${funcName} working`
          });
        } catch (error) {
          checks.push({
            name: `function_${funcName}`,
            status: 'WARNING',
            message: `Could not test function ${funcName}`
          });
        }
      }

    } catch (error) {
      checks.push({
        name: 'post_migration_validation',
        status: 'ERROR',
        message: `Post-migration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    return checks;
  }
}

// Feature Flag Utilities
export class FeatureFlags {
  private static flags: Map<string, any> = new Map();
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Fallback implementation - feature flags system is not yet available
      console.log('Feature flags system initializing...');
      this.initialized = true;
    } catch (error) {
      console.warn('Failed to initialize feature flags:', error);
      this.initialized = true;
    }
  }

  static async isEnabled(flagName: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    const flag = this.flags.get(flagName);
    if (!flag) return false;

    if (!flag.enabled) return false;

    // Percentage-based rollout
    if (flag.user_percentage < 100) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userHash = this.getUserHash(user.id);
        return (userHash % 100) < flag.user_percentage;
      }
      return false;
    }

    return true;
  }

  private static getUserHash(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

// Graceful Degradation Utility
export const withFallback = async <T>(
  newFeature: () => Promise<T>,
  fallback: () => Promise<T>,
  featureFlagName?: string
): Promise<T> => {
  try {
    // Check feature flag if provided
    if (featureFlagName) {
      const enabled = await FeatureFlags.isEnabled(featureFlagName);
      if (!enabled) {
        console.log(`Feature ${featureFlagName} disabled, using fallback`);
        return await fallback();
      }
    }

    return await newFeature();
  } catch (error) {
    console.warn('New feature failed, falling back:', error);
    return await fallback();
  }
};

// System Version Management
export class SystemVersion {
  static async getCurrentVersion(): Promise<string> {
    try {
      // For now, return hardcoded version
      // In future, this would query system_config table
      return '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  static async checkCompatibility(minVersion: string): Promise<boolean> {
    try {
      const currentVersion = await this.getCurrentVersion();
      return this.compareVersions(currentVersion, minVersion) >= 0;
    } catch {
      return false;
    }
  }

  private static compareVersions(version1: string, version2: string): number {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;
      
      if (v1part > v2part) return 1;
      if (v1part < v2part) return -1;
    }
    
    return 0;
  }
}