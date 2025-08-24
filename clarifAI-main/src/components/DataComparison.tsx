import { useState } from "react";
import { ToggleLeft, ToggleRight, Download, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface DataComparisonProps {
  originalData: any[];
  cleanedData: any[];
  processingReport: any;
  onDownloadPDFReport: () => void;
}

export const DataComparison = ({ originalData, cleanedData, processingReport, onDownloadPDFReport }: DataComparisonProps) => {
  const [showOriginal, setShowOriginal] = useState(false);
  const { toast } = useToast();

  const currentData = showOriginal ? originalData : cleanedData;
  const columns = originalData.length > 0 ? Object.keys(originalData[0]) : [];

  // Find changes between original and cleaned data
  const getChanges = (rowIndex: number, column: string) => {
    if (!originalData[rowIndex] || !cleanedData[rowIndex]) return null;
    
    const originalValue = originalData[rowIndex][column];
    const cleanedValue = cleanedData[rowIndex][column];
    
    if (originalValue !== cleanedValue) {
      return {
        original: originalValue || '',
        cleaned: cleanedValue || '',
        type: getChangeType(originalValue, cleanedValue)
      };
    }
    return null;
  };

  const getChangeType = (original: any, cleaned: any) => {
    if (!original || original === '') return 'filled';
    if (!cleaned || cleaned === '') return 'removed';
    if (original !== cleaned) return 'modified';
    return 'none';
  };

  const getCellStyle = (rowIndex: number, column: string) => {
    if (showOriginal) return '';
    
    const change = getChanges(rowIndex, column);
    if (!change) return '';
    
    switch (change.type) {
      case 'filled': return 'bg-green-100 border-green-300';
      case 'modified': return 'bg-yellow-100 border-yellow-300';
      case 'removed': return 'bg-red-100 border-red-300';
      default: return '';
    }
  };

  const renderCellContent = (rowIndex: number, column: string, value: any) => {
    if (showOriginal) {
      return value || <span className="text-muted-foreground italic">empty</span>;
    }

    const change = getChanges(rowIndex, column);
    if (!change) {
      return value || <span className="text-muted-foreground italic">empty</span>;
    }

    return (
      <div className="space-y-1">
        <div className="font-medium">{value || <span className="text-muted-foreground italic">empty</span>}</div>
        <div className="text-xs text-muted-foreground">
          {change.type === 'filled' && 'Added'}
          {change.type === 'modified' && `Was: "${change.original}"`}
          {change.type === 'removed' && 'Removed'}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <Card className="animate-fade-in">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Data Comparison View
              </CardTitle>
              <CardDescription>
                Compare original vs cleaned data. Changes are highlighted in the cleaned view.
              </CardDescription>
            </div>
            <Button
              onClick={onDownloadPDFReport}
              className="bg-gradient-primary hover:shadow-elegant transition-all duration-300"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Data Toggle */}
          <div className="flex items-center justify-between mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="font-medium">Viewing:</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={showOriginal ? "default" : "secondary"}>
                Original Data ({originalData.length} records)
              </Badge>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setShowOriginal(!showOriginal)}
                className="p-2 h-12 w-16"
              >
                {showOriginal ? (
                  <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                ) : (
                  <ToggleRight className="w-8 h-8 text-primary" />
                )}
              </Button>
              <Badge variant={!showOriginal ? "default" : "secondary"}>
                Cleaned Data ({cleanedData.length} records)
              </Badge>
            </div>
          </div>

          {/* Legend for cleaned view */}
          {!showOriginal && (
            <div className="flex items-center gap-4 mb-4 p-3 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium">Legend:</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                <span className="text-xs">Added</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
                <span className="text-xs">Modified</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                <span className="text-xs">Removed</span>
              </div>
            </div>
          )}

          {/* Data Table */}
          <ScrollArea className="w-full h-[600px] border rounded-lg">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  {columns.map((column) => (
                    <TableHead key={column} className="font-semibold min-w-32">
                      {column}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.map((row, index) => (
                  <TableRow key={index} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    {columns.map((column) => (
                      <TableCell 
                        key={column} 
                        className={`max-w-48 ${getCellStyle(index, column)}`}
                      >
                        {renderCellContent(index, column, row[column])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="text-center p-4 bg-gradient-primary/5 rounded-lg border">
              <div className="text-2xl font-bold text-primary">{originalData.length}</div>
              <div className="text-sm text-muted-foreground">Original Records</div>
            </div>
            <div className="text-center p-4 bg-gradient-success/5 rounded-lg border">
              <div className="text-2xl font-bold text-success">{cleanedData.length}</div>
              <div className="text-sm text-muted-foreground">Cleaned Records</div>
            </div>
            <div className="text-center p-4 bg-gradient-warning/5 rounded-lg border">
              <div className="text-2xl font-bold text-warning">{processingReport?.missingFixed || 0}</div>
              <div className="text-sm text-muted-foreground">Values Fixed</div>
            </div>
            <div className="text-center p-4 bg-gradient-info/5 rounded-lg border">
              <div className="text-2xl font-bold text-info">{processingReport?.formatFixed || 0}</div>
              <div className="text-sm text-muted-foreground">Formats Fixed</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};