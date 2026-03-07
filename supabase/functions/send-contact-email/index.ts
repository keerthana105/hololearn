import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAIL = "keerthanamariaselvam13@gmail.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message } = await req.json();
    if (!name || !email || !message) throw new Error("Missing required fields");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Generate AI auto-reply
    let autoReply = `Hi ${name},\n\nThank you for reaching out to HoloLearn! We've received your message and our team will get back to you within 24 hours.\n\nBest regards,\nHoloLearn Team`;

    if (LOVABLE_API_KEY) {
      try {
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
        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const generated = aiData.choices?.[0]?.message?.content;
          if (generated) autoReply = generated;
        }
      } catch (e) {
        console.warn("[AI] Auto-reply generation failed, using fallback:", e);
      }
    }

    // Send notification email to admin
    const adminEmailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: [ADMIN_EMAIL],
        subject: `[HoloLearn Contact] ${subject || "New Message"} from ${name}`,
        html: `<h2>New Contact Form Submission</h2>
<p><strong>Name:</strong> ${name}</p>
<p><strong>Email:</strong> ${email}</p>
<p><strong>Subject:</strong> ${subject || "N/A"}</p>
<p><strong>Message:</strong></p>
<p>${message.replace(/\n/g, "<br>")}</p>
<hr>
<p><em>Reply directly to ${email}</em></p>`,
      }),
    });

    if (!adminEmailRes.ok) {
      const errBody = await adminEmailRes.text();
      console.error("[Resend] Admin email failed:", adminEmailRes.status, errBody);
    } else {
      console.log("[Resend] Admin notification sent to", ADMIN_EMAIL);
    }

    // Send auto-reply to the user (note: on Resend free tier, only verified email can receive)
    const userEmailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: [email],
        subject: "Thank you for contacting HoloLearn!",
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
<h2 style="color: #7c3aed;">HoloLearn</h2>
<p>${autoReply.replace(/\n/g, "<br>")}</p>
<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
<p style="color: #9ca3af; font-size: 12px;">This is an automated response from HoloLearn.</p>
</div>`,
      }),
    });

    if (!userEmailRes.ok) {
      const errBody = await userEmailRes.text();
      console.error("[Resend] User auto-reply failed:", userEmailRes.status, errBody);
    } else {
      console.log("[Resend] Auto-reply sent to", email);
    }

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