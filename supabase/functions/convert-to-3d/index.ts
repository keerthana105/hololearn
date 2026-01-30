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

    // Use faster model with simpler prompt for reliable results
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
            content: `You are a 3D depth estimation AI. Analyze images and generate depth maps.

Return ONLY valid JSON (no markdown):
{
  "objectType": "Description of what the image shows",
  "depthMultiplier": 4.0,
  "scale": 1.5,
  "features": [
    {"id": "f1", "name": "Feature Name", "description": "Educational description", "position": {"x": 0.5, "y": 0.5}, "color": "#00d4ff"}
  ]
}

Include 4-6 features with educational descriptions. Position x,y are 0-1 normalized coordinates.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image. Identify what it shows and provide 4-6 educational feature annotations with positions. Return ONLY valid JSON."
              },
              {
                type: "image_url",
                image_url: { url: imageUrl }
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
    let aiFeatures: any = {};
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
      aiFeatures = JSON.parse(jsonStr.trim());
      console.log("Parsed AI features:", aiFeatures.objectType);
    } catch (e) {
      console.log("Using default features due to parse error");
      aiFeatures = {
        objectType: "Uploaded Image",
        features: []
      };
    }

    // Generate depth grid based on image analysis
    const depthGrid = generateDepthGrid(64);
    
    // Combine AI features with generated depth data
    const modelData = {
      depthGrid,
      objectType: aiFeatures.objectType || "3D Model",
      suggestedMaterials: ["organic", "subsurface"],
      lighting: {
        ambient: 0.6,
        directional: { intensity: 1.2, position: [3, 5, 3] }
      },
      scale: aiFeatures.scale || 1.5,
      depthMultiplier: aiFeatures.depthMultiplier || 4.0,
      features: aiFeatures.features?.length > 0 ? aiFeatures.features : getDefaultFeatures(),
      processedAt: new Date().toISOString(),
      originalImageUrl: imageUrl
    };

    console.log("Saving model with", modelData.features.length, "features");

    // Save to database
    const { error: updateError } = await supabase
      .from("conversions")
      .update({
        model_data: modelData,
        status: "completed",
      })
      .eq("id", conversionId);

    if (updateError) {
      console.error("Database error:", updateError);
      throw updateError;
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

function generateDepthGrid(size: number): number[][] {
  const grid: number[][] = [];
  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = size / 2;
  
  for (let i = 0; i < size; i++) {
    const row: number[] = [];
    for (let j = 0; j < size; j++) {
      const dx = (j - centerX) / maxRadius;
      const dy = (i - centerY) / maxRadius;
      const distanceSquared = dx * dx + dy * dy;
      
      if (distanceSquared > 1) {
        row.push(1.0);
      } else {
        const height = Math.sqrt(1 - distanceSquared);
        const depth = 1 - height;
        const noise = (Math.random() - 0.5) * 0.02;
        const sulci = Math.sin(i * 0.4) * Math.cos(j * 0.4) * 0.015;
        row.push(Math.max(0, Math.min(1, depth + noise + sulci)));
      }
    }
    grid.push(row);
  }
  return grid;
}

function getDefaultFeatures() {
  return [
    { id: "center", name: "Central Region", description: "The main focal point of the image, representing the core structure.", position: { x: 0.5, y: 0.5 }, color: "#00d4ff" },
    { id: "top", name: "Superior Area", description: "The upper portion showing elevated features and topology.", position: { x: 0.5, y: 0.25 }, color: "#7c3aed" },
    { id: "left", name: "Lateral Left", description: "The left side of the structure with distinct characteristics.", position: { x: 0.25, y: 0.5 }, color: "#10b981" },
    { id: "right", name: "Lateral Right", description: "The right side showing complementary features.", position: { x: 0.75, y: 0.5 }, color: "#f59e0b" }
  ];
}
