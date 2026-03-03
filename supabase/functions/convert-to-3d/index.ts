import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let conversionId: string | null = null;
  let supabase: ReturnType<typeof createClient> | null = null;

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase configuration missing");

    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const body = await req.json();
    conversionId = body.conversionId;
    const imageUrl = body.imageUrl;
    const confirmedModelId = body.confirmedModelId; // User-confirmed model ID (optional)
    
    if (!conversionId || !imageUrl) throw new Error("Missing required fields: conversionId and imageUrl");
    
    console.log("=== STARTING 3D CONVERSION ===");
    console.log("Confirmed model:", confirmedModelId || "none (classifying)");

    await supabase.from("conversions").update({ status: "processing" }).eq("id", conversionId);

    // If user already confirmed a model, skip classification
    if (confirmedModelId) {
      const modelData = {
        matchedModelId: confirmedModelId,
        confidence: 100,
        objectType: confirmedModelId,
        confirmed: true,
        originalImageUrl: imageUrl,
        processedAt: new Date().toISOString()
      };

      await supabase.from("conversions").update({ model_data: modelData, status: "completed" }).eq("id", conversionId);
      
      console.log("=== CONVERSION COMPLETED (user confirmed) ===");
      return new Response(JSON.stringify({ success: true, modelData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Download and convert image to base64 for AI classification
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) throw new Error(`Failed to download image: ${imgResponse.status}`);
    const imgBuffer = await imgResponse.arrayBuffer();
    const imgBytes = new Uint8Array(imgBuffer);
    
    const contentType = imgResponse.headers.get("content-type") || "image/png";
    let binary = "";
    for (let i = 0; i < imgBytes.length; i++) binary += String.fromCharCode(imgBytes[i]);
    const dataUrl = `data:${contentType};base64,${btoa(binary)}`;

    // AI Classification - identify what the image shows
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a medical/anatomical image classifier. Analyze the uploaded image and identify which anatomical structure or organ it shows.

CRITICAL: Return ONLY valid JSON (no markdown, no code blocks).

Available models to match against:
- "heart" - Human heart (cardiac, cardiovascular)
- "brain" - Human brain (cerebral, cortex, neurology)
- "lungs" - Human lungs (pulmonary, respiratory)
- "kidney" - Human kidney (renal, nephron)
- "liver" - Human liver (hepatic, bile)
- "stomach" - Human stomach (gastric, digestive)
- "eye" - Human eye (retina, cornea, iris, optic)
- "ear" - Human ear (cochlea, tympanic, auditory)
- "skeleton" - Human skeleton (bone, skull, spine)
- "tooth" - Human tooth (dental, molar, enamel)
- "unknown" - If it doesn't match any of the above

Response format:
{
  "matchedModelId": "heart",
  "confidence": 92,
  "objectType": "Human Heart",
  "reasoning": "The image shows a four-chambered organ with visible atria and ventricles, consistent with a human heart.",
  "alternativeMatches": [
    { "modelId": "lungs", "confidence": 15, "reason": "Some vascular patterns visible" }
  ]
}`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Classify this image. Match it to the closest available 3D model. Return ONLY valid JSON." },
              { type: "image_url", image_url: { url: dataUrl } }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      if (response.status === 429) throw new Error("Rate limit exceeded. Please try again in a moment.");
      if (response.status === 402) throw new Error("API credits depleted.");
      throw new Error(`AI processing failed: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    let aiResult: any = {};
    try {
      let jsonStr = content || "{}";
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1];
      const lastBrace = jsonStr.lastIndexOf("}");
      if (lastBrace !== -1) jsonStr = jsonStr.substring(0, lastBrace + 1);
      aiResult = JSON.parse(jsonStr.trim());
      console.log("AI Classification:", aiResult.matchedModelId, "Confidence:", aiResult.confidence);
    } catch (e) {
      console.log("Parse error, defaulting to unknown");
      aiResult = {
        matchedModelId: "unknown",
        confidence: 0,
        objectType: "Unknown Object",
        reasoning: "Could not classify the image.",
        alternativeMatches: []
      };
    }

    const modelData = {
      matchedModelId: aiResult.matchedModelId || "unknown",
      confidence: aiResult.confidence || 0,
      objectType: aiResult.objectType || "Unknown Object",
      reasoning: aiResult.reasoning || "",
      alternativeMatches: aiResult.alternativeMatches || [],
      confirmed: false,
      originalImageUrl: imageUrl,
      processedAt: new Date().toISOString()
    };

    // Save as "classified" status - waiting for user confirmation
    await supabase.from("conversions").update({ 
      model_data: modelData, 
      status: "classified" 
    }).eq("id", conversionId);

    console.log("=== CLASSIFICATION COMPLETED ===");
    return new Response(JSON.stringify({ success: true, modelData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    if (conversionId && supabase) {
      try {
        await supabase.from("conversions").update({ 
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error"
        }).eq("id", conversionId);
      } catch (e) { console.error("Failed to update status:", e); }
    }
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
