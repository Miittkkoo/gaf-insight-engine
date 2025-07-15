// Migration Safety Utilities

import { supabase } from '@/integrations/supabase/client';

export interface MigrationCheck {
  name: string;
  status: 'OK' | 'WARNING' | 'ERROR';
  message: string;
  details?: any;
}

export class MigrationSafety {
  /**
   * Überprüft die Datenbank-Kompatibilität vor Updates
   */
  static async performPreMigrationChecks(): Promise<MigrationCheck[]> {
    const checks: MigrationCheck[] = [];

    try {
      // 1. RLS Policy Check
      const rlsCheck = await this.checkRLSPolicies();
      checks.push(rlsCheck);

      // 2. User Data Integrity Check
      const userDataCheck = await this.checkUserDataIntegrity();
      checks.push(userDataCheck);

      // 3. Constraint Validation
      const constraintCheck = await this.checkConstraints();
      checks.push(constraintCheck);

      // 4. Active Sessions Check
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
   * Überprüft alle RLS Policies
   */
  private static async checkRLSPolicies(): Promise<MigrationCheck> {
    try {
      const { data, error } = await supabase.rpc('get_rls_status');
      
      if (error) throw error;

      const tablesWithoutRLS = data?.filter((table: any) => !table.rls_enabled);
      
      if (tablesWithoutRLS?.length > 0) {
        return {
          name: 'rls_policies',
          status: 'WARNING',
          message: `${tablesWithoutRLS.length} tables without RLS found`,
          details: tablesWithoutRLS
        };
      }

      return {
        name: 'rls_policies',
        status: 'OK',
        message: 'All tables have RLS enabled'
      };
    } catch (error) {
      return {
        name: 'rls_policies',
        status: 'ERROR',
        message: `RLS check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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

      // Check for users without profiles
      const { data: usersWithoutProfiles, error: profileError } = await supabase
        .rpc('find_users_without_profiles');

      if (profileError) throw profileError;

      if (usersWithoutProfiles && usersWithoutProfiles.length > 0) {
        return {
          name: 'user_data_integrity',
          status: 'WARNING',
          message: `Found ${usersWithoutProfiles.length} users without profiles`,
          details: { users_without_profiles: usersWithoutProfiles.length }
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
   * Überprüft Datenbank-Constraints
   */
  private static async checkConstraints(): Promise<MigrationCheck> {
    try {
      const { data, error } = await supabase.rpc('validate_constraints');
      
      if (error) throw error;

      const violatedConstraints = data?.filter((constraint: any) => constraint.violations > 0);
      
      if (violatedConstraints?.length > 0) {
        return {
          name: 'constraints',
          status: 'ERROR',
          message: `Found ${violatedConstraints.length} constraint violations`,
          details: violatedConstraints
        };
      }

      return {
        name: 'constraints',
        status: 'OK',
        message: 'All constraints validated successfully'
      };
    } catch (error) {
      return {
        name: 'constraints',
        status: 'WARNING',
        message: `Constraint validation skipped: ${error instanceof Error ? error.message : 'Unknown error'}`
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

      // Store backup in user_data_backups table
      const backupData = {
        user_id: userId,
        backup_date: timestamp,
        profile_data: profile,
        metrics_data: metrics,
        backup_type: 'pre_migration'
      };

      const { error } = await supabase
        .from('user_data_backups')
        .insert(backupData);

      if (error) throw error;

      console.log(`Backup created for user ${userId} at ${timestamp}`);
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
      const criticalFunctions = ['daily_metrics_insert', 'profile_update'];
      for (const funcName of criticalFunctions) {
        try {
          const { error } = await supabase.rpc(`test_${funcName}`);
          checks.push({
            name: `function_${funcName}`,
            status: error ? 'ERROR' : 'OK',
            message: error ? `Function ${funcName} failed: ${error.message}` : `Function ${funcName} working`
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
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*');

      if (error) throw error;

      if (data) {
        data.forEach(flag => {
          this.flags.set(flag.name, flag);
        });
      }

      this.initialized = true;
    } catch (error) {
      console.warn('Failed to initialize feature flags:', error);
      // Continue without feature flags
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