import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../Backend/firebase';

export default function Index() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const sub = onAuthStateChanged(auth, (user) => {
      if (user) router.replace('/home');
      else router.replace('/login');
      setChecking(false);
    });
    return () => sub();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#000" />
    </View>
  );
}
