import * as FileSystem from 'expo-file-system';

const MAX_IMAGE_SIZE = 500 * 1024; // 500 KB máximo

export const convertImageToBase64 = async (imageUri: string): Promise<string> => {
  try {
    // Leer el archivo como base64
    const base64Data = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    return `data:image/jpeg;base64,${base64Data}`;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
};

export const compressAndConvertImage = async (imageUri: string): Promise<string> => {
  try {
    // Obtener info del archivo
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    
    if (fileInfo.size && fileInfo.size > MAX_IMAGE_SIZE) {
      // Si es muy grande, comprimir usando Expo Image Manipulator
      // Por ahora devolvemos un aviso, pero podrías usar expo-image-manipulator
      console.warn(`Imagen grande (${fileInfo.size} bytes). Considera comprimir.`);
    }
    
    return convertImageToBase64(imageUri);
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
};

export const base64ToUri = (base64String: string): string => {
  // Si ya es un data URI, devolverlo como está
  if (base64String.startsWith('data:')) {
    return base64String;
  }
  // Si no, convertir
  return `data:image/jpeg;base64,${base64String}`;
};
