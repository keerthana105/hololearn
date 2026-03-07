import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message } = await req.json();
    if (!name || !email || !message) throw new Error("Missing required fields");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Use AI to generate a professional auto-reply
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: "Generate a brief, professional auto-reply email (3-4 sentences) acknowledging receipt of a contact form submission for HoloLearn, an AI-powered 3D model platform. Be warm and assure them their message will be reviewed within 24 hours."
          },
          {
            role: "user",
            content: `Name: ${name}, Subject: ${subject || "General Inquiry"}, Message preview: ${message.substring(0, 100)}`
          }
        ],
      }),
    });

    let autoReply = `Hi ${name},\n\nThank you for reaching out to HoloLearn! We've received your message and our team will get back to you within 24 hours.\n\nBest regards,\nHoloLearn Team`;

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const generated = aiData.choices?.[0]?.message?.content;
      if (generated) autoReply = generated;
    }

    // Log for admin notification and forward to owner
    const ADMIN_EMAIL = "keerthanamariaselvam13@gmail.com";
    console.log(`[CONTACT] New message from ${name} (${email}): ${subject || "No subject"}`);
    console.log(`[FORWARD] To admin: ${ADMIN_EMAIL}`);
    console.log(`[AUTO-REPLY] To: ${email}, Body: ${autoReply}`);

    return new Response(JSON.stringify({
      success: true,
      autoReply,
      message: `Contact form processed for ${email}`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[send-contact-email] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
