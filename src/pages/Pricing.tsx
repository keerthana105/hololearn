import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Sparkles, IndianRupee } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const plans = [
  {
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "Get started with basic 3D conversion",
    features: ["10 conversions per month", "OBJ export format", "Basic depth mapping", "Community support", "Web-based viewer"],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    monthlyPrice: 499,
    yearlyPrice: 4999,
    description: "Unlimited conversions with premium features",
    features: ["Unlimited conversions", "OBJ, GLTF, STL exports", "HD depth mapping (256×256)", "Priority AI processing", "Background removal", "Educational annotations", "Email model delivery", "Email support"],
    cta: "Upgrade to Pro",
    popular: true,
  },
  {
    name: "Enterprise",
    monthlyPrice: null,
    yearlyPrice: null,
    description: "For teams and organizations",
    features: ["Everything in Pro", "API access", "Batch processing", "Custom AI models", "Team management", "Dedicated support", "SLA guarantee"],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function Pricing() {
  const [yearly, setYearly] = useState(false);

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

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, i) => {
              const price = plan.monthlyPrice === null
                ? "Custom"
                : yearly
                  ? plan.yearlyPrice
                  : plan.monthlyPrice;

              return (
                <div key={i} className={`card-glass rounded-2xl p-8 gradient-border relative ${plan.popular ? "ring-2 ring-primary scale-105" : ""}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      MOST POPULAR
                    </div>
                  )}
                  <h3 className="text-xl font-display font-bold mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    {typeof price === "number" ? (
                      <>
                        <div className="flex items-center">
                          <IndianRupee className="w-6 h-6 text-primary" />
                          <span className="text-4xl font-display font-bold text-primary">{price.toLocaleString("en-IN")}</span>
                        </div>
                        <span className="text-muted-foreground">/{yearly ? "year" : "month"}</span>
                      </>
                    ) : (
                      <span className="text-4xl font-display font-bold text-primary">{price}</span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm mb-6">{plan.description}</p>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to={plan.name === "Enterprise" ? "/contact" : "/auth"}>
                    <Button variant={plan.popular ? "hero" : "outline"} className="w-full gap-2">
                      {plan.cta} <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
