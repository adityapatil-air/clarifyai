import { useState } from "react";
import { Send, Download, Database, MessageSquare, ToggleLeft, ToggleRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface SQLChatBotProps {
  rawData: any[];
  processedData: any[];
  onDownloadQueryResult: (data: any[], queryText: string) => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  message: string;
  query?: string;
  results?: any[];
  dataSource?: 'raw' | 'processed';
  timestamp: Date;
}

export const SQLChatBot = ({ rawData, processedData, onDownloadQueryResult }: SQLChatBotProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [useProcessedData, setUseProcessedData] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const currentData = useProcessedData ? processedData : rawData;

  // Convert natural language to SQL using Gemini AI
  const processNaturalLanguage = async (userInput: string): Promise<{ query: string; results: any[] }> => {
    if (!currentData.length) {
      return { query: "-- No data available", results: [] };
    }

    const columns = Object.keys(currentData[0]);
    const sampleData = currentData.slice(0, 3); // Show AI a few sample rows
    
    try {
      // Call Gemini API to convert natural language to SQL logic
      const response = await fetch('/api/gemini-sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userQuery: userInput,
          columns: columns,
          sampleData: sampleData,
          totalRows: currentData.length
        }),
      });

      if (!response.ok) {
        throw new Error('Gemini API failed');
      }

      const aiResponse = await response.json();
      const { filterLogic, sqlQuery } = aiResponse;

      // Execute the filter logic on actual data
      let results: any[] = [];
      
      if (filterLogic === 'ALL') {
        results = currentData;
      } else if (filterLogic.type === 'FILTER') {
        results = currentData.filter(row => {
          return evaluateFilter(row, filterLogic.conditions);
        });
      } else if (filterLogic.type === 'COUNT') {
        const count = filterLogic.conditions ? 
          currentData.filter(row => evaluateFilter(row, filterLogic.conditions)).length :
          currentData.length;
        results = [{ count }];
      } else if (filterLogic.type === 'GROUP') {
        const grouped = currentData.reduce((acc, row) => {
          const key = row[filterLogic.column] || 'NULL';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        results = Object.entries(grouped).map(([key, count]) => ({
          [filterLogic.column]: key,
          count
        }));
      }
      
      // Handle LIMIT after filtering
      if (filterLogic.conditions?.type === 'LIMIT') {
        results = results.slice(0, parseInt(filterLogic.conditions.value));
      }

      return { query: sqlQuery, results };
      
    } catch (error) {
      console.error('AI processing failed, using fallback:', error);
      // Fallback to simple logic
      return fallbackProcessing(userInput, columns);
    }
  };

  // Helper function to evaluate filter conditions
  const evaluateFilter = (row: any, conditions: any): boolean => {
    if (!conditions) return true;
    
    const { column, operator, value, type } = conditions;
    const rowValue = row[column];
    
    if (type === 'NULL_CHECK') {
      return !rowValue || rowValue === '';
    }
    
    if (type === 'STRING_CONTAINS') {
      return rowValue && rowValue.toLowerCase().includes(value.toLowerCase());
    }
    
    if (type === 'NUMERIC') {
      const numValue = parseFloat(rowValue);
      const targetValue = parseFloat(value);
      if (isNaN(numValue) || isNaN(targetValue)) return false;
      
      switch (operator) {
        case '>': return numValue > targetValue;
        case '<': return numValue < targetValue;
        case '=': return numValue === targetValue;
        case '>=': return numValue >= targetValue;
        case '<=': return numValue <= targetValue;
        default: return false;
      }
    }
    
    if (type === 'SEARCH') {
      return Object.values(row).some(val => 
        val && val.toString().toLowerCase().includes(value.toLowerCase())
      );
    }
    
    if (type === 'LIMIT') {
      return true; // Handle in main logic
    }
    
    return false;
  };

  // Fallback processing for when AI fails
  const fallbackProcessing = (userInput: string, columns: string[]): { query: string; results: any[] } => {
    const input = userInput.toLowerCase();
    
    if (input.includes("show all") || input.includes("all data")) {
      return { query: `SELECT * FROM data`, results: currentData };
    }
    
    if (input.includes("count")) {
      return { query: `SELECT COUNT(*) as count FROM data`, results: [{ count: currentData.length }] };
    }
    
    // Default: show first 10 rows
    return { query: `SELECT * FROM data LIMIT 10`, results: currentData.slice(0, 10) };
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      message: inputMessage,
      dataSource: useProcessedData ? 'processed' : 'raw',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // Process the query with AI
      const { query, results } = await processNaturalLanguage(inputMessage);

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        message: `Found ${results.length} results`,
        query,
        results,
        dataSource: useProcessedData ? 'processed' : 'raw',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        message: 'Sorry, I encountered an error processing your query. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsProcessing(false);
    setInputMessage("");
  };

  const handleDownloadResult = (message: ChatMessage) => {
    if (message.results && message.results.length > 0) {
      onDownloadQueryResult(message.results, message.message);
      toast({
        title: "Download started!",
        description: `Downloading ${message.results.length} records from your query.`,
      });
    }
  };

  const convertToCSV = (data: any[]) => {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return '"' + stringValue.replace(/"/g, '""') + '"';
          }
          return stringValue;
        }).join(',')
      )
    ];
    
    return csvRows.join('\n');
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            SQL Chat Bot
          </CardTitle>
          <CardDescription>
            Ask questions about your data in natural language. No SQL knowledge required!
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Data Source Toggle */}
          <div className="flex items-center justify-between mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-primary" />
              <span className="font-medium">Query Data Source:</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={!useProcessedData ? "default" : "secondary"}>
                Raw Data ({rawData.length} records)
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUseProcessedData(!useProcessedData)}
                className="p-1"
              >
                {useProcessedData ? (
                  <ToggleRight className="w-6 h-6 text-primary" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                )}
              </Button>
              <Badge variant={useProcessedData ? "default" : "secondary"}>
                Processed Data ({processedData.length} records)
              </Badge>
            </div>
          </div>

          {/* Chat Messages */}
          <ScrollArea className="h-96 mb-4 border rounded-lg p-4">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Start asking questions about your data!</p>
                  <div className="text-sm space-y-1">
                    <p>• "Show all records from New York"</p>
                    <p>• "Count missing emails"</p>
                    <p>• "Find duplicates in phone column"</p>
                    <p>• "Show users older than 25"</p>
                  </div>
                </div>
              )}
              
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    message.type === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">
                        {message.type === 'user' ? 'You' : 'SQL Bot'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {message.dataSource === 'processed' ? 'Processed' : 'Raw'} Data
                      </Badge>
                    </div>
                    <p className="mb-2">{message.message}</p>
                    
                    {message.query && (
                      <div className="bg-black/10 rounded p-2 mb-2 font-mono text-xs">
                        {message.query}
                      </div>
                    )}
                    
                    {message.results && message.results.length > 0 && (
                      <div className="space-y-2">
                        <div className="max-h-40 overflow-auto border rounded">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {Object.keys(message.results[0]).map((header) => (
                                  <TableHead key={header} className="text-xs">{header}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {message.results.slice(0, 5).map((row, index) => (
                                <TableRow key={index}>
                                  {Object.values(row).map((value: any, cellIndex) => (
                                    <TableCell key={cellIndex} className="text-xs max-w-20 truncate">
                                      {value || <span className="text-muted-foreground italic">null</span>}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        {message.results.length > 5 && (
                          <p className="text-xs text-muted-foreground">
                            Showing 5 of {message.results.length} results
                          </p>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadResult(message)}
                          className="w-full"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Results ({message.results.length} records)
                        </Button>
                      </div>
                    )}
                    
                    {message.results && message.results.length === 0 && (
                      <p className="text-sm text-muted-foreground">No results found</p>
                    )}
                  </div>
                </div>
              ))}
              
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      <span className="ml-2 text-sm">Processing query...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask anything about your data... (e.g., 'Show users from NYC')"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isProcessing}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={isProcessing || !inputMessage.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};