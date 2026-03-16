import { router } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  useEffect(() => {
    // Allow all users (including guests) to enter Home directly.
    // Auth-only actions are gated at feature level.
    router.replace('/home');
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#000" />
    </View>
  );
}
