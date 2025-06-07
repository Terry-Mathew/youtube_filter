import React, { useState, useEffect } from 'react';
import { Database, Download, Upload, CheckCircle, AlertCircle, Loader2, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from '../hooks/useAuth';
import { userStorageMigration, type MigrationResult } from '../lib/user-storage-migration';

interface MigrationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  details?: string;
}

export default function DataMigration() {
  const { user, isAuthenticated } = useAuth();
  const [isCheckingMigration, setIsCheckingMigration] = useState(false);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [backupData, setBackupData] = useState<string>('');
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  
  const [migrationSteps, setMigrationSteps] = useState<MigrationStep[]>([
    {
      id: 'backup',
      title: 'Create Backup',
      description: 'Creating backup of localStorage data',
      status: 'pending',
    },
    {
      id: 'categories',
      title: 'Migrate Categories',
      description: 'Moving categories to database',
      status: 'pending',
    },
    {
      id: 'preferences',
      title: 'Migrate Preferences',
      description: 'Moving user preferences to profile',
      status: 'pending',
    },
    {
      id: 'history',
      title: 'Migrate Search History',
      description: 'Moving search history to database',
      status: 'pending',
    },
    {
      id: 'cleanup',
      title: 'Cleanup',
      description: 'Removing localStorage data',
      status: 'pending',
    },
  ]);

  // Check if migration is needed on component mount
  useEffect(() => {
    if (isAuthenticated) {
      checkMigrationStatus();
    }
  }, [isAuthenticated]);

  const checkMigrationStatus = async () => {
    setIsCheckingMigration(true);
    
    try {
      // Check if localStorage has data to migrate
      const hasLocalData = 
        localStorage.getItem('youtube-filter-categories') ||
        localStorage.getItem('youtube-filter-preferences') ||
        localStorage.getItem('youtube-filter-search-history') ||
        localStorage.getItem('youtube-filter-category-settings');

      setNeedsMigration(!!hasLocalData);
    } catch (error) {
      console.error('Error checking migration status:', error);
    } finally {
      setIsCheckingMigration(false);
    }
  };

  const updateStepStatus = (stepId: string, status: MigrationStep['status'], details?: string) => {
    setMigrationSteps(steps => 
      steps.map(step => 
        step.id === stepId 
          ? { ...step, status, details }
          : step
      )
    );
  };

  const handleMigration = async () => {
    if (!user) return;

    setIsMigrating(true);
    setMigrationResult(null);

    try {
      // Step 1: Create backup
      updateStepStatus('backup', 'running');
      const backup = userStorageMigration.createLocalStorageBackup();
      setBackupData(backup);
      updateStepStatus('backup', 'completed', 'Backup created successfully');

      // Step 2-4: Run migration
      updateStepStatus('categories', 'running');
      updateStepStatus('preferences', 'running');
      updateStepStatus('history', 'running');

      const result = await userStorageMigration.migrateUserData();
      setMigrationResult(result);

      if (result.success) {
        // Update step statuses based on results
        updateStepStatus('categories', 'completed', `${result.categoriesMigrated} categories migrated`);
        updateStepStatus('preferences', result.preferencesMigrated ? 'completed' : 'error', 
          result.preferencesMigrated ? 'Preferences migrated' : 'Failed to migrate preferences');
        updateStepStatus('history', 'completed', 'Search history migrated');

        // Step 5: Cleanup localStorage
        updateStepStatus('cleanup', 'running');
        userStorageMigration.cleanupLocalStorage();
        updateStepStatus('cleanup', 'completed', 'localStorage cleaned up');
        
        setNeedsMigration(false);
      } else {
        // Handle errors
        updateStepStatus('categories', result.categoriesMigrated > 0 ? 'completed' : 'error');
        updateStepStatus('preferences', result.preferencesMigrated ? 'completed' : 'error');
        updateStepStatus('history', 'error');
      }
      
    } catch (error) {
      updateStepStatus('categories', 'error');
      updateStepStatus('preferences', 'error'); 
      updateStepStatus('history', 'error');
      console.error('Migration error:', error);
    } finally {
      setIsMigrating(false);
    }
  };

  const downloadBackup = () => {
    if (!backupData) return;

    const blob = new Blob([backupData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `youtube-filter-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStepIcon = (status: MigrationStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getOverallProgress = () => {
    const completed = migrationSteps.filter(step => step.status === 'completed').length;
    return (completed / migrationSteps.length) * 100;
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Migration
          </CardTitle>
          <CardDescription>
            Please sign in to migrate your data from localStorage to your secure account
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isCheckingMigration) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Checking migration status...</span>
        </CardContent>
      </Card>
    );
  }

  if (!needsMigration && !migrationResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            No Migration Needed
          </CardTitle>
          <CardDescription>
            Your data is already synced with your account or no local data was found to migrate.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Migration
        </CardTitle>
        <CardDescription>
          Migrate your local data to your secure Supabase account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {needsMigration && !migrationResult && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              We found local data that can be migrated to your account. This will move your categories, 
              preferences, and search history to secure cloud storage.
            </AlertDescription>
          </Alert>
        )}

        {migrationResult && (
          <div className="space-y-4">
            {migrationResult.success ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Migration completed successfully! 
                  {migrationResult.categoriesMigrated > 0 && ` ${migrationResult.categoriesMigrated} categories migrated.`}
                  {migrationResult.preferencesMigrated && ` Preferences migrated.`}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Migration completed with some errors. {migrationResult.errors.join(' ')}
                </AlertDescription>
              </Alert>
            )}

            {migrationResult.skipped.length > 0 && (
              <Alert>
                <AlertDescription>
                  {migrationResult.skipped.join(' ')}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {(isMigrating || migrationResult) && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Migration Progress</span>
                <span>{Math.round(getOverallProgress())}%</span>
              </div>
              <Progress value={getOverallProgress()} className="w-full" />
            </div>

            <div className="space-y-3">
              {migrationSteps.map((step, index) => (
                <div key={step.id} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getStepIcon(step.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{step.title}</span>
                      {step.status === 'running' && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600">{step.description}</p>
                    {step.details && (
                      <p className="text-xs text-gray-500 mt-1">{step.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {needsMigration && !isMigrating && (
            <Button 
              onClick={handleMigration}
              disabled={isMigrating}
              className="flex items-center gap-2"
            >
              {isMigrating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Migrating...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Start Migration
                </>
              )}
            </Button>
          )}

          {backupData && (
            <Dialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download Backup
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Download Data Backup</DialogTitle>
                  <DialogDescription>
                    Your data has been backed up. You can download it as a JSON file for your records.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex gap-3">
                  <Button onClick={downloadBackup} className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Download JSON
                  </Button>
                  <Button variant="outline" onClick={() => setShowBackupDialog(false)}>
                    Close
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• A backup of your data will be created before migration</p>
          <p>• Your local data will be moved to secure cloud storage</p>
          <p>• localStorage will be cleaned up after successful migration</p>
          <p>• This process is safe and can be repeated if needed</p>
        </div>
      </CardContent>
    </Card>
  );
} 