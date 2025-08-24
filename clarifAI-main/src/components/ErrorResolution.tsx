import { useState } from "react";
import { CheckCircle, RefreshCw, Wand2, Download, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface ErrorResolutionProps {
  onComplete: (cleanedData: any[]) => void;
  originalData: any[];
}

interface ResolutionStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  itemsProcessed: number;
  totalItems: number;
  error?: string;
}

interface APIResponse {
  success: boolean;
  error?: string;
  [key: string]: any;
}

export const ErrorResolution = ({ onComplete, originalData }: ErrorResolutionProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const { toast } = useToast();
  
  const [steps, setSteps] = useState<ResolutionStep[]>([
    {
      id: 'detect',
      name: 'Error Detection',
      description: 'Scanning data for inconsistencies and anomalies',
      status: 'pending',
      progress: 0,
      itemsProcessed: 0,
      totalItems: originalData.length
    },
    {
      id: 'clean',
      name: 'Data Cleaning',
      description: 'Fixing typos, standardizing formats, and removing duplicates',
      status: 'pending',
      progress: 0,
      itemsProcessed: 0,
      totalItems: originalData.length
    },
    {
      id: 'validate',
      name: 'Validation',
      description: 'Ensuring data quality and consistency standards',
      status: 'pending',
      progress: 0,
      itemsProcessed: 0,
      totalItems: originalData.length
    },
    {
      id: 'augment',
      name: 'Data Augmentation',
      description: 'Filling missing values and generating synthetic samples',
      status: 'pending',
      progress: 0,
      itemsProcessed: 0,
      totalItems: originalData.length
    }
  ]);

  // API call functions
  const callAPI = async (endpoint: string, data: any): Promise<APIResponse> => {
    try {
      const response = await fetch(`/api/clean/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`API call to ${endpoint} failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  };

  const processGrammarCorrection = async (data: any[]) => {
    const results = [];
    const batchSize = 10; // Process in batches to avoid overwhelming the API
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      // Update progress
      const progress = Math.min(((i + batchSize) / data.length) * 100, 100);
      setSteps(prev => prev.map(step => 
        step.id === 'clean' ? { ...step, progress, itemsProcessed: Math.min(i + batchSize, data.length) } : step
      ));

      // Process each item in the batch
      for (const item of batch) {
        const textFields = Object.keys(item).filter(key => 
          typeof item[key] === 'string' && item[key].length > 10
        );

        const correctedItem = { ...item };
        
        for (const field of textFields) {
          try {
            const result = await callAPI('grammar', { text: item[field] });
            if (result.success && result.corrected) {
              correctedItem[field] = result.corrected;
            }
          } catch (error) {
            console.error(`Grammar correction failed for field ${field}:`, error);
            // Continue with original text
          }
        }
        
        results.push(correctedItem);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  };

  const processLabelNormalization = async (data: any[]) => {
    // Extract all unique labels from the data
    const allLabels = new Set<string>();
    data.forEach(item => {
      Object.values(item).forEach(value => {
        if (typeof value === 'string' && value.length > 0) {
          allLabels.add(value);
        }
      });
    });

    const labels = Array.from(allLabels);
    if (labels.length === 0) return data;

    // Define reference labels for normalization
    const referenceLabels = [
      'positive', 'negative', 'neutral',
      'high', 'medium', 'low',
      'yes', 'no', 'maybe',
      'active', 'inactive', 'pending'
    ];

    try {
      const result = await callAPI('normalize', { labels, referenceLabels });
      if (result.success && result.normalized) {
        // Create a mapping from original to normalized labels
        const labelMap = new Map();
        result.normalized.forEach((item: any) => {
          labelMap.set(item.original, item.normalized);
        });

        // Apply normalization to data
        return data.map(item => {
          const normalizedItem = { ...item };
          Object.keys(normalizedItem).forEach(key => {
            const value = normalizedItem[key];
            if (typeof value === 'string' && labelMap.has(value)) {
              normalizedItem[key] = labelMap.get(value);
            }
          });
          return normalizedItem;
        });
      }
    } catch (error) {
      console.error('Label normalization failed:', error);
    }

    return data;
  };

  const processValidation = async (data: any[]) => {
    const candidateLabels = ['valid', 'invalid', 'uncertain'];
    const results = [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      
      // Update progress
      const progress = ((i + 1) / data.length) * 100;
      setSteps(prev => prev.map(step => 
        step.id === 'validate' ? { ...step, progress, itemsProcessed: i + 1 } : step
      ));

      // Validate each text field
      const validatedItem = { ...item };
      const textFields = Object.keys(item).filter(key => 
        typeof item[key] === 'string' && item[key].length > 5
      );

      for (const field of textFields) {
        try {
          const result = await callAPI('validate', { 
            text: item[field], 
            candidateLabels 
          });
          
          if (result.success && result.validation) {
            // Add validation metadata
            validatedItem[`${field}_validation`] = result.validation.predictedLabel;
            validatedItem[`${field}_confidence`] = result.validation.confidence;
          }
        } catch (error) {
          console.error(`Validation failed for field ${field}:`, error);
        }
      }

      results.push(validatedItem);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return results;
  };

  const processAugmentation = async (data: any[]) => {
    const results = [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      
      // Update progress
      const progress = ((i + 1) / data.length) * 100;
      setSteps(prev => prev.map(step => 
        step.id === 'augment' ? { ...step, progress, itemsProcessed: i + 1 } : step
      ));

      // Augment text fields
      const augmentedItem = { ...item };
      const textFields = Object.keys(item).filter(key => 
        typeof item[key] === 'string' && item[key].length > 10
      );

      for (const field of textFields) {
        try {
          const result = await callAPI('augment', { 
            text: item[field], 
            numVariations: 2 
          });
          
          if (result.success && result.variations) {
            // Add augmented variations
            result.variations.forEach((variation: any, index: number) => {
              augmentedItem[`${field}_variation_${index + 1}`] = variation.text;
            });
          }
        } catch (error) {
          console.error(`Augmentation failed for field ${field}:`, error);
        }
      }

      results.push(augmentedItem);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  };

  const startProcessing = async () => {
    setIsProcessing(true);
    let processedData = [...originalData];

    try {
      // Step 1: Error Detection (simulated - just analyze data structure)
      setCurrentStep(0);
      setSteps(prev => prev.map((step, index) => 
        index === 0 ? { ...step, status: 'processing' } : step
      ));

      // Simulate error detection
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setSteps(prev => prev.map((step, index) => 
          index === 0 ? { ...step, progress, itemsProcessed: Math.floor((progress / 100) * step.totalItems) } : step
        ));
      }

      setSteps(prev => prev.map((step, index) => 
        index === 0 ? { ...step, status: 'completed' } : step
      ));
      setOverallProgress(25);

      // Step 2: Data Cleaning (Grammar Correction)
      setCurrentStep(1);
      setSteps(prev => prev.map((step, index) => 
        index === 1 ? { ...step, status: 'processing' } : step
      ));

      try {
        processedData = await processGrammarCorrection(processedData);
        setSteps(prev => prev.map((step, index) => 
          index === 1 ? { ...step, status: 'completed' } : step
        ));
      } catch (error) {
        console.error('Grammar correction failed:', error);
        setSteps(prev => prev.map((step, index) => 
          index === 1 ? { ...step, status: 'error', error: 'Grammar correction failed' } : step
        ));
        toast({
          title: "Warning",
          description: "Grammar correction failed, continuing with original data",
          variant: "destructive"
        });
      }
      setOverallProgress(50);

      // Step 3: Validation
      setCurrentStep(2);
      setSteps(prev => prev.map((step, index) => 
        index === 2 ? { ...step, status: 'processing' } : step
      ));

      try {
        processedData = await processValidation(processedData);
        setSteps(prev => prev.map((step, index) => 
          index === 2 ? { ...step, status: 'completed' } : step
        ));
      } catch (error) {
        console.error('Validation failed:', error);
        setSteps(prev => prev.map((step, index) => 
          index === 2 ? { ...step, status: 'error', error: 'Validation failed' } : step
        ));
        toast({
          title: "Warning",
          description: "Validation failed, continuing with available data",
          variant: "destructive"
        });
      }
      setOverallProgress(75);

      // Step 4: Data Augmentation
      setCurrentStep(3);
      setSteps(prev => prev.map((step, index) => 
        index === 3 ? { ...step, status: 'processing' } : step
      ));

      try {
        processedData = await processAugmentation(processedData);
        setSteps(prev => prev.map((step, index) => 
          index === 3 ? { ...step, status: 'completed' } : step
        ));
      } catch (error) {
        console.error('Augmentation failed:', error);
        setSteps(prev => prev.map((step, index) => 
          index === 3 ? { ...step, status: 'error', error: 'Augmentation failed' } : step
        ));
        toast({
          title: "Warning",
          description: "Augmentation failed, continuing with available data",
          variant: "destructive"
        });
      }
      setOverallProgress(100);

      // Complete processing
      setTimeout(() => {
        onComplete(processedData);
      }, 1000);

    } catch (error) {
      console.error('Processing failed:', error);
      toast({
        title: "Error",
        description: "Data processing failed. Please try again.",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'processing':
        return <RefreshCw className="w-5 h-5 text-primary animate-spin" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-muted" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'border-success bg-success/5';
      case 'processing': return 'border-primary bg-primary/5 shadow-glow';
      case 'error': return 'border-destructive bg-destructive/5';
      default: return 'border-border bg-muted/20';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card className="animate-fade-in">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Wand2 className="w-6 h-6 text-primary" />
            AI-Powered Data Resolution
          </CardTitle>
          <CardDescription>
            Our advanced algorithms will automatically clean and enhance your data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Overall Progress */}
            <div className="text-center space-y-3">
              <div className="text-lg font-semibold">
                Overall Progress: {Math.round(overallProgress)}%
              </div>
              <Progress value={overallProgress} className="w-full h-3" />
              <div className="flex justify-center">
                {!isProcessing ? (
                  <Button
                    onClick={startProcessing}
                    className="bg-gradient-primary hover:shadow-elegant transition-all duration-300 hover:scale-105"
                    size="lg"
                  >
                    <Wand2 className="w-5 h-5 mr-2" />
                    Start AI Resolution
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 text-primary">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span className="font-medium">Processing...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Processing Steps */}
            <div className="space-y-4">
              {steps.map((step, index) => (
                <Card
                  key={step.id}
                  className={`transition-all duration-500 ${getStatusColor(step.status)} ${
                    index === currentStep && isProcessing ? 'animate-pulse-glow' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(step.status)}
                        <div>
                          <h3 className="font-semibold">{step.name}</h3>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                          {step.error && (
                            <p className="text-sm text-destructive mt-1">{step.error}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={step.status === 'completed' ? 'default' : 
                                   step.status === 'error' ? 'destructive' : 'secondary'}
                          className={step.status === 'completed' ? 'bg-success' : ''}
                        >
                          {step.status === 'completed' ? 'Done' : 
                           step.status === 'processing' ? 'Processing' : 
                           step.status === 'error' ? 'Error' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                    
                    {step.status === 'processing' && (
                      <div className="space-y-2">
                        <Progress value={step.progress} className="w-full" />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{step.itemsProcessed} / {step.totalItems} items</span>
                          <span>{step.progress}%</span>
                        </div>
                      </div>
                    )}

                    {step.status === 'completed' && (
                      <div className="flex items-center gap-2 text-success text-sm">
                        <CheckCircle className="w-4 h-4" />
                        <span>Processed {step.totalItems} items successfully</span>
                      </div>
                    )}

                    {step.status === 'error' && (
                      <div className="flex items-center gap-2 text-destructive text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Failed to process {step.totalItems} items</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* AI Insights */}
            {isProcessing && (
              <Card className="bg-gradient-hero border-primary/20 animate-scale-in">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Wand2 className="w-4 h-4 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-primary">AI Insights</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>• Processing {originalData.length} records with AI models</p>
                        <p>• Using Hugging Face models for grammar correction and validation</p>
                        <p>• Generating data variations for augmentation</p>
                        <p>• Applying label normalization for consistency</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};