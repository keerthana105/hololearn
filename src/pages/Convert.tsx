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
  Upload, 
  Loader2, 
  Sparkles, 
  Download, 
  FileImage,
  Box,
  X,
  CheckCircle,
  Wand2
} from "lucide-react";
import { exportToOBJ, exportToSTL, exportToGLTF, downloadFile } from "@/lib/exportUtils";
import { removeBackground, loadImage } from "@/lib/backgroundRemoval";

type ConversionStatus = "idle" | "uploading" | "removing-bg" | "processing" | "completed" | "failed";

interface Feature {
  id: string;
  name: string;
  description: string;
  position: { x: number; y: number };
  color: string;
}

interface ModelData {
  depthGrid: number[][];
  objectType?: string;
  suggestedMaterials?: string[];
  lighting?: {
    ambient?: number;
    directional?: { intensity: number; position: number[] };
  };
  scale?: number;
  features?: Feature[];
}

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
  const [bgRemovalProgress, setBgRemovalProgress] = useState<string>("");
  const [processedFile, setProcessedFile] = useState<File | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to convert images.",
        variant: "destructive",
      });
      navigate("/auth");
    }
  }, [user, authLoading, navigate, toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image under 10MB.",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
    setStatus("idle");
    setModelData(null);
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
    }
  }, []);

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setTitle("");
    setStatus("idle");
    setModelData(null);
    setConversionId(null);
    setProcessedFile(null);
    setBgRemovalProgress("");
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
      
      toast({
        title: "Background Removed",
        description: "Your image is ready for 3D conversion.",
      });
    } catch (error) {
      console.error("Background removal failed:", error);
      setStatus("idle");
      toast({
        title: "Background Removal Failed",
        description: "Proceeding with original image. The AI will try to focus on the main subject.",
        variant: "destructive",
      });
    }
  };

  const handleConvert = async () => {
    if (!file || !user) return;

    try {
      setStatus("uploading");

      // Use processed file if available, otherwise use original
      const fileToUpload = processedFile || file;
      const fileExt = processedFile ? "png" : file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(fileName, fileToUpload);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("uploads")
        .getPublicUrl(fileName);

      // Create conversion record
      const { data: conversion, error: insertError } = await supabase
        .from("conversions")
        .insert({
          user_id: user.id,
          title: title || "Untitled",
          original_image_url: publicUrl,
          status: "pending",
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create conversion: ${insertError.message}`);
      }

      setConversionId(conversion.id);
      setStatus("processing");

      // Call edge function
      const { data: result, error: funcError } = await supabase.functions.invoke(
        "convert-to-3d",
        {
          body: {
            conversionId: conversion.id,
            imageUrl: publicUrl,
          },
        }
      );

      if (funcError) {
        throw new Error(`Processing failed: ${funcError.message}`);
      }

      if (result.error) {
        throw new Error(result.error);
      }

      setModelData(result.modelData);
      setStatus("completed");
      
      toast({
        title: "Conversion Complete!",
        description: "Your 3D model is ready to view and export.",
      });

    } catch (error) {
      console.error("Conversion error:", error);
      setStatus("failed");
      toast({
        title: "Conversion Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleExport = (format: "obj" | "gltf" | "stl") => {
    if (!modelData) return;

    try {
      const timestamp = Date.now();
      const baseName = title || "hololearn_model";
      
      switch (format) {
        case "obj":
          downloadFile(exportToOBJ(modelData), `${baseName}_${timestamp}.obj`, "text/plain");
          break;
        case "gltf":
          downloadFile(exportToGLTF(modelData), `${baseName}_${timestamp}.gltf`, "application/json");
          break;
        case "stl":
          downloadFile(exportToSTL(modelData), `${baseName}_${timestamp}.stl`, "application/octet-stream");
          break;
      }

      toast({
        title: "Export Successful",
        description: `Your model has been downloaded as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export the model. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-display font-bold mb-4">
              <span className="text-glow">Convert</span> Your Image
            </h1>
            <p className="text-muted-foreground text-lg">
              Upload a 2D image and watch it transform into an interactive 3D model
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <div className="space-y-6">
              {/* Upload Area */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl p-8 transition-all ${
                  file
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/20"
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
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative">
                    <button
                      onClick={clearFile}
                      className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:scale-110 transition-transform z-10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <img
                      src={preview!}
                      alt="Preview"
                      className="w-full h-64 object-contain rounded-xl bg-muted/20"
                    />
                  </div>
                )}
              </div>

              {/* Title Input */}
              {file && (
                <div className="space-y-2 animate-fade-in">
                  <label className="text-sm font-medium text-muted-foreground">Model Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a name for your model"
                    className="bg-input border-border"
                  />
                </div>
              )}

              {/* Background Removal Button */}
              {file && status === "idle" && !processedFile && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleRemoveBackground}
                >
                  <Wand2 className="w-5 h-5 mr-2" />
                  Remove Background (Recommended)
                </Button>
              )}

              {/* Background Removal Status */}
              {status === "removing-bg" && (
                <div className="card-glass rounded-xl p-4 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Wand2 className="w-5 h-5 text-purple-500 animate-pulse" />
                    </div>
                    <div>
                      <p className="font-medium">Removing background...</p>
                      <p className="text-sm text-muted-foreground">
                        {bgRemovalProgress || "Preparing AI model..."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Background Removed Success */}
              {processedFile && status === "idle" && (
                <div className="card-glass rounded-xl p-4 animate-fade-in border-purple-500/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium text-purple-500">Background Removed!</p>
                      <p className="text-sm text-muted-foreground">
                        Ready for clearer 3D conversion
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Convert Button */}
              {file && status !== "completed" && status !== "removing-bg" && (
                <Button
                  variant="hero"
                  size="xl"
                  className="w-full"
                  onClick={handleConvert}
                  disabled={status === "uploading" || status === "processing"}
                >
                  {status === "uploading" ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Uploading...
                    </>
                  ) : status === "processing" ? (
                    <>
                      <Sparkles className="w-5 h-5 animate-pulse" />
                      AI Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Convert to 3D
                    </>
                  )}
                </Button>
              )}

              {/* Status Messages */}
              {status === "processing" && (
                <div className="card-glass rounded-xl p-4 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                    </div>
                    <div>
                      <p className="font-medium">Processing your image...</p>
                      <p className="text-sm text-muted-foreground">
                        Our AI is analyzing depth, geometry and features
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {status === "completed" && (
                <div className="card-glass rounded-xl p-4 animate-fade-in border-primary/30">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium text-green-500">Conversion Complete!</p>
                      <p className="text-sm text-muted-foreground">
                        Your 3D model is ready
                      </p>
                    </div>
                  </div>
                  
                  {/* Export Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleExport("obj")}
                      className="flex-col h-auto py-3"
                    >
                      <Download className="w-4 h-4 mb-1" />
                      <span className="text-xs">OBJ</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleExport("gltf")}
                      className="flex-col h-auto py-3"
                    >
                      <Download className="w-4 h-4 mb-1" />
                      <span className="text-xs">GLTF</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleExport("stl")}
                      className="flex-col h-auto py-3"
                    >
                      <Download className="w-4 h-4 mb-1" />
                      <span className="text-xs">STL</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* 3D Viewer Section */}
            <div className="card-glass rounded-2xl overflow-hidden gradient-border min-h-[500px]">
              {modelData ? (
                <ModelViewer modelData={modelData} />
              ) : (
                <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center text-center p-8">
                  <div className="w-24 h-24 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
                    <Box className="w-12 h-12 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground font-medium mb-2">3D Preview</p>
                  <p className="text-sm text-muted-foreground/70">
                    Your converted 3D model will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
