import { useState } from "react";
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { HeroSection } from "@/components/HeroSection";
import { FileUpload } from "@/components/FileUpload";
import { DataPreview } from "@/components/DataPreview";
import { ErrorResolution } from "@/components/ErrorResolution";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, LogIn, Sparkles, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type AppStep = 'hero' | 'upload' | 'preview' | 'resolve' | 'download';

const Index = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>('hero');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [originalData, setOriginalData] = useState<any[]>([]);
  const [cleanedData, setCleanedData] = useState<any[]>([]);
  const [processingReport, setProcessingReport] = useState<any>(null);
  const { user } = useUser();
  const { toast } = useToast();

  const handleFileUpload = (file: File, data: any[]) => {
    setUploadedFile(file);
    setOriginalData(data);
    setCurrentStep('preview');
    
    toast({
      title: "File uploaded successfully!",
      description: `Loaded ${data.length} records from ${file.name}`,
    });
  };

  const handleResolveErrors = () => {
    setCurrentStep('resolve');
  };

  const handleResolutionComplete = (cleanData: any[], report?: any) => {
    console.log('Resolution complete callback called with:', cleanData?.length, 'records');
    setCleanedData(cleanData || originalData);
    setProcessingReport(report);
    setCurrentStep('download');
    
    toast({
      title: "Data cleaning completed!",
      description: "Your data has been successfully cleaned and is ready for download.",
    });
  };

  const handleDownload = () => {
    if (!uploadedFile || !cleanedData.length) return;
    
    const dataToDownload = cleanedData.length > 0 ? cleanedData : originalData;
    const csvContent = convertToCSV(dataToDownload);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cleaned_${uploadedFile.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Download started!",
      description: "Your cleaned data file is being downloaded.",
    });
  };

  const convertToCSV = (data: any[]) => {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          // Properly escape CSV values
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

  const resetApp = () => {
    setCurrentStep('hero');
    setUploadedFile(null);
    setOriginalData([]);
    setCleanedData([]);
    setProcessingReport(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold">DataClean AI</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="outline" className="hover:shadow-elegant transition-all duration-300">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Welcome, {user?.firstName || 'User'}!
                </span>
                <UserButton 
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8"
                    }
                  }}
                />
              </div>
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <SignedOut>
          <div className="text-center py-20">
            <HeroSection />
            <div className="mt-12">
              <Card className="max-w-md mx-auto border-2 border-dashed border-primary/30 bg-gradient-hero">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl mb-2">Ready to Get Started?</CardTitle>
                  <CardDescription className="text-base">
                    Sign in to upload your data and experience the power of AI-driven data cleaning
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <SignInButton mode="modal">
                    <Button 
                      size="lg" 
                      className="bg-gradient-primary hover:shadow-elegant transition-all duration-300 hover:scale-105"
                    >
                      <LogIn className="w-5 h-5 mr-2" />
                      Sign In to Continue
                    </Button>
                  </SignInButton>
                </CardContent>
              </Card>
            </div>
          </div>
        </SignedOut>

        <SignedIn>
          <div className="space-y-8">
            {/* Progress Indicator */}
            {currentStep !== 'hero' && (
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="flex items-center gap-2">
                  {['upload', 'preview', 'resolve', 'download'].map((step, index) => (
                    <div key={step} className="flex items-center gap-2">
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                          ['upload', 'preview', 'resolve', 'download'].indexOf(currentStep) >= index
                            ? 'bg-primary text-primary-foreground shadow-glow' 
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {index + 1}
                      </div>
                      {index < 3 && (
                        <div className={`w-8 h-1 rounded-full transition-all duration-300 ${
                          ['upload', 'preview', 'resolve', 'download'].indexOf(currentStep) > index
                            ? 'bg-primary' 
                            : 'bg-muted'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
                <Button variant="outline" onClick={resetApp} size="sm">
                  Start Over
                </Button>
              </div>
            )}

            {/* Step Content */}
            {currentStep === 'hero' && (
              <div className="space-y-8">
                <HeroSection />
                <div className="text-center">
                  <Button 
                    onClick={() => setCurrentStep('upload')}
                    size="lg"
                    className="bg-gradient-primary hover:shadow-elegant transition-all duration-300 hover:scale-105"
                  >
                    Get Started
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 'upload' && (
              <div className="space-y-8 animate-fade-in">
                <div className="text-center">
                  <h2 className="text-3xl font-bold mb-4">Upload Your Data</h2>
                  <p className="text-muted-foreground text-lg">
                    Upload your CSV, JSON, or TXT file to begin the cleaning process
                  </p>
                </div>
                <FileUpload onFileUpload={handleFileUpload} />
              </div>
            )}

            {currentStep === 'preview' && uploadedFile && (
              <div className="space-y-8 animate-fade-in">
                <div className="text-center">
                  <h2 className="text-3xl font-bold mb-4">Data Preview</h2>
                  <p className="text-muted-foreground text-lg">
                    Review your data and identified issues before cleaning
                  </p>
                </div>
                <DataPreview
                  file={uploadedFile}
                  data={originalData}
                  onResolveErrors={handleResolveErrors}
                  onDownload={handleDownload}
                />
              </div>
            )}

            {currentStep === 'resolve' && (
              <div className="space-y-8 animate-fade-in">
                <div className="text-center">
                  <h2 className="text-3xl font-bold mb-4">AI Resolution in Progress</h2>
                  <p className="text-muted-foreground text-lg">
                    Our AI is cleaning and enhancing your data
                  </p>
                </div>
                <ErrorResolution
                  originalData={originalData}
                  onComplete={handleResolutionComplete}
                />
              </div>
            )}

            {currentStep === 'download' && (
              <div className="space-y-8 animate-fade-in">
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 mx-auto bg-gradient-success rounded-full flex items-center justify-center animate-bounce-gentle">
                    <Download className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-success">Data Cleaning Complete!</h2>
                  <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                    Your data has been successfully cleaned and enhanced. Download your improved dataset below.
                  </p>
                </div>

                {/* Processing Report */}
                {processingReport && (
                  <Card className="max-w-4xl mx-auto">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-success" />
                        Validation & Augmentation Report
                      </CardTitle>
                      <CardDescription>
                        Summary of improvements made to your data
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg">Data Quality Improvements</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between p-2 bg-muted/50 rounded">
                              <span>Original Records:</span>
                              <span className="font-medium">{originalData.length}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-muted/50 rounded">
                              <span>Cleaned Records:</span>
                              <span className="font-medium text-success">{cleanedData.length}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-muted/50 rounded">
                              <span>Missing Values Fixed:</span>
                              <span className="font-medium text-primary">{processingReport.missingFixed || 0}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-muted/50 rounded">
                              <span>Duplicates Removed:</span>
                              <span className="font-medium text-warning">{processingReport.duplicatesRemoved || 0}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-muted/50 rounded">
                              <span>Format Issues Fixed:</span>
                              <span className="font-medium text-info">{processingReport.formatFixed || 0}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg">Processing Details</h4>
                          <div className="space-y-2">
                            {processingReport.changes && processingReport.changes.map((change: any, index: number) => (
                              <div key={index} className="p-2 bg-muted/30 rounded text-sm">
                                <div className="font-medium">Row {change.row}, Column "{change.column}"</div>
                                <div className="text-muted-foreground">
                                  {change.type}: {change.description}
                                </div>
                                {change.before && change.after && (
                                  <div className="text-xs mt-1">
                                    <span className="text-destructive">Before: "{change.before}"</span>
                                    <span className="mx-2">→</span>
                                    <span className="text-success">After: "{change.after}"</span>
                                  </div>
                                )}
                              </div>
                            ))}
                            {(!processingReport.changes || processingReport.changes.length === 0) && (
                              <div className="text-center text-muted-foreground py-4">
                                No specific changes to report - data was already in good quality!
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                  
                <div className="flex items-center justify-center gap-4">
                  <Button 
                    onClick={handleDownload}
                    size="lg"
                    className="bg-gradient-success hover:shadow-elegant transition-all duration-300 hover:scale-105"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download Clean Data
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={resetApp}
                    size="lg"
                  >
                    Process Another File
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SignedIn>
      </main>
      
      {/* Debug info */}
      <div className="fixed bottom-4 right-4 bg-black text-white p-2 rounded text-xs z-50">
        Step: {currentStep} | Original: {originalData.length} | Clean: {cleanedData.length}
      </div>
    </div>
  );
};

export default Index;