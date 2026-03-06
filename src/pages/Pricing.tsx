import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Sparkles, IndianRupee, Crown, Loader2, GraduationCap, Rocket, Building2, QrCode, Smartphone, Copy } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const UPI_ID = "hololearn@upi"; // Replace with your actual UPI ID

const plans = [
  {
    name: "Starter",
    tier: "starter" as const,
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "Get started with basic 3D conversion",
    icon: Rocket,
    gradient: "from-muted/50 to-muted/30",
    features: [
      "5 conversions per month",
      "OBJ export format",
      "Basic depth mapping",
      "Community support",
      "Web-based 3D viewer",
    ],
    cta: "Get Started Free",
    popular: false,
  },
  {
    name: "Student",
    tier: "student" as const,
    monthlyPrice: 99,
    yearlyPrice: 999,
    description: "Perfect for students learning anatomy",
    icon: GraduationCap,
    gradient: "from-secondary/20 to-secondary/5",
    features: [
      "15 conversions per month",
      "OBJ & GLTF exports",
      "HD depth mapping",
      "AI-powered annotations",
      "Background removal",
      "Email support",
    ],
    cta: "Start Learning",
    popular: false,
  },
  {
    name: "Pro",
    tier: "pro" as const,
    monthlyPrice: 299,
    yearlyPrice: 2999,
    description: "Unlimited conversions with priority AI",
    icon: Crown,
    gradient: "from-primary/20 to-primary/5",
    features: [
      "Unlimited conversions",
      "OBJ, GLTF, STL exports",
      "HD depth mapping (256×256)",
      "Priority AI processing",
      "Background removal",
      "Educational annotations",
      "Email model delivery",
      "Priority email support",
    ],
    cta: "Upgrade to Pro",
    popular: true,
  },
  {
    name: "Enterprise",
    tier: "enterprise" as const,
    monthlyPrice: null,
    yearlyPrice: null,
    description: "Custom 3D models + API access for teams",
    icon: Building2,
    gradient: "from-accent/20 to-accent/5",
    features: [
      "Everything in Pro",
      "API access",
      "Batch processing",
      "Custom AI models",
      "Team management",
      "Dedicated support",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

function PaymentDialog({ open, onOpenChange, planName, amount }: { open: boolean; onOpenChange: (v: boolean) => void; planName: string; amount: number }) {
  const { toast } = useToast();
  const upiLink = `upi://pay?pa=${UPI_ID}&pn=HoloLearn&am=${amount}&cu=INR&tn=${planName}%20Subscription`;
  const qrValue = `upi://pay?pa=${UPI_ID}&pn=HoloLearn&am=${amount}&cu=INR&tn=${planName}%20Subscription`;
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

  const copyUPI = () => {
    navigator.clipboard.writeText(UPI_ID);
    toast({ title: "UPI ID Copied!", description: UPI_ID });
  };

  const handleUPIClick = () => {
    if (isMobile) {
      window.location.href = upiLink;
    } else {
      toast({
        title: "📱 Use your phone",
        description: "Scan the QR code below with GPay or any UPI app, or copy the UPI ID to pay manually.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Pay for {planName}</DialogTitle>
          <DialogDescription>Choose your preferred payment method</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Amount */}
          <div className="text-center p-4 rounded-xl bg-muted/30 border border-border">
            <p className="text-sm text-muted-foreground mb-1">Amount to pay</p>
            <div className="flex items-center justify-center gap-1">
              <IndianRupee className="w-6 h-6 text-primary" />
              <span className="text-3xl font-display font-bold text-primary">{amount.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* GPay / UPI Button */}
          <button
            onClick={handleUPIClick}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold">Pay with GPay / UPI App</p>
              <p className="text-sm text-muted-foreground">{isMobile ? "Opens your UPI app directly" : "Available on mobile only"}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* QR Code */}
          <div className="text-center space-y-3">
            <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
              <QrCode className="w-4 h-4" />
              <span>Scan QR Code</span>
            </div>
            <div className="inline-block p-4 bg-white rounded-xl">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrValue)}`}
                alt="UPI QR Code"
                className="w-48 h-48"
              />
            </div>
          </div>

          {/* Copy UPI ID */}
          <button
            onClick={copyUPI}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Copy className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-sm">UPI ID</p>
              <p className="text-muted-foreground text-xs font-mono">{UPI_ID}</p>
            </div>
            <span className="text-xs text-primary font-medium">Copy</span>
          </button>

          <p className="text-xs text-center text-muted-foreground">
            After payment, your subscription will be activated within a few minutes. Contact support if you face any issues.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Pricing() {
  const [yearly, setYearly] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; planName: string; amount: number }>({ open: false, planName: "", amount: 0 });
  const { user } = useAuth();
  const { toast } = useToast();

  const handleCheckout = (tier: string, planName: string, price: number | null) => {
    if (tier === "starter") {
      window.location.href = "/auth";
      return;
    }
    if (tier === "enterprise") {
      window.location.href = "/contact";
      return;
    }
    if (!user) {
      toast({ title: "Please sign in first", description: "You need an account to subscribe.", variant: "destructive" });
      window.location.href = "/auth";
      return;
    }
    if (price) {
      setPaymentDialog({ open: true, planName, amount: price });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-24 pb-16 relative">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[120px]" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Pricing
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold mb-4">
              Simple, Transparent <span className="text-glow">Pricing</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
              Choose the plan that fits your needs. Pay with GPay, UPI, or scan QR.
            </p>

            <div className="flex items-center justify-center gap-3">
              <span className={`text-sm font-medium ${!yearly ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
              <Switch checked={yearly} onCheckedChange={setYearly} />
              <span className={`text-sm font-medium ${yearly ? "text-foreground" : "text-muted-foreground"}`}>
                Yearly <span className="text-primary text-xs ml-1">Save 17%</span>
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {plans.map((plan, i) => {
              const price = plan.monthlyPrice === null
                ? null
                : yearly ? plan.yearlyPrice : plan.monthlyPrice;
              const Icon = plan.icon;

              return (
                <div
                  key={i}
                  className={`card-glass rounded-2xl p-6 gradient-border relative flex flex-col transition-all duration-300 hover:scale-[1.02] ${
                    plan.popular ? "ring-2 ring-primary lg:scale-105 lg:hover:scale-[1.07]" : ""
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold whitespace-nowrap">
                      MOST POPULAR
                    </div>
                  )}

                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-primary" />
                  </div>

                  <h3 className="text-xl font-display font-bold mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-2 min-h-[48px]">
                    {price !== null ? (
                      <>
                        <div className="flex items-center">
                          <IndianRupee className="w-5 h-5 text-primary" />
                          <span className="text-3xl font-display font-bold text-primary">{price.toLocaleString("en-IN")}</span>
                        </div>
                        <span className="text-muted-foreground text-sm">/{yearly ? "yr" : "mo"}</span>
                      </>
                    ) : (
                      <span className="text-3xl font-display font-bold text-primary">Custom</span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm mb-6">{plan.description}</p>

                  <ul className="space-y-2.5 mb-8 flex-1">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm animate-fade-in" style={{ animationDelay: `${j * 50}ms` }}>
                        <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={plan.popular ? "hero" : "outline"}
                    className="w-full gap-2 h-12 text-base"
                    onClick={() => handleCheckout(plan.tier, plan.name, price)}
                  >
                    {plan.cta} <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Payment methods badge */}
          <div className="text-center mt-12">
            <p className="text-muted-foreground text-sm mb-3">Accepted Payment Methods</p>
            <div className="inline-flex items-center gap-4 px-6 py-3 rounded-full bg-muted/20 border border-border">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Smartphone className="w-4 h-4 text-primary" />
                GPay
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <IndianRupee className="w-4 h-4 text-primary" />
                UPI
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <QrCode className="w-4 h-4 text-primary" />
                QR Scan
              </div>
            </div>
          </div>
        </div>
      </section>

      <PaymentDialog
        open={paymentDialog.open}
        onOpenChange={(v) => setPaymentDialog(prev => ({ ...prev, open: v }))}
        planName={paymentDialog.planName}
        amount={paymentDialog.amount}
      />
    </div>
  );
}
