import { useState } from "react";
import { Share2, Copy, Clock, Download, Eye, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface ShareableLinkProps {
  data: any[];
  fileName: string;
}

export const ShareableLink = ({ data, fileName }: ShareableLinkProps) => {
  const [shareLink, setShareLink] = useState("");
  const [allowDownload, setAllowDownload] = useState(true);
  const [expiryHours, setExpiryHours] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateShareLink = async () => {
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/create-share-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data,
          fileName,
          allowDownload,
          expiryHours
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Use current domain (works after hosting)
        const baseUrl = window.location.origin;
        const fullLink = `${baseUrl}/share/${result.shareId}`;
        setShareLink(fullLink);
        
        toast({
          title: "Share link created!",
          description: `Link expires in ${expiryHours} hour(s)`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Failed to create share link",
        description: "Please try again",
        variant: "destructive"
      });
    }
    
    setIsGenerating(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    toast({
      title: "Link copied!",
      description: "Share link has been copied to clipboard",
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="w-5 h-5 text-primary" />
          Create Shareable Link
        </CardTitle>
        <CardDescription>
          Generate a secure, time-bound link to share your data with privacy protection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Privacy Notice */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium text-blue-900">Privacy Protected</div>
            <div className="text-blue-700">
              Links are encrypted, time-limited, and automatically deleted after expiry
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium">Allow Download</div>
              <div className="text-sm text-muted-foreground">
                Recipients can download the data file
              </div>
            </div>
            <Switch
              checked={allowDownload}
              onCheckedChange={setAllowDownload}
            />
          </div>

          <div className="space-y-2">
            <div className="font-medium">Link Expiry</div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <select
                value={expiryHours}
                onChange={(e) => setExpiryHours(Number(e.target.value))}
                className="border rounded px-3 py-1 text-sm"
              >
                <option value={1}>1 hour</option>
                <option value={2}>2 hours</option>
                <option value={6}>6 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
              </select>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={generateShareLink}
          disabled={isGenerating}
          className="w-full bg-gradient-primary hover:shadow-elegant transition-all duration-300"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Generating Link...
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 mr-2" />
              Generate Secure Link
            </>
          )}
        </Button>

        {/* Generated Link */}
        {shareLink && (
          <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="font-medium text-green-900">Share Link Generated</div>
              <Badge variant="outline" className="text-green-700 border-green-300">
                Expires in {expiryHours}h
              </Badge>
            </div>
            
            <div className="flex gap-2">
              <Input
                value={shareLink}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                onClick={copyToClipboard}
                variant="outline"
                size="sm"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-4 text-sm text-green-700">
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                View Only
              </div>
              {allowDownload && (
                <div className="flex items-center gap-1">
                  <Download className="w-4 h-4" />
                  Download Enabled
                </div>
              )}
            </div>
          </div>
        )}

        {/* File Info */}
        <div className="text-center text-sm text-muted-foreground">
          Sharing: <span className="font-medium">{fileName}</span> ({data.length} records)
        </div>
      </CardContent>
    </Card>
  );
};