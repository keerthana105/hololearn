import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import ModelViewer from "@/components/ModelViewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, Loader2, Sparkles, Download, FileImage, Box, X, CheckCircle, Wand2, Mail, Send, ChevronDown, Search
} from "lucide-react";
import { exportToOBJ, exportToSTL, exportToGLTF, downloadFile } from "@/lib/exportUtils";
import { removeBackground, loadImage } from "@/lib/backgroundRemoval";

type ConversionStatus = "idle" | "uploading" | "removing-bg" | "classifying" | "classified" | "loading-model" | "completed" | "failed";

interface Feature {
  id: string;
  name: string;
  description: string;
  position: { x: number; y: number; z?: number };
  color: string;
}

interface ManifestModel {
  id: string;
  name: string;
  file: string;
  category: string;
  keywords: string[];
  features: Feature[];
}

interface ModelData {
  matchedModelId?: string;
  confidence?: number;
  objectType?: string;
  reasoning?: string;
  alternativeMatches?: { modelId: string; confidence: number; reason: string }[];
  confirmed?: boolean;
  features?: Feature[];
  originalImageUrl?: string;
}

// ====== Classification Result Card ======
function ClassificationResult({ 
  modelData, 
  manifest, 
  onConfirm, 
  onChangeModel 
}: { 
  modelData: ModelData; 
  manifest: ManifestModel[];
  onConfirm: (modelId: string) => void;
  onChangeModel: (modelId: string) => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const matchedModel = manifest.find(m => m.id === modelData.matchedModelId);
  const confidence = modelData.confidence || 0;

  return (
    <div className="card-glass rounded-xl p-4 animate-fade-in border-primary/30">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Search className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-primary">AI Classification Result</p>
          <p className="text-sm text-muted-foreground">{modelData.reasoning}</p>
        </div>
      </div>

      {/* Matched result */}
      <div className="bg-muted/30 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold">
            Detected: {matchedModel?.name || modelData.objectType}
            {confidence >= 80 ? " 🎯" : confidence >= 50 ? " 🤔" : " ❓"}
          </span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            confidence >= 80 ? 'bg-green-500/20 text-green-500' :
            confidence >= 50 ? 'bg-yellow-500/20 text-yellow-500' :
            'bg-red-500/20 text-red-500'
          }`}>
            {confidence}% confidence
          </span>
        </div>
      </div>

      {/* Alternative matches */}
      {modelData.alternativeMatches && modelData.alternativeMatches.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-1">Other possibilities:</p>
          <div className="flex flex-wrap gap-1">
            {modelData.alternativeMatches.map((alt) => (
              <button
                key={alt.modelId}
                onClick={() => onChangeModel(alt.modelId)}
                className="text-xs px-2 py-1 rounded-md bg-muted/50 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
              >
                {manifest.find(m => m.id === alt.modelId)?.name || alt.modelId} ({alt.confidence}%)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Model selector dropdown */}
      <div className="relative mb-3">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 border border-border hover:border-primary/50 text-sm transition-colors"
        >
          <span>{matchedModel?.name || "Select a model..."}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-xl z-20 max-h-[200px] overflow-y-auto">
            {manifest.map((model) => (
              <button
                key={model.id}
                onClick={() => { onChangeModel(model.id); setShowDropdown(false); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-primary/10 transition-colors ${
                  model.id === modelData.matchedModelId ? 'bg-primary/20 text-primary font-medium' : 'text-foreground'
                }`}
              >
                {model.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Confirm button */}
      <Button
        variant="hero"
        className="w-full gap-2"
        onClick={() => onConfirm(modelData.matchedModelId || "heart")}
      >
        <CheckCircle className="w-4 h-4" />
        Confirm & Load 3D Model
      </Button>
    </div>
  );
}

// ====== Completed Section ======
function CompletedSection({ title, conversionId, onExport }: { title: string; conversionId: string | null; onExport: (f: "obj" | "gltf" | "stl") => void }) {
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSendEmail = async () => {
    if (!conversionId) return;
    setEmailSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-model-email", {
        body: { conversionId, modelTitle: title || "Untitled Model" },
      });
      if (error) throw error;
      setEmailSent(true);
      toast({ title: "Email Sent!", description: data?.message || "Download link sent to your email." });
    } catch (err: any) {
      toast({ title: "Email Failed", description: err.message || "Could not send email.", variant: "destructive" });
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <div className="card-glass rounded-xl p-4 animate-fade-in border-primary/30">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-green-500" />
        </div>
        <div>
          <p className="font-medium text-green-500">3D Model Loaded!</p>
          <p className="text-sm text-muted-foreground">Interact with your model in the viewer</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Button variant="outline" onClick={() => onExport("obj")} className="flex-col h-auto py-3">
          <Download className="w-4 h-4 mb-1" /><span className="text-xs">OBJ</span>
        </Button>
        <Button variant="outline" onClick={() => onExport("gltf")} className="flex-col h-auto py-3">
          <Download className="w-4 h-4 mb-1" /><span className="text-xs">GLTF</span>
        </Button>
        <Button variant="outline" onClick={() => onExport("stl")} className="flex-col h-auto py-3">
          <Download className="w-4 h-4 mb-1" /><span className="text-xs">STL</span>
        </Button>
      </div>
      <Button variant="outline" className="w-full gap-2" onClick={handleSendEmail} disabled={emailSending || emailSent}>
        {emailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : emailSent ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Mail className="w-4 h-4" />}
        {emailSent ? "Email Sent!" : "Email Download Link"}
      </Button>
    </div>
  );
}

// ====== MAIN CONVERT PAGE ======
export default function Convert() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<ConversionStatus>("idle");
  const [modelData, setModelData] = useState<ModelData | null>(null);
  const [conversionId, setConversionId] = useState<string | null>(null);
  const [bgRemovalProgress, setBgRemovalProgress] = useState("");
  const [processedFile, setProcessedFile] = useState<File | null>(null);
  const [manifest, setManifest] = useState<ManifestModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  // Load manifest
  useEffect(() => {
    fetch("/models/manifest.json")
      .then(r => r.json())
      .then(data => setManifest(data.models || []))
      .catch(err => console.warn("Could not load model manifest:", err));
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      toast({ title: "Authentication Required", description: "Please sign in to convert images.", variant: "destructive" });
      navigate("/auth");
    }
  }, [user, authLoading, navigate, toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith("image/")) {
      toast({ title: "Invalid File", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({ title: "File Too Large", description: "Please select an image under 10MB.", variant: "destructive" });
      return;
    }
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
    setStatus("idle");
    setModelData(null);
    setSelectedModelId(null);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type.startsWith("image/")) {
      setFile(droppedFile);
      setPreview(URL.createObjectURL(droppedFile));
      setTitle(droppedFile.name.replace(/\.[^/.]+$/, ""));
      setStatus("idle");
      setModelData(null);
      setSelectedModelId(null);
    }
  }, []);

  const clearFile = () => {
    setFile(null); setPreview(null); setTitle(""); setStatus("idle");
    setModelData(null); setConversionId(null); setProcessedFile(null);
    setBgRemovalProgress(""); setSelectedModelId(null);
  };

  const handleRemoveBackground = async () => {
    if (!file) return;
    try {
      setStatus("removing-bg");
      setBgRemovalProgress("Loading AI model...");
      const img = await loadImage(file);
      const resultBlob = await removeBackground(img, setBgRemovalProgress);
      const processedFileObj = new File([resultBlob], `${title || "processed"}.png`, { type: "image/png" });
      setProcessedFile(processedFileObj);
      setPreview(URL.createObjectURL(resultBlob));
      setStatus("idle");
      toast({ title: "Background Removed", description: "Your image is ready for 3D conversion." });
    } catch (error) {
      console.error("Background removal failed:", error);
      setStatus("idle");
      toast({ title: "Background Removal Failed", description: "Proceeding with original image.", variant: "destructive" });
    }
  };

  // Step 1: Classify the image
  const handleClassify = async () => {
    if (!file || !user) return;
    try {
      setStatus("uploading");

      const fileToUpload = processedFile || file;
      const fileExt = processedFile ? "png" : file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from("uploads").upload(fileName, fileToUpload);
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage.from("uploads").getPublicUrl(fileName);

      const { data: conversion, error: insertError } = await supabase
        .from("conversions")
        .insert({ user_id: user.id, title: title || "Untitled", original_image_url: publicUrl, status: "pending" })
        .select().single();
      if (insertError) throw new Error(`Failed to create conversion: ${insertError.message}`);

      setConversionId(conversion.id);
      setStatus("classifying");

      // Call edge function for classification only
      const { data: result, error: funcError } = await supabase.functions.invoke("convert-to-3d", {
        body: { conversionId: conversion.id, imageUrl: publicUrl },
      });

      if (funcError) throw new Error(`Classification failed: ${funcError.message}`);
      if (result.error) throw new Error(result.error);

      const data = result.modelData;
      setModelData(data);
      setSelectedModelId(data.matchedModelId);
      setStatus("classified");

      toast({ title: "Image Classified!", description: `Detected: ${data.objectType} (${data.confidence}% confidence)` });
    } catch (error) {
      console.error("Classification error:", error);
      setStatus("failed");
      toast({ title: "Classification Failed", description: error instanceof Error ? error.message : "An error occurred.", variant: "destructive" });
    }
  };

  // Step 2: Confirm and load model
  const handleConfirmModel = async (modelId: string) => {
    setSelectedModelId(modelId);
    setStatus("loading-model");

    // Get features from manifest
    const manifestModel = manifest.find(m => m.id === modelId);
    const features = manifestModel?.features || [];

    const updatedModelData: ModelData = {
      ...modelData,
      matchedModelId: modelId,
      confirmed: true,
      objectType: manifestModel?.name || modelData?.objectType || "3D Model",
      features,
    };

    setModelData(updatedModelData);

    // Update conversion in DB
    if (conversionId) {
      try {
        await supabase.functions.invoke("convert-to-3d", {
          body: { conversionId, imageUrl: modelData?.originalImageUrl || "", confirmedModelId: modelId },
        });
      } catch (e) {
        console.warn("Failed to update conversion:", e);
      }
    }

    setStatus("completed");
    toast({ title: "3D Model Loaded!", description: `${manifestModel?.name || modelId} model is ready to explore.` });
  };

  const handleChangeModel = (modelId: string) => {
    setSelectedModelId(modelId);
    setModelData(prev => prev ? { ...prev, matchedModelId: modelId } : null);
  };

  const handleExport = (format: "obj" | "gltf" | "stl") => {
    if (!modelData) return;
    try {
      const timestamp = Date.now();
      const baseName = title || "hololearn_model";
      // Convert to export-compatible format
      const exportData = { shapeType: modelData.matchedModelId || "organic" };
      switch (format) {
        case "obj": downloadFile(exportToOBJ(exportData), `${baseName}_${timestamp}.obj`, "text/plain"); break;
        case "gltf": downloadFile(exportToGLTF(exportData), `${baseName}_${timestamp}.gltf`, "application/json"); break;
        case "stl": downloadFile(exportToSTL(exportData), `${baseName}_${timestamp}.stl`, "application/octet-stream"); break;
      }
      toast({ title: "Export Successful", description: `Downloaded as ${format.toUpperCase()}.` });
    } catch (error) {
      toast({ title: "Export Failed", description: "Please try again.", variant: "destructive" });
    }
  };

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const viewerModelData = modelData && selectedModelId ? {
    ...modelData,
    matchedModelId: selectedModelId,
  } : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-display font-bold mb-4">
              <span className="text-glow">Convert</span> Your Image
            </h1>
            <p className="text-muted-foreground text-lg">
              Upload a 2D image — AI classifies it and loads a professional 3D model
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Upload & Controls */}
            <div className="space-y-6">
              {/* Upload Area */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl p-8 transition-all ${
                  file ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/20"
                }`}
              >
                {!file ? (
                  <label className="flex flex-col items-center justify-center cursor-pointer py-12">
                    <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
                      <Upload className="w-10 h-10 text-primary" />
                    </div>
                    <p className="text-lg font-semibold mb-2">Drop your image here</p>
                    <p className="text-muted-foreground text-sm mb-4">or click to browse</p>
                    <p className="text-xs text-muted-foreground">Supports: JPG, PNG, WebP (max 10MB)</p>
                    <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  </label>
                ) : (
                  <div className="relative">
                    <button onClick={clearFile} className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:scale-110 transition-transform z-10">
                      <X className="w-4 h-4" />
                    </button>
                    <img src={preview!} alt="Preview" className="w-full h-64 object-contain rounded-xl bg-muted/20" />
                  </div>
                )}
              </div>

              {/* Title */}
              {file && (
                <div className="space-y-2 animate-fade-in">
                  <label className="text-sm font-medium text-muted-foreground">Model Title</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter a name for your model" className="bg-input border-border" />
                </div>
              )}

              {/* Background Removal */}
              {file && status === "idle" && !processedFile && (
                <Button variant="outline" className="w-full" onClick={handleRemoveBackground}>
                  <Wand2 className="w-5 h-5 mr-2" />Remove Background (Recommended)
                </Button>
              )}

              {status === "removing-bg" && (
                <div className="card-glass rounded-xl p-4 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Wand2 className="w-5 h-5 text-purple-500 animate-pulse" />
                    </div>
                    <div>
                      <p className="font-medium">Removing background...</p>
                      <p className="text-sm text-muted-foreground">{bgRemovalProgress || "Preparing AI model..."}</p>
                    </div>
                  </div>
                </div>
              )}

              {processedFile && status === "idle" && (
                <div className="card-glass rounded-xl p-4 animate-fade-in border-purple-500/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium text-purple-500">Background Removed!</p>
                      <p className="text-sm text-muted-foreground">Ready for AI classification</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Classify Button */}
              {file && status === "idle" && (
                <Button variant="hero" size="lg" className="w-full" onClick={handleClassify}>
                  <Sparkles className="w-5 h-5 mr-2" /> Analyze & Classify Image
                </Button>
              )}

              {/* Classification in progress */}
              {(status === "uploading" || status === "classifying") && (
                <div className="card-glass rounded-xl p-4 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                    </div>
                    <div>
                      <p className="font-medium">{status === "uploading" ? "Uploading image..." : "AI classifying..."}</p>
                      <p className="text-sm text-muted-foreground">Analyzing your image to find the best 3D model match</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Classification result - user confirms */}
              {status === "classified" && modelData && (
                <ClassificationResult
                  modelData={modelData}
                  manifest={manifest}
                  onConfirm={handleConfirmModel}
                  onChangeModel={handleChangeModel}
                />
              )}

              {/* Loading model */}
              {status === "loading-model" && (
                <div className="card-glass rounded-xl p-4 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <p className="font-medium">Loading 3D model...</p>
                  </div>
                </div>
              )}

              {/* Completed */}
              {status === "completed" && (
                <CompletedSection title={title} conversionId={conversionId} onExport={handleExport} />
              )}

              {/* Failed */}
              {status === "failed" && (
                <div className="card-glass rounded-xl p-4 animate-fade-in border-destructive/30">
                  <p className="text-destructive font-medium mb-2">Classification Failed</p>
                  <Button variant="outline" onClick={() => setStatus("idle")} className="w-full">Try Again</Button>
                </div>
              )}
            </div>

            {/* Right: 3D Viewer */}
            <div className="h-[500px] lg:h-[600px] lg:sticky lg:top-24">
              <ModelViewer
                modelData={viewerModelData}
                features={modelData?.features}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
