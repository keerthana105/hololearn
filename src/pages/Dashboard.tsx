import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Plus,
  Box,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Eye,
  Download,
} from "lucide-react";
import { exportToOBJ, exportToSTL, exportToGLTF, downloadFile } from "@/lib/exportUtils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Conversion {
  id: string;
  title: string;
  original_image_url: string;
  status: string;
  model_data: {
    depthGrid: number[][];
    scale?: number;
  } | null;
  created_at: string;
}

type ConversionRow = {
  id: string;
  title: string;
  original_image_url: string;
  status: string;
  model_data: unknown;
  created_at: string;
};

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchConversions();
    }
  }, [user]);

  const fetchConversions = async () => {
    try {
      const { data, error } = await supabase
        .from("conversions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setConversions((data || []).map((d: any) => ({
        id: d.id,
        title: d.title,
        original_image_url: d.original_image_url,
        status: d.status,
        model_data: d.model_data as Conversion['model_data'],
        created_at: d.created_at,
      })));
    } catch (error) {
      console.error("Failed to fetch conversions:", error);
      toast({
        title: "Error",
        description: "Failed to load your conversions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("conversions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setConversions(conversions.filter((c) => c.id !== id));
      toast({
        title: "Deleted",
        description: "Conversion has been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete conversion.",
        variant: "destructive",
      });
    }
  };

  const handleExport = (conversion: Conversion, format: "obj" | "gltf" | "stl") => {
    if (!conversion.model_data) return;

    try {
      const baseName = conversion.title || "hololearn_model";
      
      switch (format) {
        case "obj":
          downloadFile(exportToOBJ(conversion.model_data), `${baseName}.obj`, "text/plain");
          break;
        case "gltf":
          downloadFile(exportToGLTF(conversion.model_data), `${baseName}.gltf`, "application/json");
          break;
        case "stl":
          downloadFile(exportToSTL(conversion.model_data), `${baseName}.stl`, "application/octet-stream");
          break;
      }

      toast({
        title: "Export Successful",
        description: `Downloaded ${format.toUpperCase()} file.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export the model.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "processing":
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "processing":
        return "Processing";
      case "pending":
        return "Pending";
      case "failed":
        return "Failed";
      default:
        return status;
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold mb-1">
                Your <span className="text-glow">Dashboard</span>
              </h1>
              <p className="text-muted-foreground">
                Manage your 3D conversions and exports
              </p>
            </div>
            <Link to="/convert">
              <Button variant="hero" className="gap-2">
                <Plus className="w-4 h-4" />
                New Conversion
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total", value: conversions.length },
              { label: "Completed", value: conversions.filter((c) => c.status === "completed").length },
              { label: "Processing", value: conversions.filter((c) => c.status === "processing" || c.status === "pending").length },
              { label: "Failed", value: conversions.filter((c) => c.status === "failed").length },
            ].map((stat, i) => (
              <div key={i} className="card-glass rounded-xl p-4 text-center">
                <p className="text-2xl font-display font-bold text-primary">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Conversions Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : conversions.length === 0 ? (
            <div className="card-glass rounded-2xl p-12 text-center">
              <div className="w-20 h-20 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
                <Box className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-display font-semibold mb-2">No Conversions Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start by uploading your first image to convert
              </p>
              <Link to="/convert">
                <Button variant="hero">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First 3D Model
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {conversions.map((conversion) => (
                <div
                  key={conversion.id}
                  className="card-glass rounded-xl overflow-hidden group hover:scale-[1.02] transition-all duration-300"
                >
                  {/* Image */}
                  <div className="relative aspect-video bg-muted/20">
                    <img
                      src={conversion.original_image_url}
                      alt={conversion.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm text-xs">
                      {getStatusIcon(conversion.status)}
                      <span>{getStatusText(conversion.status)}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold mb-1 truncate">{conversion.title}</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      {new Date(conversion.created_at).toLocaleDateString()}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {conversion.status === "completed" && conversion.model_data && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExport(conversion, "obj")}
                            className="flex-1"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            OBJ
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExport(conversion, "gltf")}
                            className="flex-1"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            GLTF
                          </Button>
                        </>
                      )}
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Conversion?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{conversion.title}" and cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(conversion.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
