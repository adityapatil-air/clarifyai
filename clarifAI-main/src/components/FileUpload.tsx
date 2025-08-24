import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File, X, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import * as XLSX from 'xlsx';

interface FileUploadProps {
  onFileUpload: (file: File, data: any[]) => void;
}

export const FileUpload = ({ onFileUpload }: FileUploadProps) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setUploadProgress(0);
    
    // Simulate file processing with progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      let data: any[] = [];
      
      if (file.name.endsWith('.csv')) {
        // CSV parsing
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });
      } else if (file.name.endsWith('.json')) {
        // JSON parsing
        const text = await file.text();
        data = JSON.parse(text);
      } else if (file.name.endsWith('.txt')) {
        // TXT parsing - treat as simple text data
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        data = lines.map((line, index) => ({
          id: index + 1,
          text: line.trim()
        }));
      } else if (file.name.match(/\.(xlsx|xls)$/i)) {
        // Excel parsing
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with headers
        data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Convert array format to object format with headers
        if (data.length > 0) {
          const headers = data[0] as string[];
          data = data.slice(1).map((row: any, index) => {
            const obj: any = {};
            headers.forEach((header, colIndex) => {
              obj[header] = row[colIndex] || '';
            });
            return obj;
          });
        }
      }

      setUploadProgress(100);
      setUploadStatus('success');
      setTimeout(() => {
        onFileUpload(file, data);
        setIsProcessing(false);
      }, 500);
      
    } catch (error) {
      console.error('File processing error:', error);
      setUploadStatus('error');
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      setUploadStatus('idle');
      processFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const removeFile = () => {
    setUploadedFile(null);
    setUploadStatus('idle');
    setUploadProgress(0);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-colors">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Upload className="w-6 h-6 text-primary" />
            Upload Your Data
          </CardTitle>
          <CardDescription>
            Support for Excel, CSV, JSON, and TXT files up to 10MB
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!uploadedFile ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300 ${
                isDragActive 
                  ? 'border-primary bg-primary/5 scale-105' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="space-y-4">
                <div className={`w-20 h-20 mx-auto rounded-full bg-gradient-primary/10 flex items-center justify-center ${isDragActive ? 'animate-bounce-gentle' : ''}`}>
                  <Upload className={`w-10 h-10 text-primary ${isDragActive ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                  <p className="text-lg font-medium mb-2">
                    {isDragActive ? 'Drop your file here!' : 'Drag & drop your data file'}
                  </p>
                  <p className="text-muted-foreground">
                    or <span className="text-primary font-medium">click to browse</span>
                  </p>
                </div>
                <div className="flex justify-center gap-2 flex-wrap">
                  <Badge variant="secondary">Excel</Badge>
                  <Badge variant="secondary">CSV</Badge>
                  <Badge variant="secondary">JSON</Badge>
                  <Badge variant="secondary">TXT</Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <File className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{uploadedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(uploadedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {uploadStatus === 'success' && (
                    <CheckCircle className="w-5 h-5 text-success" />
                  )}
                  {uploadStatus === 'error' && (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    disabled={isProcessing}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing file...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}

              {uploadStatus === 'success' && (
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">File processed successfully!</span>
                </div>
              )}

              {uploadStatus === 'error' && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Error processing file. Please try again.</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};