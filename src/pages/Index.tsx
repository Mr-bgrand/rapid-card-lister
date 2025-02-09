import { useState, useRef } from "react";
import { Camera, X, Share2, ArrowRight, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { analyzeCard, type CardGradingResult } from '../utils/imageProcessing';

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
  link?: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const preprocessImage = async (imageData: string): Promise<Blob> => {
    const response = await fetch(imageData);
    const blob = await response.blob();
    return blob;
  };

  const startCamera = async (type: "front" | "back") => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.setAttribute('accept', 'image/*');
      fileInputRef.current.setAttribute('data-type', type);
      fileInputRef.current.click();
    }
  };

  const selectFromLibrary = (type: "front" | "back") => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.setAttribute('accept', 'image/*');
      fileInputRef.current.setAttribute('data-type', type);
      fileInputRef.current.click();
    }
  };

  const handleImageInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const type = event.target.getAttribute('data-type') as "front" | "back";
    
    if (file && type) {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const imageData = e.target?.result as string;
          setImages((prev) => ({ ...prev, [type]: imageData }));

          if (type === "back" && images.front || type === "front" && images.back) {
            setIsAnalyzing(true);
            try {
              const result = await analyzeCard(
                type === "front" ? imageData : images.front!,
                type === "back" ? imageData : images.back!
              );
              
              setAnalysis(result);
              await fetchEbaySales(result);
              toast.success("Card analysis complete!");
            } catch (error) {
              toast.error("Error analyzing card");
              console.error("Analysis error:", error);
            } finally {
              setIsAnalyzing(false);
            }
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        toast.error("Error processing image");
        console.error("Image processing error:", error);
      }
    }
  };

  const removeImage = (type: "front" | "back") => {
    setImages((prev) => ({ ...prev, [type]: null }));
    setAnalysis(null);
    setSalesHistory([]);
  };

  const handleSetListUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === "application/json" || file.type === "text/csv") {
        setSetList(file);
        parseSetList(file);
      } else {
        toast.error("Please upload a JSON or CSV file");
      }
    }
  };

  const parseSetList = async (file: File) => {
    try {
      const text = await file.text();
      if (file.type === "application/json") {
        const data = JSON.parse(text);
        toast.success("Set list parsed successfully");
      } else {
        const rows = text.split('\n').map(row => row.split(','));
        toast.success("Set list parsed successfully");
      }
    } catch (error) {
      toast.error("Error parsing set list");
      console.error("Parse error:", error);
    }
  };

  const fetchEbaySales = async (cardDetails: CardAnalysis): Promise<void> => {
    const mockSales: EbaySale[] = [
      { price: 149.99, date: "2024-02-15", condition: "Near Mint", link: "https://ebay.com/item1" },
      { price: 134.99, date: "2024-02-10", condition: "Excellent", link: "https://ebay.com/item2" },
      { price: 159.99, date: "2024-02-05", condition: "Near Mint", link: "https://ebay.com/item3" },
    ];
    setSalesHistory(mockSales);
  };

  const handleList = async () => {
    if (!analysis) return;
    
    try {
      toast.success("Creating mock eBay listing...");
      // In a real app, this would call the eBay API through a backend proxy
    } catch (error) {
      toast.error("Error creating listing");
      console.error("Listing error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto p-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 pt-4"
        >
          <h1 className="text-2xl font-semibold text-gray-900">Quick List</h1>
          <p className="text-sm text-gray-500 mt-1">Capture your card to list on eBay</p>
        </motion.div>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleImageInput}
          accept="image/*"
        />

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
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={() => startCamera(side as "front" | "back")}
                    className="w-full h-36 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-white transition-all hover:border-gray-400 active:bg-gray-50"
                  >
                    <Camera className="w-6 h-6 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500 capitalize">Take {side}</span>
                  </button>
                  <button
                    onClick={() => selectFromLibrary(side as "front" | "back")}
                    className="w-full py-2 px-3 rounded-xl border border-gray-200 flex items-center justify-center space-x-2 bg-white hover:bg-gray-50"
                  >
                    <ImageIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Choose from library</span>
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>

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
                    <span className="font-medium">{typeof value === 'number' ? value.toFixed(1) : 'N/A'}</span>
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
                      <span className="font-medium">${sale.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

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
