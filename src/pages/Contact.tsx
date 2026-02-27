import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Mail, MapPin, Clock, Send, Loader2, MessageSquare, HelpCircle } from "lucide-react";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

const faqs = [
  { q: "How long does processing take?", a: "Most images are processed in under 30 seconds using our GPU-accelerated AI pipeline." },
  { q: "What file formats are supported?", a: "Upload JPG, PNG, or WebP images. Export as OBJ, GLTF, or STL." },
  { q: "Is my data secure?", a: "Yes. All files are encrypted, stored in secure cloud storage, and accessible only to you." },
  { q: "Can I use models for 3D printing?", a: "Absolutely! Export in STL format which is optimized for 3D printing." },
];

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse({ name, email, subject, message });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach(err => { if (err.path[0]) errs[err.path[0] as string] = err.message; });
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const { error } = await supabase.from("contact_messages").insert({
        name: result.data.name,
        email: result.data.email,
        subject: result.data.subject || null,
        message: result.data.message,
      });
      if (error) throw error;
      toast({ title: "Message sent!", description: "We'll get back to you soon." });
      setName(""); setEmail(""); setSubject(""); setMessage("");
    } catch {
      toast({ title: "Error", description: "Failed to send message. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-24 pb-16 relative">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium mb-4">
              <MessageSquare className="w-4 h-4" />
              Contact Us
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold mb-4">
              Get In <span className="text-glow">Touch</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Have questions or feedback? We'd love to hear from you.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Contact Form */}
            <div className="card-glass rounded-2xl p-8 gradient-border">
              <h2 className="text-xl font-display font-semibold mb-6">Send a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-muted-foreground">Name</Label>
                    <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="bg-input border-border" />
                    {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-muted-foreground">Email</Label>
                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="bg-input border-border" />
                    {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-muted-foreground">Subject (Optional)</Label>
                  <Input id="subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="What's this about?" className="bg-input border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-muted-foreground">Message</Label>
                  <Textarea id="message" value={message} onChange={e => setMessage(e.target.value)} placeholder="Your message..." className="bg-input border-border min-h-[120px]" />
                  {errors.message && <p className="text-destructive text-xs">{errors.message}</p>}
                </div>
                <Button type="submit" variant="hero" className="w-full gap-2" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send Message
                </Button>
              </form>
            </div>

            {/* Info + FAQ */}
            <div className="space-y-8">
              <div className="card-glass rounded-2xl p-8 gradient-border space-y-6">
                <h2 className="text-xl font-display font-semibold">Contact Info</h2>
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-muted-foreground text-sm">support@hololearn.app</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-muted-foreground text-sm">Chennai, Tamil Nadu, India</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Response Time</p>
                    <p className="text-muted-foreground text-sm">Within 24 hours</p>
                  </div>
                </div>
              </div>

              <div className="card-glass rounded-2xl p-8 gradient-border">
                <h2 className="text-xl font-display font-semibold mb-4 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  FAQ
                </h2>
                <div className="space-y-4">
                  {faqs.map((faq, i) => (
                    <div key={i}>
                      <p className="font-medium text-sm mb-1">{faq.q}</p>
                      <p className="text-muted-foreground text-sm">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
