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
    
    if (!conversionId || !imageUrl) throw new Error("Missing required fields: conversionId and imageUrl");
    
    console.log("=== STARTING 3D CONVERSION ===");

    await supabase.from("conversions").update({ status: "processing" }).eq("id", conversionId);

    // Download and convert image to base64
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) throw new Error(`Failed to download image: ${imgResponse.status}`);
    const imgBuffer = await imgResponse.arrayBuffer();
    const imgBytes = new Uint8Array(imgBuffer);
    
    const contentType = imgResponse.headers.get("content-type") || "image/png";
    let binary = "";
    for (let i = 0; i < imgBytes.length; i++) binary += String.fromCharCode(imgBytes[i]);
    const dataUrl = `data:${contentType};base64,${btoa(binary)}`;

    // Step 1: Classify the image and generate a depth grid
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
            content: `You are a 3D model generation AI. Analyze the uploaded image and generate data for creating a 3D model.

CRITICAL: Return ONLY valid JSON (no markdown, no code blocks, no extra text).

Your response format:
{
  "objectType": "Descriptive name of the object (e.g., Human Heart, Golden Retriever, Sports Car)",
  "category": "anatomy" | "animal" | "vehicle" | "object" | "architecture" | "nature" | "food" | "other",
  "shapeType": "heart" | "brain" | "lung" | "kidney" | "sphere" | "cylinder" | "box" | "relief",
  "geometryParams": {
    "scale": 1.0,
    "detailLevel": 64,
    "depthMultiplier": 1.5,
    "aspectRatio": [1.0, 1.0, 0.5]
  },
  "depthGrid": [[0.5, 0.6, ...], ...],
  "features": [
    {
      "id": "unique_id",
      "name": "Feature Name",
      "description": "Educational/descriptive text about this part",
      "position": { "x": 0.5, "y": 0.5 },
      "color": "#00d4ff"
    }
  ]
}

SHAPE TYPE RULES:
- Heart (anatomical) → "heart"
- Brain → "brain"
- Lungs → "lung"  
- Kidney → "kidney"
- Round/spherical objects → "sphere"
- Tall/elongated objects → "cylinder"
- Boxy/rectangular objects → "box"
- Everything else (flat images, photos, artwork) → "relief"

DEPTH GRID RULES:
- Generate a 16x16 grid of depth values between 0.0 and 1.0
- 0.0 = closest to viewer (foreground), 1.0 = farthest (background)
- The grid should represent the actual depth/shape of the object in the image
- For anatomy: map the 3D structure (e.g., heart chambers bulge forward)
- For flat images: create a subtle relief effect based on content
- For objects: estimate the 3D depth from the 2D view
- Each row is an array of 16 floats

FEATURES:
- Include 4-6 labeled features with accurate descriptions
- For anatomy: use medical/educational descriptions
- For other objects: describe key parts/components
- Position is normalized 0-1 (x=left-right, y=top-bottom)

Be accurate with the depth grid - it directly controls the 3D shape quality.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this image. Generate the depth grid, classify it, and create feature annotations. Return ONLY valid JSON." },
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
      console.log("Parsed AI result:", aiResult.objectType, "Shape:", aiResult.shapeType, "Category:", aiResult.category);
    } catch (e) {
      console.log("Parse error, using defaults");
      aiResult = {
        objectType: "3D Model",
        category: "other",
        shapeType: "relief",
        geometryParams: { scale: 1.0, detailLevel: 48, depthMultiplier: 1.0 },
        depthGrid: generateDefaultDepthGrid(),
        features: []
      };
    }

    // Validate and fix depth grid
    let depthGrid = aiResult.depthGrid;
    if (!Array.isArray(depthGrid) || depthGrid.length < 4) {
      depthGrid = generateDefaultDepthGrid();
    } else {
      // Ensure all values are valid numbers between 0-1
      depthGrid = depthGrid.map((row: any) => {
        if (!Array.isArray(row)) return new Array(16).fill(0.5);
        return row.map((v: any) => {
          const n = Number(v);
          return isNaN(n) ? 0.5 : Math.max(0, Math.min(1, n));
        });
      });
    }

    const shapeType = aiResult.shapeType || "relief";
    const features = aiResult.features?.length > 0 ? aiResult.features : getDefaultFeatures(shapeType, aiResult.category);
    
    const modelData = {
      shapeType,
      category: aiResult.category || "other",
      objectType: aiResult.objectType || "3D Model",
      geometryParams: {
        scale: aiResult.geometryParams?.scale || 1.0,
        detailLevel: aiResult.geometryParams?.detailLevel || 64,
        depthMultiplier: aiResult.geometryParams?.depthMultiplier || 1.5,
        aspectRatio: aiResult.geometryParams?.aspectRatio || [1, 1, 0.5],
      },
      depthGrid,
      features,
      originalImageUrl: imageUrl,
      processedAt: new Date().toISOString()
    };

    console.log("Saving model - Shape:", shapeType, "DepthGrid:", depthGrid.length, "x", depthGrid[0]?.length, "Features:", features.length);

    const { error: updateError } = await supabase
      .from("conversions")
      .update({ model_data: modelData, status: "completed" })
      .eq("id", conversionId);

    if (updateError) console.error("Database update error:", updateError);

    console.log("=== CONVERSION COMPLETED ===");
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

function generateDefaultDepthGrid(): number[][] {
  const size = 16;
  const grid: number[][] = [];
  for (let y = 0; y < size; y++) {
    const row: number[] = [];
    for (let x = 0; x < size; x++) {
      const cx = (x / (size - 1)) * 2 - 1;
      const cy = (y / (size - 1)) * 2 - 1;
      const dist = Math.sqrt(cx * cx + cy * cy);
      row.push(Math.max(0, 1 - dist));
    }
    grid.push(row);
  }
  return grid;
}

function getDefaultFeatures(shapeType: string, category?: string) {
  switch (shapeType) {
    case "heart":
      return [
        { id: "ra", name: "Right Atrium", description: "Receives deoxygenated blood from the body via the vena cava.", position: { x: 0.7, y: 0.35 }, color: "#3b82f6" },
        { id: "la", name: "Left Atrium", description: "Receives oxygenated blood from the lungs via pulmonary veins.", position: { x: 0.3, y: 0.35 }, color: "#ef4444" },
        { id: "rv", name: "Right Ventricle", description: "Pumps deoxygenated blood to the lungs through the pulmonary artery.", position: { x: 0.65, y: 0.65 }, color: "#6366f1" },
        { id: "lv", name: "Left Ventricle", description: "The most muscular chamber, pumps oxygenated blood to the entire body.", position: { x: 0.35, y: 0.65 }, color: "#dc2626" },
        { id: "aorta", name: "Aorta", description: "The largest artery, carries oxygenated blood from the left ventricle.", position: { x: 0.5, y: 0.15 }, color: "#f59e0b" }
      ];
    case "brain":
      return [
        { id: "frontal", name: "Frontal Lobe", description: "Controls executive functions, decision making, and voluntary movement.", position: { x: 0.5, y: 0.25 }, color: "#8b5cf6" },
        { id: "parietal", name: "Parietal Lobe", description: "Processes sensory information including touch and spatial awareness.", position: { x: 0.5, y: 0.45 }, color: "#06b6d4" },
        { id: "temporal", name: "Temporal Lobe", description: "Processes auditory information, memory, and language.", position: { x: 0.2, y: 0.55 }, color: "#10b981" },
        { id: "occipital", name: "Occipital Lobe", description: "Primary visual processing center.", position: { x: 0.5, y: 0.75 }, color: "#f43f5e" },
        { id: "cerebellum", name: "Cerebellum", description: "Coordinates balance, posture, and motor learning.", position: { x: 0.5, y: 0.9 }, color: "#eab308" }
      ];
    case "lung": case "lungs":
      return [
        { id: "upper_right", name: "Right Upper Lobe", description: "Uppermost section of the right lung.", position: { x: 0.7, y: 0.25 }, color: "#60a5fa" },
        { id: "middle_right", name: "Right Middle Lobe", description: "Between horizontal and oblique fissures.", position: { x: 0.7, y: 0.5 }, color: "#34d399" },
        { id: "lower_right", name: "Right Lower Lobe", description: "Extends to the base of the lung.", position: { x: 0.7, y: 0.75 }, color: "#a78bfa" },
        { id: "upper_left", name: "Left Upper Lobe", description: "Contains the cardiac notch.", position: { x: 0.3, y: 0.3 }, color: "#f472b6" },
        { id: "lower_left", name: "Left Lower Lobe", description: "Separated by the oblique fissure.", position: { x: 0.3, y: 0.7 }, color: "#fbbf24" }
      ];
    case "kidney":
      return [
        { id: "cortex", name: "Renal Cortex", description: "Outer region for initial blood filtration.", position: { x: 0.3, y: 0.5 }, color: "#ef4444" },
        { id: "medulla", name: "Renal Medulla", description: "Contains pyramids and loops of Henle.", position: { x: 0.5, y: 0.5 }, color: "#f97316" },
        { id: "pelvis", name: "Renal Pelvis", description: "Collects urine and channels it to the ureter.", position: { x: 0.7, y: 0.5 }, color: "#eab308" },
        { id: "hilum", name: "Hilum", description: "Where blood vessels and ureter enter/exit.", position: { x: 0.85, y: 0.5 }, color: "#22c55e" }
      ];
    default:
      return [
        { id: "center", name: "Center", description: "The main focal point of the subject.", position: { x: 0.5, y: 0.5 }, color: "#00d4ff" },
        { id: "top", name: "Top Region", description: "Upper portion of the subject.", position: { x: 0.5, y: 0.2 }, color: "#7c3aed" },
        { id: "bottom", name: "Bottom Region", description: "Lower portion of the subject.", position: { x: 0.5, y: 0.8 }, color: "#10b981" },
        { id: "left", name: "Left Side", description: "Left portion of the subject.", position: { x: 0.2, y: 0.5 }, color: "#f59e0b" }
      ];
  }
}
