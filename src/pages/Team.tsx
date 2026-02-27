import Navbar from "@/components/Navbar";
import { Sparkles, Github, Linkedin, Mail } from "lucide-react";

const teamMembers = [
  {
    name: "Project Lead",
    role: "Full Stack Developer",
    description: "Final year student specializing in AI-powered web applications and 3D visualization.",
    avatar: "🧑‍💻",
  },
  {
    name: "AI Specialist",
    role: "Machine Learning Engineer",
    description: "Expertise in computer vision, depth estimation, and generative AI models.",
    avatar: "🤖",
  },
  {
    name: "3D Engineer",
    role: "WebGL / Three.js Developer",
    description: "Specializes in real-time 3D rendering, parametric geometry, and AR/VR experiences.",
    avatar: "🎨",
  },
  {
    name: "UX Designer",
    role: "UI/UX Researcher",
    description: "Focused on creating intuitive, accessible interfaces for educational technology.",
    avatar: "✨",
  },
];

export default function Team() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-24 pb-16 relative">
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px]" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Our Team
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold mb-4">
              Meet the <span className="text-glow">Team</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A passionate team of students building the future of 3D educational technology
            </p>
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
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-4">
              About <span className="text-glow">HoloLearn</span>
            </h2>
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
    </div>
  );
}
