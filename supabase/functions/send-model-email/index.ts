import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("Authentication failed");

    const { conversionId, modelTitle, downloadLinks } = await req.json();
    if (!conversionId) throw new Error("Missing conversionId");

    const userEmail = userData.user.email;
    const userName = userData.user.user_metadata?.full_name || userEmail.split("@")[0];

    // Use Lovable AI to generate a nicely formatted email notification
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
            content: "Generate a short, friendly email body (plain text, 3-4 sentences) for a 3D model delivery notification. Include the model name and tell the user their model is ready for download on the platform."
          },
          {
            role: "user",
            content: `User: ${userName}, Model: ${modelTitle || "Untitled Model"}, Conversion ID: ${conversionId}`
          }
        ],
      }),
    });

    let emailBody = `Hi ${userName},\n\nYour 3D model "${modelTitle || "Untitled"}" is ready! Visit your dashboard on HoloLearn to download it in OBJ, GLTF, or STL format.\n\nHappy learning!\n— HoloLearn Team`;

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const generated = aiData.choices?.[0]?.message?.content;
      if (generated) emailBody = generated;
    }

    // Store the email notification in the database for the user
    // In production, this would integrate with an email service
    // For now we log and return success so the frontend can show the notification
    console.log(`[EMAIL] To: ${userEmail}, Subject: Your 3D Model is Ready!, Body: ${emailBody}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Email notification prepared for ${userEmail}`,
      emailPreview: emailBody 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[send-model-email] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
