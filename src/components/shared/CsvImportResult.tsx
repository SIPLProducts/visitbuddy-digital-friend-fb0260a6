import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export interface ImportError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: ImportError[];
}

interface CsvImportResultProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ImportResult | null;
  entityName: string;
}

export function CsvImportResult({ open, onOpenChange, result, entityName }: CsvImportResultProps) {
  if (!result) return null;

  const hasErrors = result.errors.length > 0;
  const allFailed = result.success === 0 && result.failed > 0;
  const allSuccess = result.success > 0 && result.failed === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {allSuccess && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            {allFailed && <XCircle className="h-5 w-5 text-destructive" />}
            {hasErrors && !allFailed && <AlertTriangle className="h-5 w-5 text-amber-500" />}
            Import Results
          </DialogTitle>
          <DialogDescription>
            {entityName} import completed
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {result.success} Imported
              </Badge>
            </div>
            {result.failed > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                  <XCircle className="h-3 w-3 mr-1" />
                  {result.failed} Failed
                </Badge>
              </div>
            )}
          </div>

          {/* Error Details */}
          {hasErrors && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Validation Errors:</p>
              <ScrollArea className="h-[200px] rounded-md border">
                <div className="p-3 space-y-2">
                  {result.errors.map((error, index) => (
                    <div
                      key={index}
                      className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-lg border border-rose-100 dark:border-rose-900/30"
                    >
                      <div className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              Row {error.row}
                            </Badge>
                            <span className="text-xs font-medium text-rose-700 dark:text-rose-400">
                              {error.field}
                            </span>
                          </div>
                          <p className="text-sm text-rose-600 dark:text-rose-400">
                            {error.message}
                          </p>
                          {error.value && (
                            <p className="text-xs text-muted-foreground truncate">
                              Value: "{error.value}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {allSuccess && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <p className="text-sm font-medium">
                  All {result.success} {entityName.toLowerCase()} imported successfully!
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Validation helpers
export function validateRequired(value: string | undefined | null, fieldName: string): string | null {
  if (!value || value.trim() === '') {
    return `${fieldName} is required`;
  }
  return null;
}

export function validateEmail(value: string | undefined | null): string | null {
  if (!value || value.trim() === '') return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return 'Invalid email format';
  }
  return null;
}

export function validatePhone(value: string | undefined | null): string | null {
  if (!value || value.trim() === '') return null;
  const phoneRegex = /^[+]?[\d\s\-()]{8,20}$/;
  if (!phoneRegex.test(value)) {
    return 'Invalid phone format';
  }
  return null;
}

export function validateNumber(value: string | undefined | null, fieldName: string): string | null {
  if (!value || value.trim() === '') return null;
  if (isNaN(parseFloat(value))) {
    return `${fieldName} must be a valid number`;
  }
  return null;
}

export function validateStatus(value: string | undefined | null, validStatuses: string[]): string | null {
  if (!value || value.trim() === '') return null;
  if (!validStatuses.includes(value.toLowerCase())) {
    return `Status must be one of: ${validStatuses.join(', ')}`;
  }
  return null;
}
