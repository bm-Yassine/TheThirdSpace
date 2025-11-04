import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Mock authentication check
    // For now, skip login and go straight to home
    // Later, you can integrate Firebase auth here
    const checkAuth = async () => {
      try {
        // Simulate checking auth state
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock: Always authenticated for now
        const mockUser = { id: 1, name: 'Test User' };
        
        if (mockUser) {
          router.replace('/home');
        } else {
          router.replace('./login');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        router.replace('/home'); // Default to home for now
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#000" />
    </View>
  );
}
