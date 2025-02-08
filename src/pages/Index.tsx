
import { useState } from "react";
import { Camera, X, Share2, ArrowRight, Upload, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface CardAnalysis {
  grade: number;
  centering: number;
  corners: number;
  surface: number;
  edges: number;
}

interface EbaySale {
  price: number;
  date: string;
  condition: string;
}

const Index = () => {
  const [images, setImages] = useState<{
    front: string | null;
    back: string | null;
  }>({
    front: null,
    back: null,
  });
  const [analysis, setAnalysis] = useState<CardAnalysis | null>(null);
  const [salesHistory, setSalesHistory] = useState<EbaySale[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [setList, setSetList] = useState<File | null>(null);

  const handleCapture = (type: "front" | "back") => {
    // In production, this would use the device camera
    const mockImage = `https://via.placeholder.com/400x600?text=${type}`;
    setImages((prev) => ({ ...prev, [type]: mockImage }));

    // If both images are captured, trigger analysis
    if (type === "back" && images.front || type === "front" && images.back) {
      analyzeCard();
    }
  };

  const removeImage = (type: "front" | "back") => {
    setImages((prev) => ({ ...prev, [type]: null }));
    // Reset analysis when images are removed
    setAnalysis(null);
    setSalesHistory([]);
  };

  const handleSetListUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === "application/json" || file.type === "text/csv") {
        setSetList(file);
        toast.success("Set list uploaded successfully");
      } else {
        toast.error("Please upload a JSON or CSV file");
      }
    }
  };

  const analyzeCard = async () => {
    if (!images.front || !images.back) return;
    
    setIsAnalyzing(true);
    try {
      // Mock API call for card analysis
      // In production, this would call your backend API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setAnalysis({
        grade: 8.5,
        centering: 9.0,
        corners: 8.5,
        surface: 8.0,
        edges: 8.5
      });

      // Mock eBay sales history
      setSalesHistory([
        { price: 149.99, date: "2024-02-15", condition: "Near Mint" },
        { price: 134.99, date: "2024-02-10", condition: "Excellent" },
        { price: 159.99, date: "2024-02-05", condition: "Near Mint" },
      ]);

      toast.success("Card analysis complete!");
    } catch (error) {
      toast.error("Error analyzing card");
      console.error("Analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleList = () => {
    if (!analysis) return;
    // In production, this would handle the eBay listing creation
    toast.success("Creating eBay listing...");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto p-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 pt-4"
        >
          <h1 className="text-2xl font-semibold text-gray-900">Quick List</h1>
          <p className="text-sm text-gray-500 mt-1">Capture your card to list on eBay</p>
        </motion.div>

        {/* Card Capture Section */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {["front", "back"].map((side) => (
            <motion.div
              key={side}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative"
            >
              {images[side as "front" | "back"] ? (
                <div className="relative rounded-2xl overflow-hidden shadow-sm">
                  <img
                    src={images[side as "front" | "back"]!}
                    alt={`Card ${side}`}
                    className="w-full h-48 object-cover"
                  />
                  <button
                    onClick={() => removeImage(side as "front" | "back")}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white backdrop-blur-sm"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleCapture(side as "front" | "back")}
                  className="w-full h-48 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-white transition-all hover:border-gray-400 active:bg-gray-50"
                >
                  <Camera className="w-6 h-6 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500 capitalize">{side}</span>
                </button>
              )}
            </motion.div>
          ))}
        </div>

        {/* Set List Upload */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <label className="flex flex-col items-center p-4 bg-white rounded-xl border-2 border-dashed border-gray-300 cursor-pointer hover:border-gray-400">
            <Upload className="w-6 h-6 text-gray-400 mb-2" />
            <span className="text-sm text-gray-500">Upload Set List (Optional)</span>
            <input
              type="file"
              accept=".json,.csv"
              onChange={handleSetListUpload}
              className="hidden"
            />
          </label>
        </motion.div>

        {/* Analysis Results */}
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 space-y-4"
          >
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="text-lg font-semibold mb-3">Grading Analysis</h3>
              <div className="space-y-2">
                {Object.entries(analysis).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="capitalize text-gray-600">{key}</span>
                    <span className="font-medium">{value.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>

            {salesHistory.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="text-lg font-semibold mb-3">Recent Sales</h3>
                <div className="space-y-2">
                  {salesHistory.map((sale, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="text-sm">
                        <span className="text-gray-600">{sale.date}</span>
                        <span className="text-gray-400 mx-2">•</span>
                        <span className="text-gray-600">{sale.condition}</span>
                      </div>
                      <span className="font-medium">${sale.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <button
            onClick={handleList}
            disabled={!analysis || isAnalyzing}
            className="w-full py-3 px-4 bg-black text-white rounded-xl font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-gray-900 active:bg-gray-800"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <span>List on eBay</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
          
          <button className="w-full py-3 px-4 bg-white text-gray-700 rounded-xl font-medium flex items-center justify-center space-x-2 border border-gray-200 transition-all hover:bg-gray-50 active:bg-gray-100">
            <Share2 size={18} />
            <span>Share</span>
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
