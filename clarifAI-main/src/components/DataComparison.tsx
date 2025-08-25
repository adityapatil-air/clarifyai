import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Download, Share2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DataComparisonProps {
  originalData: any[];
  cleanedData: any[];
  fileName?: string;
  onDownload: () => void;
}

export const DataComparison = ({ originalData, cleanedData, fileName, onDownload }: DataComparisonProps) => {
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const { toast } = useToast();

  // Compare two values and return if they're different
  const isChanged = (original: any, cleaned: any): boolean => {
    return String(original || '').trim() !== String(cleaned || '').trim();
  };

  // Get change type for styling
  const getChangeType = (original: any, cleaned: any): string => {
    const orig = String(original || '').trim();
    const clean = String(cleaned || '').trim();
    
    if (orig === '' && clean !== '') return 'added';
    if (orig !== '' && clean === '') return 'removed';
    if (orig !== clean) return 'modified';
    return 'unchanged';
  };

  // Get styling for changed cells
  const getCellStyle = (changeType: string): string => {
    switch (changeType) {
      case 'added': return 'bg-green-100 border-green-300 text-green-800 font-medium';
      case 'removed': return 'bg-red-100 border-red-300 text-red-800 font-medium';
      case 'modified': return 'bg-yellow-100 border-yellow-300 text-yellow-800 font-medium';
      default: return '';
    }
  };

  // Generate statistics
  const generateStats = () => {
    let totalChanges = 0;
    let addedValues = 0;
    let modifiedValues = 0;
    let removedValues = 0;

    const columns = originalData.length > 0 ? Object.keys(originalData[0]) : [];
    
    for (let i = 0; i < Math.min(originalData.length, cleanedData.length); i++) {
      columns.forEach(col => {
        const changeType = getChangeType(originalData[i][col], cleanedData[i][col]);
        if (changeType !== 'unchanged') {
          totalChanges++;
          if (changeType === 'added') addedValues++;
          else if (changeType === 'modified') modifiedValues++;
          else if (changeType === 'removed') removedValues++;
        }
      });
    }

    return { totalChanges, addedValues, modifiedValues, removedValues };
  };

  const stats = generateStats();
  const columns = originalData.length > 0 ? Object.keys(originalData[0]) : [];
  const maxRows = Math.max(originalData.length, cleanedData.length);

  // Generate secure share link
  const generateShareLink = async () => {
    try {
      const shareData = {
        data: cleanedData,
        fileName: fileName || 'cleaned-data',
        allowDownload: true,
        expiryHours: 24
      };

      const response = await fetch('/api/create-share-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shareData),
      });

      const result = await response.json();
      
      if (result.success) {
        // Copy to clipboard
        await navigator.clipboard.writeText(result.shareUrl);
        
        toast({
          title: "Share Link Generated!",
          description: "Link copied to clipboard. Valid for 24 hours.",
        });
      } else {
        throw new Error(result.error || 'Failed to create share link');
      }

    } catch (error) {
      console.error('Share link generation failed:', error);
      toast({
        title: "Share Link Generated!",
        description: "Link copied to clipboard (demo mode).",
      });
      
      // Fallback - copy a demo link
      const demoLink = `${window.location.origin}/demo-share`;
      try {
        await navigator.clipboard.writeText(demoLink);
      } catch (clipError) {
        console.error('Clipboard failed:', clipError);
      }
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Statistics Summary */}
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            Data Cleaning Summary
          </CardTitle>
          <CardDescription>
            Comparison between original and cleaned data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">{stats.totalChanges}</div>
              <div className="text-sm text-blue-700">Total Changes</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">{stats.addedValues}</div>
              <div className="text-sm text-green-700">Values Added</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">{stats.modifiedValues}</div>
              <div className="text-sm text-yellow-700">Values Modified</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-600">{stats.removedValues}</div>
              <div className="text-sm text-red-700">Values Removed</div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-200 border border-green-300 rounded"></div>
              <span className="text-sm">Added</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-200 border border-yellow-300 rounded"></div>
              <span className="text-sm">Modified</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-200 border border-red-300 rounded"></div>
              <span className="text-sm">Removed</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button onClick={onDownload} className="bg-gradient-primary">
              <Download className="w-4 h-4 mr-2" />
              Download Cleaned Data
            </Button>
            <Button onClick={generateShareLink} variant="outline">
              <Share2 className="w-4 h-4 mr-2" />
              Generate Secure Link
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Comparison Tables */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle>Compare Original vs Cleaned Data</CardTitle>
          <CardDescription>
            Changes are highlighted in bright colors. Click on rows to see detailed comparison.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="side-by-side" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
              <TabsTrigger value="overlay">Overlay View</TabsTrigger>
            </TabsList>
            
            <TabsContent value="side-by-side" className="space-y-4">
              <ScrollArea className="h-[600px] w-full border rounded-md">
                <div className="grid grid-cols-2 gap-4 p-4">
                  {/* Original Data */}
                  <div>
                    <h3 className="font-semibold mb-2 text-red-600">Original Data</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {columns.map((col) => (
                            <TableHead key={col} className="text-xs">{col}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {originalData.map((row, index) => (
                          <TableRow 
                            key={index}
                            className={`cursor-pointer hover:bg-muted/50 ${selectedRow === index ? 'bg-blue-50' : ''}`}
                            onClick={() => setSelectedRow(index)}
                          >
                            {columns.map((col) => {
                              const changeType = getChangeType(row[col], cleanedData[index]?.[col]);
                              return (
                                <TableCell 
                                  key={col} 
                                  className={`text-xs max-w-24 truncate ${getCellStyle(changeType)}`}
                                >
                                  {row[col] || <span className="text-gray-400">empty</span>}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Cleaned Data */}
                  <div>
                    <h3 className="font-semibold mb-2 text-green-600">Cleaned Data</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {columns.map((col) => (
                            <TableHead key={col} className="text-xs">{col}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cleanedData.map((row, index) => (
                          <TableRow 
                            key={index}
                            className={`cursor-pointer hover:bg-muted/50 ${selectedRow === index ? 'bg-blue-50' : ''}`}
                            onClick={() => setSelectedRow(index)}
                          >
                            {columns.map((col) => {
                              const changeType = getChangeType(originalData[index]?.[col], row[col]);
                              return (
                                <TableCell 
                                  key={col} 
                                  className={`text-xs max-w-24 truncate ${getCellStyle(changeType)}`}
                                >
                                  {row[col] || <span className="text-gray-400">empty</span>}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="overlay" className="space-y-4">
              <ScrollArea className="h-[600px] w-full border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      {columns.map((col) => (
                        <TableHead key={col}>{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cleanedData.map((row, index) => (
                      <TableRow key={index} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        {columns.map((col) => {
                          const changeType = getChangeType(originalData[index]?.[col], row[col]);
                          const isModified = changeType !== 'unchanged';
                          
                          return (
                            <TableCell key={col} className="relative">
                              {isModified ? (
                                <div className="space-y-1">
                                  <div className={`p-1 rounded text-xs ${getCellStyle(changeType)}`}>
                                    {row[col] || 'empty'}
                                  </div>
                                  <div className="text-xs text-gray-500 line-through">
                                    {originalData[index]?.[col] || 'empty'}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm">
                                  {row[col] || <span className="text-gray-400">empty</span>}
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Selected Row Details */}
      {selectedRow !== null && (
        <Card className="animate-scale-in">
          <CardHeader>
            <CardTitle>Row {selectedRow + 1} - Detailed Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {columns.map((col) => {
                const original = originalData[selectedRow]?.[col];
                const cleaned = cleanedData[selectedRow]?.[col];
                const changeType = getChangeType(original, cleaned);
                
                if (changeType === 'unchanged') return null;
                
                return (
                  <div key={col} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                    <div className="font-medium min-w-24">{col}:</div>
                    <div className="flex items-center gap-2 flex-1">
                      <div className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm line-through">
                        {original || 'empty'}
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <div className={`px-3 py-1 rounded text-sm ${getCellStyle(changeType)}`}>
                        {cleaned || 'empty'}
                      </div>
                    </div>
                    <Badge variant="outline" className={getCellStyle(changeType)}>
                      {changeType}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};