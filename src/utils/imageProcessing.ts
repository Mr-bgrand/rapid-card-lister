
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
  const img = new Image();
  img.src = imageData;
  await new Promise(resolve => img.onload = resolve);
  
  const tensor = tf.browser.fromPixels(img)
    .resizeNearestNeighbor([224, 224])
    .toFloat()
    .expandDims(0)
    .div(255.0);
    
  return tensor.squeeze() as tf.Tensor3D;
};

const calculateCenteringScore = (tensor: tf.Tensor3D): number => {
  const moments = tf.moments(tensor);
  const center = moments.mean.dataSync();
  
  const idealCenter = [112, 112];
  const distance = Math.sqrt(
    Math.pow(center[0] - idealCenter[0], 2) + 
    Math.pow(center[1] - idealCenter[1], 2)
  );
  
  return Math.max(0, 10 - (distance / 22.4));
};

const calculateCornersScore = async (tensor: tf.Tensor3D): Promise<number> => {
  const edges = tf.tidy(() => {
    const grayscale = tensor.mean(-1);
    const kernelData = [
      [[[[-1]], [[0]], [[1]]]],
      [[[[-2]], [[0]], [[2]]]],
      [[[[-1]], [[0]], [[1]]]]
    ];
    
    const sobelHKernel = tf.tensor4d(kernelData.flat(2), [3, 3, 1, 1]);
    const sobelVKernel = tf.tensor4d([
      [[[[-1]], [[-2]], [[-1]]]],
      [[[[0]], [[0]], [[0]]]],
      [[[[1]], [[2]], [[1]]]]
    ].flat(2), [3, 3, 1, 1]);
    
    const expandedGray = grayscale.expandDims(-1);
    const sobelH = tf.conv2d(expandedGray, sobelHKernel, 1, 'same');
    const sobelV = tf.conv2d(expandedGray, sobelVKernel, 1, 'same');
    
    return tf.sqrt(tf.add(tf.square(sobelH), tf.square(sobelV)));
  });
  
  const cornerRegions = [
    edges.slice([0, 0], [32, 32]),
    edges.slice([0, 192], [32, 32]),
    edges.slice([192, 0], [32, 32]),
    edges.slice([192, 192], [32, 32])
  ];
  
  const cornerScores = cornerRegions.map(region => {
    const score = region.mean().dataSync()[0];
    return Math.min(10, score * 20);
  });
  
  edges.dispose();
  return cornerScores.reduce((a, b) => a + b, 0) / 4;
};

const calculateEdgesScore = (tensor: tf.Tensor3D): number => {
  const edgeStrength = tf.tidy(() => {
    const grayscale = tensor.mean(-1);
    const kernelData = [
      [[[[-1]], [[0]], [[1]]]],
      [[[[-2]], [[0]], [[2]]]],
      [[[[-1]], [[0]], [[1]]]]
    ];
    
    const sobelHKernel = tf.tensor4d(kernelData.flat(2), [3, 3, 1, 1]);
    const sobelVKernel = tf.tensor4d([
      [[[[-1]], [[-2]], [[-1]]]],
      [[[[0]], [[0]], [[0]]]],
      [[[[1]], [[2]], [[1]]]]
    ].flat(2), [3, 3, 1, 1]);
    
    const expandedGray = grayscale.expandDims(-1);
    const sobelH = tf.conv2d(expandedGray, sobelHKernel, 1, 'same');
    const sobelV = tf.conv2d(expandedGray, sobelVKernel, 1, 'same');
    
    return tf.sqrt(tf.add(tf.square(sobelH), tf.square(sobelV))).mean();
  });
  
  const score = edgeStrength.dataSync()[0];
  return Math.min(10, score * 20);
};

const calculateSurfaceScore = (tensor: tf.Tensor3D): number => {
  const laplacian = tf.tidy(() => {
    const grayscale = tensor.mean(-1);
    const kernelData = [
      [[[[-0]], [[1]], [[0]]]],
      [[[[1]], [[-4]], [[1]]]],
      [[[[-0]], [[1]], [[0]]]]
    ];
    
    const laplacianKernel = tf.tensor4d(kernelData.flat(2), [3, 3, 1, 1]);
    const expandedGray = grayscale.expandDims(-1);
    
    return tf.conv2d(expandedGray, laplacianKernel, 1, 'same');
  });
  
  const variance = tf.moments(laplacian).variance.dataSync()[0];
  laplacian.dispose();
  return Math.min(10, variance * 100);
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
    const tensorFront = await preprocessImage(frontImage);
    
    const [centeringScore, cornersScore, edgesScore, surfaceScore] = await Promise.all([
      calculateCenteringScore(tensorFront),
      calculateCornersScore(tensorFront),
      calculateEdgesScore(tensorFront),
      calculateSurfaceScore(tensorFront)
    ]);
    
    const [frontText, backText] = await Promise.all([
      performOCR(frontImage),
      performOCR(backImage)
    ]);
    
    const grade = (centeringScore + cornersScore + edgesScore + surfaceScore) / 4;
    
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

const extractCardName = (text: string): string => {
  const lines = text.split('\n');
  return lines[0]?.trim() || '';
};

const extractSetInfo = (text: string): string => {
  const setPattern = /(?:set|series):\s*([^\n]+)/i;
  const match = text.match(setPattern);
  return match?.[1]?.trim() || '';
};

const extractCardNumber = (text: string): string => {
  const numberPattern = /(?:#|number|card\s+number):\s*([^\n]+)/i;
  const match = text.match(numberPattern);
  return match?.[1]?.trim() || '';
};
