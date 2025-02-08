
import * as tf from '@tensorflow/tfjs';
import Tesseract from 'tesseract.js';

export interface CardGradingResult {
  centering: number;
  corners: number;
  edges: number;
  surface: number;
  grade: number;
  cardDetails?: {
    name?: string;
    set?: string;
    number?: string;
  };
}

const preprocessImage = async (imageData: string): Promise<tf.Tensor3D> => {
  // Load and normalize image
  const img = new Image();
  img.src = imageData;
  await new Promise(resolve => img.onload = resolve);
  
  // Convert to tensor and normalize
  const tensor = tf.browser.fromPixels(img)
    .resizeNearestNeighbor([224, 224]) // Standardize size
    .toFloat()
    .expandDims(0)
    .div(255.0);
    
  return tensor.squeeze() as tf.Tensor3D;
};

const calculateCenteringScore = (tensor: tf.Tensor3D): number => {
  // Calculate image moments to find center
  const moments = tf.moments(tensor);
  const center = moments.mean.dataSync();
  
  // Compare with ideal center (112, 112)
  const idealCenter = [112, 112];
  const distance = Math.sqrt(
    Math.pow(center[0] - idealCenter[0], 2) + 
    Math.pow(center[1] - idealCenter[1], 2)
  );
  
  // Convert distance to score (0-10)
  return Math.max(0, 10 - (distance / 22.4)); // 22.4 is 10% of image size
};

const calculateCornersScore = async (tensor: tf.Tensor3D): Promise<number> => {
  // Use Canny edge detection
  const edges = tf.tidy(() => {
    const grayscale = tensor.mean(-1);
    const sobelH = tf.conv2d(
      grayscale.expandDims(-1),
      tf.tensor4d([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], [3, 3, 1, 1]),
      1,
      'same'
    );
    const sobelV = tf.conv2d(
      grayscale.expandDims(-1),
      tf.tensor4d([[-1, -2, -1], [0, 0, 0], [1, 2, 1]], [3, 3, 1, 1]),
      1,
      'same'
    );
    return tf.sqrt(tf.add(tf.square(sobelH), tf.square(sobelV)));
  });
  
  // Analyze corner regions
  const cornerRegions = [
    edges.slice([0, 0], [32, 32]),
    edges.slice([0, 192], [32, 32]),
    edges.slice([192, 0], [32, 32]),
    edges.slice([192, 192], [32, 32])
  ];
  
  const cornerScores = cornerRegions.map(region => {
    const score = region.mean().dataSync()[0];
    return Math.min(10, score * 20); // Scale to 0-10
  });
  
  return cornerScores.reduce((a, b) => a + b, 0) / 4;
};

const calculateEdgesScore = (tensor: tf.Tensor3D): number => {
  // Calculate edge sharpness using Sobel
  const edgeStrength = tf.tidy(() => {
    const grayscale = tensor.mean(-1);
    const sobelH = tf.conv2d(
      grayscale.expandDims(-1),
      tf.tensor4d([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], [3, 3, 1, 1]),
      1,
      'same'
    );
    const sobelV = tf.conv2d(
      grayscale.expandDims(-1),
      tf.tensor4d([[-1, -2, -1], [0, 0, 0], [1, 2, 1]], [3, 3, 1, 1]),
      1,
      'same'
    );
    return tf.sqrt(tf.add(tf.square(sobelH), tf.square(sobelV))).mean();
  });
  
  const score = edgeStrength.dataSync()[0];
  return Math.min(10, score * 20); // Scale to 0-10
};

const calculateSurfaceScore = (tensor: tf.Tensor3D): number => {
  // Calculate surface quality using variance of Laplacian
  const laplacian = tf.tidy(() => {
    const grayscale = tensor.mean(-1);
    return tf.conv2d(
      grayscale.expandDims(-1),
      tf.tensor4d([[0, 1, 0], [1, -4, 1], [0, 1, 0]], [3, 3, 1, 1]),
      1,
      'same'
    );
  });
  
  const variance = tf.moments(laplacian).variance.dataSync()[0];
  return Math.min(10, variance * 100); // Scale to 0-10
};

const performOCR = async (imageData: string): Promise<string> => {
  const worker = await Tesseract.createWorker('eng');
  const result = await worker.recognize(imageData);
  await worker.terminate();
  return result.data.text;
};

export const analyzeCard = async (
  frontImage: string,
  backImage: string
): Promise<CardGradingResult> => {
  try {
    // Process front image
    const tensorFront = await preprocessImage(frontImage);
    
    // Calculate individual scores
    const [centeringScore, cornersScore, edgesScore, surfaceScore] = await Promise.all([
      calculateCenteringScore(tensorFront),
      calculateCornersScore(tensorFront),
      calculateEdgesScore(tensorFront),
      calculateSurfaceScore(tensorFront)
    ]);
    
    // Perform OCR in parallel
    const [frontText, backText] = await Promise.all([
      performOCR(frontImage),
      performOCR(backImage)
    ]);
    
    // Calculate overall grade
    const grade = (centeringScore + cornersScore + edgesScore + surfaceScore) / 4;
    
    // Clean up tensors
    tensorFront.dispose();
    
    return {
      centering: Number(centeringScore.toFixed(1)),
      corners: Number(cornersScore.toFixed(1)),
      edges: Number(edgesScore.toFixed(1)),
      surface: Number(surfaceScore.toFixed(1)),
      grade: Number(grade.toFixed(1)),
      cardDetails: {
        name: extractCardName(frontText),
        set: extractSetInfo(backText),
        number: extractCardNumber(backText)
      }
    };
  } catch (error) {
    console.error('Error analyzing card:', error);
    throw error;
  }
};

// Helper functions for OCR text processing
const extractCardName = (text: string): string => {
  // Basic extraction - could be enhanced with regex patterns
  const lines = text.split('\n');
  return lines[0]?.trim() || '';
};

const extractSetInfo = (text: string): string => {
  // Basic set extraction - could be enhanced with regex patterns
  const setPattern = /(?:set|series):\s*([^\n]+)/i;
  const match = text.match(setPattern);
  return match?.[1]?.trim() || '';
};

const extractCardNumber = (text: string): string => {
  // Basic number extraction - could be enhanced with regex patterns
  const numberPattern = /(?:#|number|card\s+number):\s*([^\n]+)/i;
  const match = text.match(numberPattern);
  return match?.[1]?.trim() || '';
};
