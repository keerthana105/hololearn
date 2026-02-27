import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import demoVideo from "@/assets/demo-video.mp4";
import { Play, ArrowRight, Upload, Wand2, Cpu, Eye, Download, MousePointer } from "lucide-react";

const demoSteps = [
  { step: 1, icon: Upload, title: "Upload Your Image", description: "Start by uploading any 2D image - medical scans, anatomical diagrams, biology images, or photographs. Supported formats: JPG, PNG, WebP up to 10MB." },
  { step: 2, icon: Wand2, title: "Remove Background", description: "Use our AI-powered background removal to isolate the main subject for cleaner 3D results." },
  { step: 3, icon: Cpu, title: "AI Depth Analysis", description: "Google Gemini AI analyzes your image to create a 128×128 depth grid with anatomical structure identification and educational annotations." },
  { step: 4, icon: Eye, title: "Interactive 3D Viewing", description: "Explore your generated 3D model in real-time! Rotate, zoom, and pan. Click glowing hotspots to learn about each feature." },
  { step: 5, icon: Download, title: "Export Your Model", description: "Download in OBJ, GLTF, or STL format for games, AR/VR, 3D printing, and more." },
];

export default function Demo() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-24 pb-16 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium mb-4">
              <Play className="w-4 h-4" />
              Live Demo
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold mb-4">
              See It In <span className="text-glow">Action</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Watch how HoloLearn transforms 2D anatomy images into interactive 3D holographic models
            </p>
          </div>

          <div className="max-w-4xl mx-auto mb-16">
            <div className="card-glass rounded-2xl overflow-hidden gradient-border">
              <video className="w-full aspect-video object-cover" src={demoVideo} autoPlay loop muted playsInline />
              <div className="p-6 text-center">
                <p className="text-muted-foreground text-sm mb-4">From 2D anatomy diagram → AI analysis → Interactive 3D model</p>
                <Link to="/convert">
                  <Button variant="hero" size="lg" className="gap-2">
                    <ArrowRight className="w-5 h-5" />
                    Try It Yourself
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-10">
              Step-by-Step <span className="text-glow">Process</span>
            </h2>
            <div className="space-y-6">
              {demoSteps.map((step, index) => (
                <div key={step.step} className="flex gap-4 p-5 rounded-xl card-glass gradient-border hover:scale-[1.01] transition-transform">
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                    <step.icon className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">STEP {step.step}</span>
                    <h3 className="font-semibold text-lg mt-1 mb-1">{step.title}</h3>
                    <p className="text-muted-foreground text-sm">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link to="/convert">
                <Button variant="hero" size="lg" className="gap-2">
                  <MousePointer className="w-5 h-5" />
                  Try It Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
