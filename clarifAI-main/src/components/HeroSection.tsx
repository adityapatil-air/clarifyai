import { Brain, Shield, Zap, Database, CheckCircle, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Cleaning",
    description: "Advanced algorithms detect and fix data inconsistencies automatically",
    color: "text-primary"
  },
  {
    icon: Shield,
    title: "Privacy Protection",
    description: "Your data stays secure with enterprise-grade privacy measures",
    color: "text-accent"
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Process thousands of records in seconds with optimized performance",
    color: "text-warning"
  },
  {
    icon: Database,
    title: "Smart Augmentation",
    description: "Generate synthetic samples and fill missing values intelligently",
    color: "text-info"
  },
  {
    icon: CheckCircle,
    title: "Quality Assurance",
    description: "Comprehensive validation ensures cleaned data meets standards",
    color: "text-success"
  },
  {
    icon: BarChart3,
    title: "Detailed Reports",
    description: "Get insights on what was changed and why for full transparency",
    color: "text-destructive"
  }
];

export const HeroSection = () => {
  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Hero Content */}
      <div className="container mx-auto px-4 pt-20 pb-16">
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            AI-Powered Data Cleaning
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Transform messy data into pristine datasets with our automated cleaning and augmentation pipeline
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success rounded-full animate-bounce-gentle"></div>
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce-gentle" style={{ animationDelay: '0.2s' }}></div>
              <span>Fast</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-accent rounded-full animate-bounce-gentle" style={{ animationDelay: '0.4s' }}></div>
              <span>Intelligent</span>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={feature.title}
                className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 animate-slide-up border-2 hover:border-primary/20"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader className="text-center">
                  <div className={`w-16 h-16 mx-auto mb-4 ${feature.color} group-hover:animate-pulse-glow transition-all duration-300`}>
                    <Icon className="w-full h-full" />
                  </div>
                  <CardTitle className="text-xl font-semibold group-hover:text-primary transition-colors">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="text-center animate-scale-in">
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 max-w-2xl mx-auto shadow-elegant">
            <h3 className="text-2xl font-semibold mb-4 text-foreground">
              Ready to clean your data?
            </h3>
            <p className="text-muted-foreground mb-6">
              Join thousands of data professionals who trust our AI to enhance their datasets
            </p>
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span>No setup required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span>Instant results</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span>100% secure</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};