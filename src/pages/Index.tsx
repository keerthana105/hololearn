import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Sparkles, 
  Upload, 
  Box, 
  Download, 
  Zap, 
  Shield, 
  Cpu,
  ArrowRight,
  Play,
  CheckCircle,
  Image,
  Wand2,
  Eye,
  MousePointer
} from "lucide-react";

export default function Index() {
  const [showDemo, setShowDemo] = useState(false);

  const demoSteps = [
    {
      step: 1,
      icon: Upload,
      title: "Upload Your Image",
      description: "Start by uploading any 2D image - medical scans (MRI, CT), anatomical diagrams, biology images, or even regular photographs. Supported formats: JPG, PNG, WebP up to 10MB."
    },
    {
      step: 2,
      icon: Wand2,
      title: "Optional: Remove Background",
      description: "For cleaner 3D results, use our AI-powered background removal. This isolates the main subject and helps the depth estimation focus on what matters."
    },
    {
      step: 3,
      icon: Cpu,
      title: "AI Depth Analysis",
      description: "Our Google Gemini 2.5 Pro AI analyzes your image to create a 128×128 depth grid. It identifies anatomical structures, surface topology, and generates educational feature annotations."
    },
    {
      step: 4,
      icon: Eye,
      title: "Interactive 3D Viewing",
      description: "Explore your generated 3D model in real-time! Rotate, zoom, and pan around the model. Click on glowing hotspots to learn about each identified feature."
    },
    {
      step: 5,
      icon: Download,
      title: "Export Your Model",
      description: "Download your 3D model in OBJ (universal), GLTF (web/AR/VR optimized), or STL (3D printing) format for use in other applications."
    }
  ];
  const features = [
    {
      icon: Upload,
      title: "Upload Any Image",
      description: "Simply upload your 2D image, sketch, or photograph to get started.",
    },
    {
      icon: Cpu,
      title: "AI Processing",
      description: "Our advanced AI analyzes depth, lighting, and geometry from your image.",
    },
    {
      icon: Box,
      title: "3D Generation",
      description: "Watch as your 2D image transforms into an interactive 3D model.",
    },
    {
      icon: Download,
      title: "Export Anywhere",
      description: "Download your model in OBJ, GLTF, or STL format for any use case.",
    },
  ];

  const stats = [
    { value: "10K+", label: "Models Created" },
    { value: "99%", label: "Success Rate" },
    { value: "<30s", label: "Processing Time" },
    { value: "Free", label: "To Start" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-secondary/20 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[150px]" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">AI-Powered 3D Generation</span>
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 animate-slide-up">
              <span className="text-glow">Transform</span>{" "}
              <span className="text-foreground">2D Images</span>
              <br />
              <span className="text-foreground">Into </span>
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                3D Reality
              </span>
            </h1>

            {/* Description */}
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "0.1s" }}>
              Upload any image and watch our AI transform it into a stunning, 
              interactive 3D model. Export in multiple formats for games, 
              VR, printing, and more.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <Link to="/convert">
                <Button variant="hero" size="xl" className="group">
                  Start Converting
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Dialog open={showDemo} onOpenChange={setShowDemo}>
                <DialogTrigger asChild>
                  <Button variant="glass" size="xl" className="gap-2">
                    <Play className="w-5 h-5" />
                    Watch Demo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-display flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-primary" />
                      How HoloLearn Works
                    </DialogTitle>
                  </DialogHeader>
                  <div className="mt-6 space-y-6">
                    {demoSteps.map((step, index) => (
                      <div 
                        key={step.step} 
                        className="flex gap-4 p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                            <step.icon className="w-6 h-6 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              STEP {step.step}
                            </span>
                          </div>
                          <h3 className="font-semibold text-lg mb-1">{step.title}</h3>
                          <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                        </div>
                        {index < demoSteps.length - 1 && (
                          <div className="hidden md:flex items-center">
                            <ArrowRight className="w-5 h-5 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="pt-4 flex justify-center">
                      <Link to="/convert" onClick={() => setShowDemo(false)}>
                        <Button variant="hero" size="lg" className="gap-2">
                          <MousePointer className="w-5 h-5" />
                          Try It Now
                        </Button>
                      </Link>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl md:text-4xl font-display font-bold text-primary mb-1">
                    {stat.value}
                  </div>
                  <div className="text-muted-foreground text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
            <div className="w-1 h-2 bg-primary rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="how-it-works" className="py-24 relative">
        <div className="absolute inset-0 bg-dots opacity-20" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
              How It <span className="text-glow">Works</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Our streamlined process makes 3D creation accessible to everyone
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="card-glass rounded-2xl p-6 gradient-border group hover:scale-[1.02] transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/30 transition-colors">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <div className="text-xs text-primary font-semibold mb-2">STEP {i + 1}</div>
                <h3 className="text-xl font-display font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Unique Feature Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-secondary/10 rounded-full blur-[100px]" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className="card-glass rounded-3xl p-8 md:p-12 gradient-border">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-accent text-sm font-medium mb-4">
                    <Zap className="w-4 h-4" />
                    Unique Feature
                  </div>
                  <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                    Multi-Format <span className="text-glow-accent">Export</span>
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Export your 3D models in industry-standard formats. Whether you're 
                    building games, creating VR experiences, or 3D printing - we've got 
                    you covered.
                  </p>
                  <div className="space-y-3">
                    {[
                      { format: "OBJ", desc: "Universal format for 3D software" },
                      { format: "GLTF", desc: "Optimized for web and AR/VR" },
                      { format: "STL", desc: "Perfect for 3D printing" },
                    ].map((item) => (
                      <div key={item.format} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                          <Download className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <span className="font-semibold text-primary">{item.format}</span>
                          <span className="text-muted-foreground"> - {item.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  <div className="aspect-square rounded-2xl bg-muted/30 border border-border flex items-center justify-center">
                    <div className="w-32 h-32 relative animate-spin-slow">
                      <Box className="w-full h-full text-primary/30" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Box className="w-20 h-20 text-primary animate-pulse-glow" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section id="about" className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { icon: Zap, title: "Lightning Fast", desc: "Process images in under 30 seconds" },
              { icon: Shield, title: "Secure & Private", desc: "Your files are encrypted and protected" },
              { icon: Cpu, title: "AI Powered", desc: "Advanced neural networks for accuracy" },
            ].map((item, i) => (
              <div key={i} className="text-center p-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-display font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
              Ready to Create Your First <span className="text-glow">3D Model</span>?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Join thousands of creators who are already transforming their ideas into 3D reality.
            </p>
            <Link to="/auth">
              <Button variant="hero" size="xl">
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-display font-semibold">HoloLearn</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2024 HoloLearn. Transform your imagination into reality.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
