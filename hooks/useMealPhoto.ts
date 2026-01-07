import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { uploadMealPhoto } from '@/lib/supabase';

interface UseMealPhotoReturn {
  takePhoto: () => Promise<string | null>;
  pickFromLibrary: () => Promise<string | null>;
  uploading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useMealPhoto(agentId: string | undefined): UseMealPhotoReturn {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestCameraPermission = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setError('Camera permission is required to take photos');
      return false;
    }
    return true;
  }, []);

  const requestLibraryPermission = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Photo library permission is required to select photos');
      return false;
    }
    return true;
  }, []);

  const uploadPhoto = useCallback(
    async (asset: ImagePicker.ImagePickerAsset): Promise<string | null> => {
      if (!agentId) {
        setError('No agent selected');
        return null;
      }

      if (!asset.base64) {
        setError('Failed to process image');
        return null;
      }

      setUploading(true);
      setError(null);

      try {
        const { data, error: uploadError } = await uploadMealPhoto(
          agentId,
          asset.base64,
          'image/jpeg'
        );

        if (uploadError) {
          setError(uploadError.message || 'Failed to upload photo');
          return null;
        }

        return data?.publicUrl || null;
      } catch (err) {
        setError('Failed to upload photo');
        return null;
      } finally {
        setUploading(false);
      }
    },
    [agentId]
  );

  const takePhoto = useCallback(async (): Promise<string | null> => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      return uploadPhoto(result.assets[0]);
    } catch (err) {
      setError('Failed to take photo');
      return null;
    }
  }, [requestCameraPermission, uploadPhoto]);

  const pickFromLibrary = useCallback(async (): Promise<string | null> => {
    console.log('useMealPhoto.pickFromLibrary: Starting...');
    const hasPermission = await requestLibraryPermission();
    console.log('useMealPhoto.pickFromLibrary: Permission result:', hasPermission);
    if (!hasPermission) return null;

    try {
      console.log('useMealPhoto.pickFromLibrary: Launching picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });
      console.log('useMealPhoto.pickFromLibrary: Picker returned, canceled:', result.canceled);

      if (result.canceled || !result.assets[0]) {
        console.log('useMealPhoto.pickFromLibrary: User canceled or no asset');
        return null;
      }

      console.log('useMealPhoto.pickFromLibrary: Got asset, uploading...');
      return uploadPhoto(result.assets[0]);
    } catch (err) {
      console.error('useMealPhoto.pickFromLibrary: Error:', err);
      setError('Failed to select photo');
      return null;
    }
  }, [requestLibraryPermission, uploadPhoto]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    takePhoto,
    pickFromLibrary,
    uploading,
    error,
    clearError,
  };
}
