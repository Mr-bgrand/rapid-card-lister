import * as tf from '@tensorflow/tfjs';
import Tesseract from 'tesseract.js';

export interface CardDetails {
  name: string;
  set: string;
  number: string;
  type?: string;
  rarity?: string;
  isConfirmed?: boolean;
  cardType?: 'sports' | 'trading';
  tcgplayerId?: string;
  sportsCardId?: string;
  imageUrl?: string;
}

export interface CardGradingResult {
  centering: number;
  corners: number;
  edges: number;
  surface: number;
  grade: number;
  cardDetails?: CardDetails;
}

const preprocessImage = async (imageData: string): Promise<tf.Tensor3D> => {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const imageLoaded = new Promise((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
    });
    img.src = imageData;
    const loadedImg = await imageLoaded;
    if (loadedImg instanceof HTMLImageElement && loadedImg.width > 0 && loadedImg.height > 0) {
      const tensor = tf.browser.fromPixels(loadedImg)
        .resizeNearestNeighbor([224, 224])
        .toFloat()
        .expandDims(0)
        .div(255.0);
      return tensor.squeeze() as tf.Tensor3D;
    } else {
      throw new Error('Invalid image dimensions');
    }
  } catch (error) {
    console.error('Error preprocessing image:', error);
    throw new Error(`Error preprocessing image: ${error.message}`);
  }
};

const calculateCentering = (tensor: tf.Tensor3D): number => {
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
    const sobelHKernel = tf.tensor4d(
      [-1, 0, 1, -2, 0, 2, -1, 0, 1],
      [3, 3, 1, 1]
    );
    const sobelVKernel = tf.tensor4d(
      [-1, -2, -1, 0, 0, 0, 1, 2, 1],
      [3, 3, 1, 1]
    );
    
    const expandedGray = grayscale.expandDims(-1);
    const sobelH = tf.conv2d(expandedGray as tf.Tensor4D, sobelHKernel, 1, 'same');
    const sobelV = tf.conv2d(expandedGray as tf.Tensor4D, sobelVKernel, 1, 'same');
    
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
    const sobelHKernel = tf.tensor4d(
      [-1, 0, 1, -2, 0, 2, -1, 0, 1],
      [3, 3, 1, 1]
    );
    const sobelVKernel = tf.tensor4d(
      [-1, -2, -1, 0, 0, 0, 1, 2, 1],
      [3, 3, 1, 1]
    );
    
    const expandedGray = grayscale.expandDims(-1);
    const sobelH = tf.conv2d(expandedGray as tf.Tensor4D, sobelHKernel, 1, 'same');
    const sobelV = tf.conv2d(expandedGray as tf.Tensor4D, sobelVKernel, 1, 'same');
    
    return tf.sqrt(tf.add(tf.square(sobelH), tf.square(sobelV))).mean();
  });
  
  const score = edgeStrength.dataSync()[0];
  return Math.min(10, score * 20);
};

const calculateSurfaceScore = (tensor: tf.Tensor3D): number => {
  const laplacian = tf.tidy(() => {
    const grayscale = tensor.mean(-1);
    const laplacianKernel = tf.tensor4d(
      [0, 1, 0, 1, -4, 1, 0, 1, 0],
      [3, 3, 1, 1]
    );
    
    const expandedGray = grayscale.expandDims(-1);
    return tf.conv2d(expandedGray as tf.Tensor4D, laplacianKernel, 1, 'same');
  });
  
  const variance = tf.moments(laplacian).variance.dataSync()[0];
  laplacian.dispose();
  return Math.min(10, variance * 100);
};

const performOCR = async (imageData: string): Promise<string> => {
  try {
    const worker = await Tesseract.createWorker('eng');
    const result = await worker.recognize(imageData);
    await worker.terminate();
    return result.data.text;
  } catch (error) {
    console.error('OCR error:', error);
    return ''; // Return empty string on error to avoid breaking the flow
  }
};

const extractCardText = async (imageData: string): Promise<CardDetails> => {
  try {
    const worker = await Tesseract.createWorker('eng');
    const result = await worker.recognize(imageData);
    await worker.terminate();

    const text = result.data.text;
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    
    const cardInfo: CardDetails = {
      name: '',
      set: '',
      number: '',
      isConfirmed: false
    };

    const possibleNames = lines.slice(0, 3).filter(line => 
      line.length > 3 && 
      !line.includes('©') && 
      !line.match(/\d{3,}/) && 
      !line.toLowerCase().includes('set') &&
      !line.toLowerCase().includes('series')
    );
    
    if (possibleNames.length > 0) {
      cardInfo.name = possibleNames[0];
    }

    const numberPattern = /(\d+\/\d+|\d+)/;
    for (const line of lines) {
      const match = line.match(numberPattern);
      if (match && !line.toLowerCase().includes('year') && !line.toLowerCase().includes('season')) {
        cardInfo.number = match[0];
        break;
      }
    }

    const setPattern = /(set|series|©.*?)\s*(.*)/i;
    for (const line of lines) {
      const match = line.match(setPattern);
      if (match) {
        cardInfo.set = match[2]?.trim() || 'Unknown Set';
        break;
      }
    }

    const sportKeywords = ['rookie', 'season', 'stats', 'team', 'record'];
    const tradingKeywords = ['pokemon', 'magic', 'yugioh', 'mtg'];
    
    const textLower = text.toLowerCase();
    if (sportKeywords.some(keyword => textLower.includes(keyword))) {
      cardInfo.cardType = 'sports';
    } else if (tradingKeywords.some(keyword => textLower.includes(keyword))) {
      cardInfo.cardType = 'trading';
    }

    return cardInfo;
  } catch (error) {
    console.error('Text extraction error:', error);
    return {
      name: 'Unknown Card',
      set: 'Unknown Set',
      number: 'Unknown',
      isConfirmed: false
    };
  }
};

const searchTCGPlayer = async (cardName: string, setName: string): Promise<Partial<CardDetails> | null> => {
  try {
    console.log('Searching TCGPlayer for:', cardName, setName);
    return null;
  } catch (error) {
    console.error('TCGPlayer search error:', error);
    return null;
  }
};

const searchSportsCard = async (playerName: string, cardNumber: string): Promise<Partial<CardDetails> | null> => {
  try {
    console.log('Searching sports card database for:', playerName, cardNumber);
    return null;
  } catch (error) {
    console.error('Sports card search error:', error);
    return null;
  }
};

export const analyzeCard = async (
  frontImage: string,
  backImage: string,
  onProgress?: (step: string, details: string) => void
): Promise<CardGradingResult> => {
  try {
    onProgress?.("Text Extraction", "Reading front card text...");
    const frontDetails = await extractCardText(frontImage);
    
    let cardDetails = frontDetails;
    
    if (backImage) {
      onProgress?.("Text Extraction", "Reading back card text...");
      const backDetails = await extractCardText(backImage);
      
      cardDetails = {
        ...cardDetails,
        number: backDetails.number || cardDetails.number,
        set: backDetails.set || cardDetails.set,
      };
    }

    onProgress?.("Card Identification", "Attempting to match card...");
    
    if (cardDetails.cardType === 'trading') {
      const tcgMatch = await searchTCGPlayer(cardDetails.name, cardDetails.set);
      if (tcgMatch) {
        cardDetails = { ...cardDetails, ...tcgMatch, isConfirmed: true };
      }
    } else if (cardDetails.cardType === 'sports') {
      const sportsMatch = await searchSportsCard(cardDetails.name, cardDetails.number);
      if (sportsMatch) {
        cardDetails = { ...cardDetails, ...sportsMatch, isConfirmed: true };
      }
    }

    onProgress?.("Text Extraction", `Found card: ${cardDetails.name} (${cardDetails.isConfirmed ? 'Confirmed' : 'Unconfirmed'})`);

    if (!backImage) {
      return {
        centering: 0,
        corners: 0,
        edges: 0,
        surface: 0,
        grade: 0,
        cardDetails
      };
    }

    const tensorFront = await preprocessImage(frontImage);
    
    onProgress?.("Centering Analysis", "Calculating alignment...");
    const centeringScore = calculateCentering(tensorFront);
    
    onProgress?.("Corner Analysis", "Evaluating corner conditions...");
    const cornersScore = await calculateCornersScore(tensorFront);
    
    onProgress?.("Edge Detection", "Measuring edge sharpness...");
    const edgesScore = calculateEdgesScore(tensorFront);
    
    onProgress?.("Surface Analysis", "Analyzing surface texture...");
    const surfaceScore = calculateSurfaceScore(tensorFront);

    const grade = (centeringScore + cornersScore + edgesScore + surfaceScore) / 4;
    
    tensorFront.dispose();
    
    return {
      centering: Number(centeringScore.toFixed(1)),
      corners: Number(cornersScore.toFixed(1)),
      edges: Number(edgesScore.toFixed(1)),
      surface: Number(surfaceScore.toFixed(1)),
      grade: Number(grade.toFixed(1)),
      cardDetails
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
