import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const { conversionId, imageUrl } = await req.json();
    
    console.log("Starting 3D conversion for:", conversionId);
    console.log("Image URL:", imageUrl);

    // Update status to processing
    await supabase
      .from("conversions")
      .update({ status: "processing" })
      .eq("id", conversionId);

    // Use AI to analyze the image and generate depth data
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
            content: `You are a 3D depth estimation and educational AI. Analyze the provided 2D image and generate depth map data for 3D reconstruction, along with educational feature annotations.
            
            Return a JSON object with:
            - "depthGrid": A 32x32 array of depth values (0.0 to 1.0, where 0 is closest and 1 is farthest)
            - "objectType": A description of the main object/scene (e.g., "Human Brain", "Heart", "Cell")
            - "suggestedMaterials": Array of material suggestions for 3D rendering
            - "lighting": Object with ambient and directional light suggestions
            - "scale": Suggested scale factor for the 3D model
            - "features": Array of feature annotations with:
              - "id": Unique identifier string
              - "name": Name of the feature/part (e.g., "Frontal Lobe", "Left Ventricle")
              - "description": Educational description of this part (2-3 sentences explaining function/importance)
              - "position": {x, y} normalized coordinates (0-1) indicating where this feature is located on the image
              - "color": Hex color for the hotspot marker
            
            Focus on identifying 3-6 key educational features/parts of the subject. For anatomical subjects, identify major structures. For objects, identify key components.
            Be creative but realistic in your depth estimation based on visual cues.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image and generate depth map data for 3D reconstruction with educational feature annotations. Return only valid JSON."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
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
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (response.status === 402) {
        throw new Error("API credits depleted. Please add credits.");
      }
      throw new Error(`AI processing failed: ${errorText}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    console.log("AI Response received");

    // Parse the AI response
    let modelData;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1] || content;
      modelData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.log("Generating synthetic depth data due to parse error");
      // Generate synthetic depth data if parsing fails
      modelData = generateSyntheticDepthData();
    }

    // Ensure we have a valid depth grid
    if (!modelData.depthGrid || !Array.isArray(modelData.depthGrid)) {
      modelData.depthGrid = generateDepthGrid();
    }

    // Add metadata
    modelData.processedAt = new Date().toISOString();
    modelData.originalImageUrl = imageUrl;

    // Update the conversion with the model data
    const { error: updateError } = await supabase
      .from("conversions")
      .update({
        model_data: modelData,
        status: "completed",
      })
      .eq("id", conversionId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw updateError;
    }

    console.log("Conversion completed successfully");

    return new Response(
      JSON.stringify({ success: true, modelData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in convert-to-3d function:", error);
    
    // Try to update the conversion status to failed
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      
      const { conversionId } = await req.json().catch(() => ({}));
      if (conversionId) {
        await supabase
          .from("conversions")
          .update({ 
            status: "failed",
            error_message: error instanceof Error ? error.message : "Unknown error"
          })
          .eq("id", conversionId);
      }
    } catch (e) {
      console.error("Failed to update error status:", e);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateDepthGrid(): number[][] {
  const grid: number[][] = [];
  for (let i = 0; i < 32; i++) {
    const row: number[] = [];
    for (let j = 0; j < 32; j++) {
      // Create a bowl-like depth pattern
      const centerX = 16;
      const centerY = 16;
      const distance = Math.sqrt(Math.pow(i - centerX, 2) + Math.pow(j - centerY, 2));
      const normalizedDistance = distance / 22;
      const depth = Math.min(1, Math.max(0, 0.3 + normalizedDistance * 0.5 + Math.random() * 0.1));
      row.push(parseFloat(depth.toFixed(3)));
    }
    grid.push(row);
  }
  return grid;
}

function generateSyntheticDepthData() {
  return {
    depthGrid: generateDepthGrid(),
    objectType: "3D Object",
    suggestedMaterials: ["standard", "metallic"],
    lighting: {
      ambient: 0.4,
      directional: { intensity: 0.8, position: [5, 5, 5] }
    },
    scale: 1.0
  };
}
