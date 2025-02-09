import { useState, useRef } from "react";
import { Camera, X, Share2, ArrowRight, Upload, Loader2, Image as ImageIcon, DollarSign, TrendingUp, TrendingDown, ChartBar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [images, setImages<{
    front: string | null;
    back: string | null;
  }>({
    front: null,
    back: null,
  });
  const [analysis, setAnalysis<CardAnalysis | null>(null);
  const [salesHistory, setSalesHistory<EbaySale[]>([]);
  const [isAnalyzing, setIsAnalyzing(false);
  const [setList, setSetList<File | null>(null);
  const [analysisSteps, setAnalysisSteps<{
    step: string;
    details: string;
    completed: boolean;
  }[]>([
    
  ]);
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

          if (type === "front") {
            setIsAnalyzing(true);
            setAnalysisSteps([
              { step: "Text Extraction", details: "Reading card information...", completed: false },
            ]);
            try {
              const result = await analyzeCard(imageData, "", (step: string, details: string) => {
                setAnalysisSteps(prev => {
                  const stepExists = prev.find(s => s.step === step);
                  if (stepExists) {
                    return prev.map(s => s.step === step ? { ...s, details, completed: true } : s);
                  }
                  return [...prev, { step, details, completed: false }];
                });
              });
              // Just extract text for now, don't set full analysis
              setAnalysis(null);
            } catch (error) {
              toast.error("Error reading card information");
              console.error("Text extraction error:", error);
            } finally {
              setIsAnalyzing(false);
            }
          }

          if (type === "back" && images.front) {
            setIsAnalyzing(true);
            setAnalysisSteps([
              { step: "Text Extraction", details: "Reading card information...", completed: false },
              { step: "Image Processing", details: "Preparing images for analysis...", completed: false },
              { step: "Centering Analysis", details: "Calculating card centering...", completed: false },
              { step: "Surface Analysis", details: "Analyzing surface condition...", completed: false },
              { step: "Edge Detection", details: "Examining card edges...", completed: false },
              { step: "Corner Analysis", details: "Evaluating corner conditions...", completed: false },
              { step: "Market Research", details: "Gathering sales data...", completed: false }
            ]);

            try {
              const result = await analyzeCard(
                images.front,
                imageData,
                (step: string, details: string) => {
                  setAnalysisSteps(prev => prev.map(s => 
                    s.step === step ? { ...s, details, completed: true } : s
                  ));
                }
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-2xl mx-auto p-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 pt-4"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
            Quick List
          </h1>
          <p className="text-sm text-gray-500 mt-1">Smart Card Analysis & Listing</p>
        </motion.div>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleImageInput}
          accept="image/*"
        />

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-4 mb-6"
        >
          {["front", "back"].map((side) => (
            <motion.div
              key={side}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative"
            >
              {images[side as "front" | "back"] ? (
                <div className="relative rounded-2xl overflow-hidden shadow-lg">
                  <img
                    src={images[side as "front" | "back"]!}
                    alt={`Card ${side}`}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                  <button
                    onClick={() => removeImage(side as "front" | "back")}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white backdrop-blur-sm"
                  >
                    <X size={16} />
                  </button>
                  <span className="absolute bottom-2 left-2 text-white text-sm font-medium capitalize">
                    {side} View
                  </span>
                </div>
              ) : (
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={() => startCamera(side as "front" | "back")}
                    className="w-full h-36 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm transition-all hover:border-purple-400 hover:bg-purple-50/50 active:bg-purple-100/50"
                  >
                    <Camera className="w-6 h-6 text-purple-500 mb-2" />
                    <span className="text-sm text-gray-600 capitalize">Take {side}</span>
                  </button>
                  <button
                    onClick={() => selectFromLibrary(side as "front" | "back")}
                    className="w-full py-2 px-3 rounded-xl border border-gray-200 flex items-center justify-center space-x-2 bg-white/80 backdrop-blur-sm hover:bg-purple-50/50 transition-all"
                  >
                    <ImageIcon className="w-4 h-4 text-purple-500" />
                    <span className="text-sm text-gray-600">Choose from library</span>
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>

        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Analysis in Progress</h3>
              <div className="space-y-4">
                <AnimatePresence>
                  {analysisSteps.map((step, index) => (
                    <motion.div
                      key={step.step}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center space-x-3"
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        step.completed 
                          ? 'bg-green-500 animate-pulse' 
                          : 'bg-gray-300'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{step.step}</p>
                        <p className="text-xs text-gray-500">{step.details}</p>
                      </div>
                      {step.completed && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="text-green-500"
                        >
                          ✓
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

        {analysis?.cardDetails && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
                <ImageIcon className="w-5 h-5 mr-2 text-purple-500" />
                Identified Card
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Name</span>
                  <span className="font-medium text-gray-800">{analysis.cardDetails.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Set</span>
                  <span className="font-medium text-gray-800">{analysis.cardDetails.set}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Number</span>
                  <span className="font-medium text-gray-800">#{analysis.cardDetails.number}</span>
                </div>
                {analysis.cardDetails.type && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Type</span>
                    <span className="font-medium text-gray-800">{analysis.cardDetails.type}</span>
                  </div>
                )}
                {analysis.cardDetails.rarity && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Rarity</span>
                    <span className="font-medium text-gray-800">{analysis.cardDetails.rarity}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
                  <ChartBar className="w-5 h-5 mr-2 text-purple-500" />
                  Grading Analysis
                </h3>
                <div className="space-y-3">
                  {Object.entries(analysis).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="capitalize text-gray-600">{key}</span>
                      <div className="flex items-center">
                        <div className="w-32 h-2 bg-gray-100 rounded-full mr-3">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(typeof value === 'number' ? value : 0) * 10}%` }}
                            className="h-full bg-purple-500 rounded-full"
                          />
                        </div>
                        <span className="font-medium text-gray-800">
                          {typeof value === 'number' ? value.toFixed(1) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-green-500" />
                  Market Data
                </h3>
                <div className="space-y-4">
                  {salesHistory.length > 0 ? (
                    <>
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Recent Sales</p>
                        <div className="space-y-2">
                          {salesHistory.map((sale, index) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                              <div className="flex items-center">
                                <span className="text-gray-600">{sale.date}</span>
                                <span className="text-gray-400 mx-2">•</span>
                                <span className="text-gray-600">{sale.condition}</span>
                              </div>
                              <span className="font-medium text-gray-800">${sale.price.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Price Trends</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-green-500">
                            <TrendingUp className="w-4 h-4 mr-1" />
                            <span className="text-sm font-medium">
                              ${Math.max(...salesHistory.map(s => s.price)).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center text-red-500">
                            <TrendingDown className="w-4 h-4 mr-1" />
                            <span className="text-sm font-medium">
                              ${Math.min(...salesHistory.map(s => s.price)).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">No sales history available</p>
                  )}
                </div>
              </div>
            </div>
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
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-xl font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:from-purple-700 hover:to-blue-600 active:from-purple-800 active:to-blue-700"
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
            <span>Share Analysis</span>
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
