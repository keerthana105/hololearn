import Navbar from "@/components/Navbar";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Upload, Cpu, Box, Download, Zap, Shield, Eye, Wand2,
  Layers, Globe, Smartphone, ArrowRight, Sparkles
} from "lucide-react";

const features = [
  { icon: Upload, title: "Drag & Drop Upload", description: "Upload any 2D image — medical scans, diagrams, sketches, or photos. Supports JPG, PNG, WebP up to 10MB." },
  { icon: Wand2, title: "AI Background Removal", description: "One-click AI-powered background removal isolates the subject for cleaner 3D generation." },
  { icon: Cpu, title: "Gemini AI Analysis", description: "Google Gemini 2.5 Pro analyzes depth, anatomy, and structure to create accurate 3D representations." },
  { icon: Box, title: "Volumetric 3D Models", description: "True volumetric geometry with parametric shapes — not flat extrusions but anatomically inspired models." },
  { icon: Eye, title: "Interactive 3D Viewer", description: "Rotate, zoom, and pan. Click glowing hotspots to learn about identified anatomical features." },
  { icon: Download, title: "Multi-Format Export", description: "Export in OBJ (universal), GLTF (web/AR/VR), or STL (3D printing) formats." },
  { icon: Layers, title: "Depth Mapping", description: "128×128 depth grid with intelligent surface topology for realistic 3D reconstruction." },
  { icon: Shield, title: "Secure & Private", description: "Your files are encrypted, stored securely, and accessible only to you." },
  { icon: Zap, title: "Lightning Fast", description: "Process images in under 30 seconds with GPU-accelerated AI inference." },
  { icon: Globe, title: "Web-Based", description: "No downloads or installations. Works directly in your browser on any device." },
  { icon: Smartphone, title: "AR/VR Ready", description: "GLTF exports are optimized for augmented and virtual reality applications." },
  { icon: Sparkles, title: "Educational Annotations", description: "AI generates educational feature labels and descriptions for each identified structure." },
];

export default function Features() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-24 pb-16 relative">
        <div className="absolute inset-0 bg-dots opacity-20" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Platform Features
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold mb-4">
              Everything You Need for <span className="text-glow">3D Creation</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Powerful tools and AI capabilities to transform any 2D image into stunning 3D models
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, i) => (
              <div key={i} className="card-glass rounded-2xl p-6 gradient-border group hover:scale-[1.02] transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/30 transition-colors">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-display font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <Link to="/convert">
              <Button variant="hero" size="xl" className="gap-2">
                Start Converting <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
