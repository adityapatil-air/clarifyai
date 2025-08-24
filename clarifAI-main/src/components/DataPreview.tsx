import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, Eye, Download, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DataPreviewProps {
  file: File;
  data: any[];
  onResolveErrors: () => void;
  onDownload: () => void;
}

interface DataError {
  row: number;
  column: string;
  type: 'missing' | 'invalid' | 'duplicate' | 'format' | 'typo' | 'inconsistent';
  message: string;
  severity: 'high' | 'medium' | 'low';
  value?: any;
  suggestion?: string;
}

export const DataPreview = ({ file, data, onResolveErrors, onDownload }: DataPreviewProps) => {
  const [showErrors, setShowErrors] = useState(false);
  const [detectedErrors, setDetectedErrors] = useState<DataError[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  // Analyze the actual uploaded data for real issues
  useEffect(() => {
    const analyzeData = () => {
      setIsAnalyzing(true);
      const errors: DataError[] = [];
      
      if (data.length === 0) {
        setIsAnalyzing(false);
        return;
      }

      const columns = Object.keys(data[0]);
      
      // Analyze each column for different types of issues
      columns.forEach((column, colIndex) => {
        const values = data.map(row => row[column]).filter(val => val !== undefined && val !== null);
        const uniqueValues = new Set(values);
        
        // Check for missing values
        const missingCount = data.filter(row => 
          row[column] === undefined || 
          row[column] === null || 
          row[column] === '' || 
          String(row[column]).trim() === ''
        ).length;
        
        if (missingCount > 0) {
          const missingRows = data
            .map((row, index) => ({ row, index }))
            .filter(({ row }) => 
              row[column] === undefined || 
              row[column] === null || 
              row[column] === '' || 
              String(row[column]).trim() === ''
            )
            .slice(0, 3); // Show first 3 missing values
          
          missingRows.forEach(({ index }) => {
            errors.push({
              row: index + 1,
              column,
              type: 'missing',
              message: 'Missing value',
              severity: missingCount > data.length * 0.1 ? 'high' : 'medium',
              suggestion: 'Consider filling with default value or removing row'
            });
          });
        }

        // Check for duplicates
        const duplicates = data
          .map((row, index) => ({ value: row[column], index }))
          .filter(({ value }) => value !== undefined && value !== null && value !== '')
          .reduce((acc, { value, index }) => {
            if (!acc[value]) acc[value] = [];
            acc[value].push(index);
            return acc;
          }, {} as Record<string, number[]>);
        
        Object.entries(duplicates).forEach(([value, indices]) => {
          if (indices.length > 1) {
            errors.push({
              row: indices[0] + 1,
              column,
              type: 'duplicate',
              message: `Duplicate value "${value}" found ${indices.length} times`,
              severity: 'high',
              value,
              suggestion: 'Consider removing duplicates or adding unique identifiers'
            });
          }
        });

        // Check for format issues based on column name patterns
        if (column.toLowerCase().includes('email')) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          data.forEach((row, index) => {
            const value = row[column];
            if (value && value !== '' && !emailRegex.test(String(value))) {
              errors.push({
                row: index + 1,
                column,
                type: 'format',
                message: 'Invalid email format',
                severity: 'high',
                value,
                suggestion: 'Enter a valid email address (e.g., user@domain.com)'
              });
            }
          });
        }

        if (column.toLowerCase().includes('phone')) {
          const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
          data.forEach((row, index) => {
            const value = row[column];
            if (value && value !== '' && !phoneRegex.test(String(value).replace(/[\s\-\(\)]/g, ''))) {
              errors.push({
                row: index + 1,
                column,
                type: 'format',
                message: 'Invalid phone format',
                severity: 'medium',
                value,
                suggestion: 'Enter a valid phone number'
              });
            }
          });
        }

        if (column.toLowerCase().includes('age') || column.toLowerCase().includes('year')) {
          data.forEach((row, index) => {
            const value = row[column];
            if (value && value !== '') {
              const numValue = Number(value);
              if (isNaN(numValue) || numValue < 0 || numValue > 150) {
                errors.push({
                  row: index + 1,
                  column,
                  type: 'format',
                  message: 'Invalid age/year value',
                  severity: 'medium',
                  value,
                  suggestion: 'Enter a valid number between 0-150'
                });
              }
            }
          });
        }

        // Check for inconsistent labels (case sensitivity, extra spaces, etc.)
        if (uniqueValues.size > 1 && uniqueValues.size < data.length * 0.5) {
          const normalizedValues = new Set(
            Array.from(uniqueValues).map(val => String(val).toLowerCase().trim())
          );
          
          if (normalizedValues.size < uniqueValues.size) {
            // Found inconsistencies
            const inconsistencies = Array.from(uniqueValues).filter(val => {
              const normalized = String(val).toLowerCase().trim();
              const similar = Array.from(uniqueValues).filter(v => 
                String(v).toLowerCase().trim() === normalized
              );
              return similar.length > 1;
            });

            if (inconsistencies.length > 0) {
              errors.push({
                row: 1,
                column,
                type: 'inconsistent',
                message: `Inconsistent labels found (${inconsistencies.length} variations)`,
                severity: 'medium',
                value: inconsistencies.join(', '),
                suggestion: 'Normalize labels to consistent format'
              });
            }
          }
        }

        // Check for potential typos in text fields
        if (column.toLowerCase().includes('name') || column.toLowerCase().includes('text')) {
          data.forEach((row, index) => {
            const value = String(row[column] || '');
            if (value.length > 0) {
              // Check for excessive special characters
              const specialCharCount = (value.match(/[^a-zA-Z0-9\s]/g) || []).length;
              if (specialCharCount > value.length * 0.3) {
                errors.push({
                  row: index + 1,
                  column,
                  type: 'invalid',
                  message: 'Contains excessive special characters',
                  severity: 'low',
                  value,
                  suggestion: 'Remove unnecessary special characters'
                });
              }
              
              // Check for all caps (potential typo)
              if (value === value.toUpperCase() && value.length > 3) {
                errors.push({
                  row: index + 1,
                  column,
                  type: 'typo',
                  message: 'Text appears to be in all caps',
                  severity: 'low',
                  value,
                  suggestion: 'Consider proper capitalization'
                });
              }
            }
          });
        }
      });

      // Limit to first 20 errors to avoid overwhelming the UI
      setDetectedErrors(errors.slice(0, 20));
      setIsAnalyzing(false);
    };

    analyzeData();
  }, [data]);

  const errorCounts = {
    high: detectedErrors.filter(e => e.severity === 'high').length,
    medium: detectedErrors.filter(e => e.severity === 'medium').length,
    low: detectedErrors.filter(e => e.severity === 'low').length
  };

  const totalErrors = detectedErrors.length;
  const hasErrors = totalErrors > 0;

  // Get first 5 rows for preview
  const previewData = data.slice(0, 5);
  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      case 'low': return 'bg-info/10 text-info border-info/20';
      default: return 'bg-muted';
    }
  };

  const getErrorTypeIcon = (type: string) => {
    switch (type) {
      case 'missing': return '⚪';
      case 'invalid': return '❌';
      case 'duplicate': return '🔄';
      case 'format': return '🔤';
      case 'typo': return '✏️';
      case 'inconsistent': return '🔄';
      default: return '⚠️';
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Summary Card */}
      <Card className="animate-fade-in">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                Data Preview: {file.name}
              </CardTitle>
              <CardDescription>
                {data.length} rows × {columns.length} columns
                {isAnalyzing && (
                  <span className="ml-2 text-warning">Analyzing data quality...</span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {isAnalyzing ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                  <span className="font-medium text-primary">Analyzing...</span>
                </div>
              ) : hasErrors ? (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning animate-bounce-gentle" />
                  <span className="font-medium text-warning">{totalErrors} issues found</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span className="font-medium text-success">Data looks clean!</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-gradient-primary/5 rounded-lg border">
              <div className="text-2xl font-bold text-primary">{data.length}</div>
              <div className="text-sm text-muted-foreground">Total Records</div>
            </div>
            <div className="text-center p-4 bg-gradient-success/5 rounded-lg border">
              <div className="text-2xl font-bold text-accent">{columns.length}</div>
              <div className="text-sm text-muted-foreground">Columns</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg border">
              <div className="text-2xl font-bold text-info">{(file.size / 1024).toFixed(1)}KB</div>
              <div className="text-sm text-muted-foreground">File Size</div>
            </div>
          </div>

          {hasErrors && !isAnalyzing && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className={`p-3 rounded-lg border ${getSeverityColor('high')}`}>
                <div className="font-semibold">{errorCounts.high}</div>
                <div className="text-sm">High Priority</div>
              </div>
              <div className={`p-3 rounded-lg border ${getSeverityColor('medium')}`}>
                <div className="font-semibold">{errorCounts.medium}</div>
                <div className="text-sm">Medium Priority</div>
              </div>
              <div className={`p-3 rounded-lg border ${getSeverityColor('low')}`}>
                <div className="font-semibold">{errorCounts.low}</div>
                <div className="text-sm">Low Priority</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle>Sample Data (First 5 rows)</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column} className="font-semibold">
                      {column}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, index) => (
                  <TableRow key={index} className="hover:bg-muted/50">
                    {columns.map((column) => (
                      <TableCell key={column} className="max-w-32 truncate">
                        {row[column] || <span className="text-muted-foreground italic">empty</span>}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Error Details */}
      {hasErrors && !isAnalyzing && (
        <Card className="animate-scale-in">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Data Quality Issues Found
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowErrors(!showErrors)}
              >
                {showErrors ? 'Hide' : 'Show'} Details
              </Button>
            </CardTitle>
          </CardHeader>
          {showErrors && (
            <CardContent>
              <div className="space-y-3">
                {detectedErrors.map((error, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border transition-all duration-200 hover:shadow-md ${getSeverityColor(error.severity)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{getErrorTypeIcon(error.type)}</span>
                        <div>
                          <p className="font-medium">
                            Row {error.row}, Column "{error.column}"
                          </p>
                          <p className="text-sm opacity-90">{error.message}</p>
                          {error.value && (
                            <p className="text-xs opacity-75">Value: "{error.value}"</p>
                          )}
                          {error.suggestion && (
                            <p className="text-xs text-primary mt-1">💡 {error.suggestion}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className={getSeverityColor(error.severity)}>
                        {error.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4 animate-fade-in">
        {!isAnalyzing && (
          hasErrors ? (
            <Button
              onClick={onResolveErrors}
              className="bg-gradient-primary hover:shadow-elegant transition-all duration-300 hover:scale-105"
              size="lg"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Resolve Issues with AI
            </Button>
          ) : (
            <Button
              onClick={onDownload}
              className="bg-gradient-success hover:shadow-elegant transition-all duration-300 hover:scale-105"
              size="lg"
            >
              <Download className="w-5 h-5 mr-2" />
              Download Clean Data
            </Button>
          )
        )}
      </div>
    </div>
  );
};