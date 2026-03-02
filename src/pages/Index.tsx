import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import demoVideo from "@/assets/demo-video.mp4";
import Navbar from "@/components/Navbar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Sparkles, Upload, Box, Download, Zap, Shield, Cpu,
  ArrowRight, Play, CheckCircle, Image, Wand2, Eye, MousePointer,
  Layers, Globe, Smartphone, Github, Linkedin, Mail
} from "lucide-react";

// Condensed features for homepage preview
const topFeatures = [
  { icon: Cpu, title: "AI-Powered 3D Generation", description: "Google Gemini analyzes depth and structure to create accurate volumetric 3D models from any 2D image." },
  { icon: Eye, title: "Interactive 3D Viewer", description: "Sketchfab-quality viewer with PBR lighting, orbit controls, wireframe toggle, and clickable annotations." },
  { icon: Download, title: "Multi-Format Export", description: "Export in OBJ, GLTF, or STL. Optimized for web, AR/VR, and 3D printing." },
  { icon: Wand2, title: "AI Background Removal", description: "One-click background removal isolates subjects for cleaner, more accurate 3D generation." },
];

const allFeatures = [
  { icon: Upload, title: "Drag & Drop Upload", description: "Upload any 2D image — medical scans, diagrams, sketches. Supports JPG, PNG, WebP up to 10MB." },
  { icon: Layers, title: "128×128 Depth Mapping", description: "High-resolution depth grid with intelligent surface topology for realistic 3D reconstruction." },
  { icon: Shield, title: "Secure & Private", description: "Your files are encrypted, stored securely, and accessible only to you." },
  { icon: Zap, title: "Lightning Fast", description: "Process images in under 30 seconds with GPU-accelerated AI inference." },
  { icon: Globe, title: "Web-Based", description: "No downloads or installations. Works directly in your browser on any device." },
  { icon: Smartphone, title: "AR/VR Ready", description: "GLTF exports are optimized for augmented and virtual reality applications." },
  { icon: Sparkles, title: "Educational Annotations", description: "AI generates educational feature labels and descriptions for each identified structure." },
  { icon: Box, title: "Parametric Anatomy", description: "True volumetric geometry with parametric shapes — anatomically inspired models, not flat extrusions." },
];

const teamMembers = [
  { name: "Project Lead", role: "Full Stack Developer", description: "Final year student specializing in AI-powered web applications and 3D visualization.", avatar: "🧑‍💻" },
  { name: "AI Specialist", role: "Machine Learning Engineer", description: "Expertise in computer vision, depth estimation, and generative AI models.", avatar: "🤖" },
  { name: "3D Engineer", role: "WebGL / Three.js Developer", description: "Specializes in real-time 3D rendering, parametric geometry, and AR/VR experiences.", avatar: "🎨" },
  { name: "UX Designer", role: "UI/UX Researcher", description: "Focused on creating intuitive, accessible interfaces for educational technology.", avatar: "✨" },
];

export default function Index() {
  const [showDemo, setShowDemo] = useState(false);
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  const demoSteps = [
    { step: 1, icon: Upload, title: "Upload Your Image", description: "Start by uploading any 2D image - medical scans, anatomy diagrams, or photographs. Supports JPG, PNG, WebP up to 10MB." },
    { step: 2, icon: Wand2, title: "Optional: Remove Background", description: "Use AI-powered background removal to isolate the subject for cleaner 3D results." },
    { step: 3, icon: Cpu, title: "AI Depth Analysis", description: "Google Gemini AI analyzes your image to create a depth grid, identifying structures and generating annotations." },
    { step: 4, icon: Eye, title: "Interactive 3D Viewing", description: "Explore your 3D model in a Sketchfab-quality viewer. Rotate, zoom, toggle wireframe, and click hotspots." },
    { step: 5, icon: Download, title: "Export Your Model", description: "Download in OBJ, GLTF, or STL format for games, VR, AR, or 3D printing." },
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
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-secondary/20 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: "1s" }} />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">AI-Powered 3D Generation</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 animate-slide-up">
              <span className="text-glow">Transform</span>{" "}
              <span className="text-foreground">2D Images</span>
              <br />
              <span className="text-foreground">Into </span>
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">3D Reality</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "0.1s" }}>
              Upload any image and watch our AI transform it into a stunning, interactive 3D model with Sketchfab-quality rendering.
            </p>

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
                    <Play className="w-5 h-5" /> Watch Demo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-display flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-primary" /> How HoloLearn Works
                    </DialogTitle>
                  </DialogHeader>
                  <div className="mt-6 space-y-6">
                    {demoSteps.map((step, index) => (
                      <div key={step.step} className="flex gap-4 p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center"><step.icon className="w-6 h-6 text-primary" /></div>
                        </div>
                        <div className="flex-1">
                          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">STEP {step.step}</span>
                          <h3 className="font-semibold text-lg mb-1 mt-1">{step.title}</h3>
                          <p className="text-muted-foreground text-sm">{step.description}</p>
                        </div>
                      </div>
                    ))}
                    <div className="pt-4 flex justify-center">
                      <Link to="/convert" onClick={() => setShowDemo(false)}>
                        <Button variant="hero" size="lg" className="gap-2"><MousePointer className="w-5 h-5" /> Try It Now</Button>
                      </Link>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl md:text-4xl font-display font-bold text-primary mb-1">{stat.value}</div>
                  <div className="text-muted-foreground text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
            <div className="w-1 h-2 bg-primary rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 relative">
        <div className="absolute inset-0 bg-dots opacity-20" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">How It <span className="text-glow">Works</span></h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Our streamlined process makes 3D creation accessible to everyone</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Upload, title: "Upload Any Image", description: "Simply upload your 2D image, sketch, or photograph to get started." },
              { icon: Cpu, title: "AI Processing", description: "Our advanced AI analyzes depth, lighting, and geometry from your image." },
              { icon: Box, title: "3D Generation", description: "Watch as your 2D image transforms into an interactive 3D model." },
              { icon: Download, title: "Export Anywhere", description: "Download your model in OBJ, GLTF, or STL format for any use case." },
            ].map((feature, i) => (
              <div key={i} className="card-glass rounded-2xl p-6 gradient-border group hover:scale-[1.02] transition-all duration-300">
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

      {/* Demo Video */}
      <section id="demo" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-primary/10 rounded-full blur-[120px]" /></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium mb-4"><Play className="w-4 h-4" /> Live Demo</div>
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">See It In <span className="text-glow">Action</span></h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Watch how HoloLearn transforms 2D anatomy images into interactive 3D models</p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="card-glass rounded-2xl overflow-hidden gradient-border">
              <div className="relative">
                <video className="w-full aspect-video object-cover" src={demoVideo} autoPlay loop muted playsInline />
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-background/20 via-transparent to-transparent" />
              </div>
              <div className="p-6 text-center">
                <p className="text-muted-foreground text-sm mb-4">From 2D anatomy diagram → AI analysis → Interactive 3D model with educational annotations</p>
                <Link to="/convert"><Button variant="hero" size="lg" className="gap-2"><ArrowRight className="w-5 h-5" /> Try It Yourself</Button></Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES SECTION (Condensed) ===== */}
      <section id="features" className="py-24 relative">
        <div className="absolute inset-0 bg-dots opacity-20" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" /> Platform Features
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
              Everything You Need for <span className="text-glow">3D Creation</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Powerful tools and AI capabilities to transform any 2D image into stunning 3D models</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {topFeatures.map((feature, i) => (
              <div key={i} className="card-glass rounded-2xl p-6 gradient-border group hover:scale-[1.02] transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/30 transition-colors">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-display font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Expandable additional features */}
          {showAllFeatures && (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mt-6 animate-fade-in">
              {allFeatures.map((feature, i) => (
                <div key={i} className="card-glass rounded-2xl p-6 gradient-border group hover:scale-[1.02] transition-all duration-300">
                  <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/30 transition-colors">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-display font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-10">
            <Button variant="glass" size="lg" onClick={() => setShowAllFeatures(!showAllFeatures)} className="gap-2">
              {showAllFeatures ? "Show Less" : "See All Features"}
              <ArrowRight className={`w-4 h-4 transition-transform ${showAllFeatures ? "rotate-90" : ""}`} />
            </Button>
          </div>
        </div>
      </section>

      {/* Export Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-secondary/10 rounded-full blur-[100px]" /></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className="card-glass rounded-3xl p-8 md:p-12 gradient-border">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-accent text-sm font-medium mb-4"><Zap className="w-4 h-4" /> Unique Feature</div>
                  <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Multi-Format <span className="text-glow-accent">Export</span></h2>
                  <p className="text-muted-foreground mb-6">Export your 3D models in industry-standard formats for games, VR, or 3D printing.</p>
                  <div className="space-y-3">
                    {[
                      { format: "OBJ", desc: "Universal format for 3D software" },
                      { format: "GLTF", desc: "Optimized for web and AR/VR" },
                      { format: "STL", desc: "Perfect for 3D printing" },
                    ].map((item) => (
                      <div key={item.format} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center"><Download className="w-4 h-4 text-primary" /></div>
                        <div><span className="font-semibold text-primary">{item.format}</span><span className="text-muted-foreground"> - {item.desc}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  <div className="aspect-square rounded-2xl bg-muted/30 border border-border flex items-center justify-center">
                    <div className="w-32 h-32 relative animate-spin-slow">
                      <Box className="w-full h-full text-primary/30" />
                      <div className="absolute inset-0 flex items-center justify-center"><Box className="w-20 h-20 text-primary animate-pulse-glow" /></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TEAM SECTION (Condensed) ===== */}
      <section id="team" className="py-24 relative">
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px]" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" /> Our Team
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">Meet the <span className="text-glow">Team</span></h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">A passionate team of students building the future of 3D educational technology</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {teamMembers.map((member, i) => (
              <div key={i} className="card-glass rounded-2xl p-6 gradient-border text-center group hover:scale-[1.02] transition-all">
                <div className="text-5xl mb-4">{member.avatar}</div>
                <h3 className="text-lg font-display font-semibold mb-1">{member.name}</h3>
                <p className="text-primary text-sm font-medium mb-3">{member.role}</p>
                <p className="text-muted-foreground text-sm mb-4">{member.description}</p>
                <div className="flex items-center justify-center gap-3">
                  <Github className="w-4 h-4 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
                  <Linkedin className="w-4 h-4 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
                  <Mail className="w-4 h-4 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
                </div>
              </div>
            ))}
          </div>

          {/* About Section */}
          <div className="max-w-3xl mx-auto mt-20 text-center">
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-4">About <span className="text-glow">HoloLearn</span></h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              HoloLearn is a final year project that bridges the gap between 2D learning materials and immersive 3D experiences. 
              By leveraging cutting-edge AI and WebGL technology, we make 3D visualization accessible to students, educators, and medical professionals.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Our mission is to transform how anatomy and biology are taught by converting static 2D images into interactive, 
              educational 3D models that students can explore from every angle.
            </p>
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
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4"><item.icon className="w-8 h-8 text-primary" /></div>
                <h3 className="text-lg font-display font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">Ready to Create Your First <span className="text-glow">3D Model</span>?</h2>
            <p className="text-muted-foreground text-lg mb-8">Join thousands of creators transforming their ideas into 3D reality.</p>
            <Link to="/auth"><Button variant="hero" size="xl">Get Started Free <ArrowRight className="w-5 h-5" /></Button></Link>
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
            <p className="text-muted-foreground text-sm">© 2024 HoloLearn. Transform your imagination into reality.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
