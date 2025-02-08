
import { useState } from "react";
import { Camera, X, Share2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const Index = () => {
  const [images, setImages] = useState<{
    front: string | null;
    back: string | null;
  }>({
    front: null,
    back: null,
  });

  const handleCapture = (type: "front" | "back") => {
    // Simulated camera capture - in production, this would use the device camera
    const mockImage = `https://via.placeholder.com/400x600?text=${type}`;
    setImages((prev) => ({ ...prev, [type]: mockImage }));
  };

  const removeImage = (type: "front" | "back") => {
    setImages((prev) => ({ ...prev, [type]: null }));
  };

  const handleList = () => {
    // In production, this would handle the eBay listing creation
    console.log("Creating eBay listing...");
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

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <button
            onClick={handleList}
            disabled={!images.front || !images.back}
            className="w-full py-3 px-4 bg-black text-white rounded-xl font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-gray-900 active:bg-gray-800"
          >
            <span>List on eBay</span>
            <ArrowRight size={18} />
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
