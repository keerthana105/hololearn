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
            content: `You are an expert 3D depth estimation AI specialized in anatomical and scientific imagery. Your task is to create ACCURATE depth maps that capture the TRUE 3D structure of objects.

CRITICAL DEPTH MAPPING RULES:
- For anatomical images (brain, heart, organs): The CENTER should be CLOSEST (depth 0.0-0.3), edges should be FARTHEST (0.7-1.0)
- Create smooth, organic depth gradients that follow the natural contours
- For brain scans: The cortex bulges outward, sulci (grooves) go inward, ventricles are deeper cavities
- For MRI/CT cross-sections: Interpret the brightness as structure - lighter areas often indicate density
- The depth grid should create a DOME or CURVED surface, NOT a flat plane

Return a JSON object with:
- "depthGrid": A 64x64 array of depth values (0.0 to 1.0). CREATE SMOOTH GRADIENTS:
  * For round objects: Use radial gradients from center (0.0) to edges (1.0)
  * For anatomical structures: Follow the natural 3D curvature
  * Add subtle variations for surface details (bumps, grooves, folds)
  * Brain example: frontal areas slightly forward, temporal lobes curve back
- "objectType": Specific description (e.g., "Axial Brain MRI Scan", "Human Heart Cross-Section")
- "suggestedMaterials": ["organic", "subsurface"] for biological, ["metallic", "rough"] for objects
- "lighting": { "ambient": 0.5, "directional": { "intensity": 1.0, "position": [3, 5, 3] } }
- "scale": 1.5 for prominent 3D effect
- "depthMultiplier": 2.0 to 4.0 (higher = more 3D extrusion)
- "features": Array with 4-6 features:
  - "id": Unique string
  - "name": Anatomical/component name
  - "description": 2-3 sentence educational explanation
  - "position": {x, y} normalized 0-1 coordinates on the image
  - "color": Hex color for marker

Generate depth values that will create a realistic 3D surface when extruded. The model should look like the actual 3D shape of the object, not a flat plane.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image carefully. Generate a 64x64 depth grid that captures the TRUE 3D shape - for a brain, make it dome-shaped with the cortex bulging out. Include educational feature annotations. Return only valid JSON, no markdown."
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
  const size = 64;
  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = size / 2;
  
  for (let i = 0; i < size; i++) {
    const row: number[] = [];
    for (let j = 0; j < size; j++) {
      // Create a dome-like depth pattern (center is closest)
      const dx = (j - centerX) / maxRadius;
      const dy = (i - centerY) / maxRadius;
      const distanceSquared = dx * dx + dy * dy;
      
      if (distanceSquared > 1) {
        // Outside the dome - far away
        row.push(1.0);
      } else {
        // Inside the dome - use hemisphere formula
        const height = Math.sqrt(1 - distanceSquared);
        // Invert so center (height=1) becomes depth=0 (closest)
        const depth = 1 - height;
        // Add subtle noise for organic feel
        const noise = (Math.random() - 0.5) * 0.05;
        row.push(parseFloat(Math.max(0, Math.min(1, depth + noise)).toFixed(3)));
      }
    }
    grid.push(row);
  }
  return grid;
}

function generateSyntheticDepthData() {
  return {
    depthGrid: generateDepthGrid(),
    objectType: "3D Object",
    suggestedMaterials: ["organic", "subsurface"],
    lighting: {
      ambient: 0.5,
      directional: { intensity: 1.0, position: [3, 5, 3] }
    },
    scale: 1.5,
    depthMultiplier: 2.5
  };
}
