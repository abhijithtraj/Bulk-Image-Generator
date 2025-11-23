import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const MODEL_NAME = 'gemini-2.5-flash-image';

/**
 * Converts a File object to a Base64 string.
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data url prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Helper to extract the image URL from a Gemini response.
 * It searches through parts for inlineData.
 */
const extractImageFromResponse = (response: any): string | null => {
  if (!response.candidates || response.candidates.length === 0) return null;
  
  const content = response.candidates[0].content;
  if (!content || !content.parts) return null;

  for (const part of content.parts) {
    if (part.inlineData && part.inlineData.data) {
      const mimeType = part.inlineData.mimeType || 'image/png';
      return `data:${mimeType};base64,${part.inlineData.data}`;
    }
  }
  return null;
};

/**
 * Edits an existing image based on a text prompt.
 */
export const editImageWithGemini = async (
  imageBase64: string,
  mimeType: string,
  prompt: string
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    const imageUrl = extractImageFromResponse(response);
    if (!imageUrl) {
      throw new Error('No image generated. The model might have returned only text.');
    }
    return imageUrl;
  } catch (error) {
    console.error("Gemini Edit Image Error:", error);
    throw error;
  }
};

/**
 * Generates a new image based on a text prompt (for bulk generation).
 */
export const generateImageWithGemini = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    });

    const imageUrl = extractImageFromResponse(response);
    if (!imageUrl) {
      throw new Error('No image generated. The model might have returned only text.');
    }
    return imageUrl;
  } catch (error) {
    console.error("Gemini Generate Image Error:", error);
    throw error;
  }
};
