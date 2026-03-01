import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Sparkles, IndianRupee, Crown, Loader2, GraduationCap, Rocket, Building2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const TIERS = {
  starter: { price_id: null, product_id: null },
  student: { price_id: "price_1T5hJtFDm3bMhmknedKwvau2", product_id: "prod_U3ox98q4XEgVqm" },
  pro: { price_id: "price_1T62j4FDm3bMhmkncEoG5Snz", product_id: "prod_U4B5JsRD0d8ckS" },
  enterprise: { price_id: null, product_id: null },
};

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

export default function Pricing() {
  const [yearly, setYearly] = useState(false);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleCheckout = async (tier: keyof typeof TIERS) => {
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

    setLoadingTier(tier);
    try {
      const priceId = TIERS[tier].price_id;
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: "Checkout Error", description: err.message || "Failed to start checkout.", variant: "destructive" });
    } finally {
      setLoadingTier(null);
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
              Choose the plan that fits your needs. Start free, upgrade anytime.
            </p>

            {/* Billing Toggle */}
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
                ? "Custom"
                : yearly ? plan.yearlyPrice : plan.monthlyPrice;
              const Icon = plan.icon;
              const isLoading = loadingTier === plan.tier;

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
                    {typeof price === "number" ? (
                      <>
                        <div className="flex items-center">
                          <IndianRupee className="w-5 h-5 text-primary" />
                          <span className="text-3xl font-display font-bold text-primary">{price.toLocaleString("en-IN")}</span>
                        </div>
                        <span className="text-muted-foreground text-sm">/{yearly ? "yr" : "mo"}</span>
                      </>
                    ) : (
                      <span className="text-3xl font-display font-bold text-primary">{price}</span>
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
                    onClick={() => handleCheckout(plan.tier)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        {plan.cta} <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
