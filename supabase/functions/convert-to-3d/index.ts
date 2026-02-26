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

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const body = await req.json();
    conversionId = body.conversionId;
    const imageUrl = body.imageUrl;
    
    if (!conversionId || !imageUrl) {
      throw new Error("Missing required fields: conversionId and imageUrl");
    }
    
    console.log("=== STARTING 3D CONVERSION ===");
    console.log("Conversion ID:", conversionId);

    // Update status to processing
    await supabase
      .from("conversions")
      .update({ status: "processing" })
      .eq("id", conversionId);

    // Download the image and convert to base64 data URL
    console.log("Downloading image from:", imageUrl);
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) {
      throw new Error(`Failed to download image: ${imgResponse.status}`);
    }
    const imgBuffer = await imgResponse.arrayBuffer();
    const imgBytes = new Uint8Array(imgBuffer);
    
    // Determine MIME type from URL or response
    const contentType = imgResponse.headers.get("content-type") || 
      (imageUrl.endsWith(".png") ? "image/png" : 
       imageUrl.endsWith(".jpg") || imageUrl.endsWith(".jpeg") ? "image/jpeg" : 
       imageUrl.endsWith(".webp") ? "image/webp" : "image/png");
    
    // Convert to base64
    let binary = "";
    for (let i = 0; i < imgBytes.length; i++) {
      binary += String.fromCharCode(imgBytes[i]);
    }
    const base64 = btoa(binary);
    const dataUrl = `data:${contentType};base64,${base64}`;
    console.log("Image converted to base64, size:", imgBytes.length, "type:", contentType);

    // Use AI to identify the object and determine appropriate 3D shape
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
            content: `You are a 3D shape identification AI for educational anatomy visualization.

Your task: Analyze the image and identify what 3D shape should be generated.

Return ONLY valid JSON (no markdown):
{
  "objectType": "Human Heart" or "Human Brain" or descriptive name,
  "shapeType": "heart" | "brain" | "lung" | "kidney" | "organ",
  "geometryParams": {
    "scale": 1.0,
    "detailLevel": 48,
    "asymmetry": 0.0
  },
  "features": [
    {
      "id": "unique_id",
      "name": "Feature Name",
      "description": "Educational description of this anatomical feature",
      "position": { "x": 0.5, "y": 0.5 },
      "color": "#00d4ff"
    }
  ]
}

Shape Types:
- "heart": Human heart - will generate parametric heart with chambers, vessels
- "brain": Human brain - will generate ellipsoid with sulci/gyri texture
- "lung": Lungs - will generate elongated lobed shapes
- "kidney": Kidney - will generate bean-shaped with hilum
- "organ": Generic organic shape for any other anatomy

Include 4-6 educational features with accurate anatomical descriptions.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image. Identify the anatomical structure and return the appropriate shapeType with educational features. Return ONLY valid JSON."
              },
              {
                type: "image_url",
                image_url: { url: dataUrl }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
      if (response.status === 402) {
        throw new Error("API credits depleted.");
      }
      throw new Error(`AI processing failed: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    console.log("AI Response received");

    // Parse AI response or use defaults
    let aiResult: any = {};
    try {
      let jsonStr = content || "{}";
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      // Clean up any trailing content after JSON
      const lastBrace = jsonStr.lastIndexOf("}");
      if (lastBrace !== -1) {
        jsonStr = jsonStr.substring(0, lastBrace + 1);
      }
      aiResult = JSON.parse(jsonStr.trim());
      console.log("Parsed AI result:", aiResult.objectType, "Shape:", aiResult.shapeType);
    } catch (e) {
      console.log("Using default shape due to parse error");
      aiResult = {
        objectType: "3D Model",
        shapeType: "organ",
        geometryParams: { scale: 1.0, detailLevel: 48 },
        features: []
      };
    }

    // Build model data with shape-based approach (no depth grid needed)
    const shapeType = aiResult.shapeType || "organ";
    const features = aiResult.features?.length > 0 ? aiResult.features : getDefaultFeatures(shapeType);
    
    const modelData = {
      shapeType,
      objectType: aiResult.objectType || "3D Model",
      geometryParams: {
        scale: aiResult.geometryParams?.scale || 1.0,
        detailLevel: aiResult.geometryParams?.detailLevel || 48,
        asymmetry: aiResult.geometryParams?.asymmetry || 0
      },
      features,
      originalImageUrl: imageUrl,
      processedAt: new Date().toISOString()
    };

    console.log("Saving model - Shape:", shapeType, "Features:", features.length);

    // Save to database
    const { error: updateError } = await supabase
      .from("conversions")
      .update({
        model_data: modelData,
        status: "completed",
      })
      .eq("id", conversionId);

    if (updateError) {
      console.error("Database update error (non-fatal):", updateError);
      // Still return the model data even if DB save fails
    }

    console.log("=== CONVERSION COMPLETED ===");

    return new Response(
      JSON.stringify({ success: true, modelData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    
    if (conversionId && supabase) {
      try {
        await supabase
          .from("conversions")
          .update({ 
            status: "failed",
            error_message: error instanceof Error ? error.message : "Unknown error"
          })
          .eq("id", conversionId);
      } catch (e) {
        console.error("Failed to update status:", e);
      }
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getDefaultFeatures(shapeType: string) {
  switch (shapeType) {
    case "heart":
      return [
        { id: "ra", name: "Right Atrium", description: "Upper right chamber that receives deoxygenated blood from the body via the superior and inferior vena cava.", position: { x: 0.7, y: 0.35 }, color: "#3b82f6" },
        { id: "la", name: "Left Atrium", description: "Upper left chamber that receives oxygenated blood from the lungs via the pulmonary veins.", position: { x: 0.3, y: 0.35 }, color: "#ef4444" },
        { id: "rv", name: "Right Ventricle", description: "Lower right chamber that pumps deoxygenated blood to the lungs through the pulmonary artery.", position: { x: 0.65, y: 0.65 }, color: "#6366f1" },
        { id: "lv", name: "Left Ventricle", description: "The most muscular chamber, pumps oxygenated blood to the entire body through the aorta.", position: { x: 0.35, y: 0.65 }, color: "#dc2626" },
        { id: "aorta", name: "Aorta", description: "The largest artery in the body, carries oxygenated blood from the left ventricle to the rest of the body.", position: { x: 0.5, y: 0.15 }, color: "#f59e0b" }
      ];
    
    case "brain":
      return [
        { id: "frontal", name: "Frontal Lobe", description: "Controls executive functions, decision making, problem solving, and voluntary movement.", position: { x: 0.5, y: 0.25 }, color: "#8b5cf6" },
        { id: "parietal", name: "Parietal Lobe", description: "Processes sensory information including touch, temperature, and spatial awareness.", position: { x: 0.5, y: 0.45 }, color: "#06b6d4" },
        { id: "temporal", name: "Temporal Lobe", description: "Processes auditory information, memory formation, and language comprehension.", position: { x: 0.2, y: 0.55 }, color: "#10b981" },
        { id: "occipital", name: "Occipital Lobe", description: "Primary visual processing center, interprets information from the eyes.", position: { x: 0.5, y: 0.75 }, color: "#f43f5e" },
        { id: "cerebellum", name: "Cerebellum", description: "Coordinates voluntary movements, balance, posture, and motor learning.", position: { x: 0.5, y: 0.9 }, color: "#eab308" }
      ];
    
    case "lung":
    case "lungs":
      return [
        { id: "upper_right", name: "Right Upper Lobe", description: "The uppermost section of the right lung, separated by the horizontal fissure.", position: { x: 0.7, y: 0.25 }, color: "#60a5fa" },
        { id: "middle_right", name: "Right Middle Lobe", description: "Unique to the right lung, located between the horizontal and oblique fissures.", position: { x: 0.7, y: 0.5 }, color: "#34d399" },
        { id: "lower_right", name: "Right Lower Lobe", description: "The largest lobe of the right lung, extends to the base of the lung.", position: { x: 0.7, y: 0.75 }, color: "#a78bfa" },
        { id: "upper_left", name: "Left Upper Lobe", description: "Contains the cardiac notch to accommodate the heart.", position: { x: 0.3, y: 0.3 }, color: "#f472b6" },
        { id: "lower_left", name: "Left Lower Lobe", description: "The lower portion of the left lung, separated by the oblique fissure.", position: { x: 0.3, y: 0.7 }, color: "#fbbf24" }
      ];
    
    case "kidney":
      return [
        { id: "cortex", name: "Renal Cortex", description: "The outer region containing glomeruli and convoluted tubules for initial blood filtration.", position: { x: 0.3, y: 0.5 }, color: "#ef4444" },
        { id: "medulla", name: "Renal Medulla", description: "Contains the renal pyramids and loops of Henle, concentrates urine.", position: { x: 0.5, y: 0.5 }, color: "#f97316" },
        { id: "pelvis", name: "Renal Pelvis", description: "Funnel-shaped structure that collects urine and channels it to the ureter.", position: { x: 0.7, y: 0.5 }, color: "#eab308" },
        { id: "hilum", name: "Hilum", description: "The indentation where blood vessels, nerves, and ureter enter/exit the kidney.", position: { x: 0.85, y: 0.5 }, color: "#22c55e" }
      ];
    
    default:
      return [
        { id: "center", name: "Central Region", description: "The main focal point of the anatomical structure.", position: { x: 0.5, y: 0.5 }, color: "#00d4ff" },
        { id: "superior", name: "Superior Area", description: "The upper portion of the structure.", position: { x: 0.5, y: 0.25 }, color: "#7c3aed" },
        { id: "inferior", name: "Inferior Area", description: "The lower portion of the structure.", position: { x: 0.5, y: 0.75 }, color: "#10b981" },
        { id: "lateral", name: "Lateral Region", description: "The side portions of the structure.", position: { x: 0.25, y: 0.5 }, color: "#f59e0b" }
      ];
  }
}
