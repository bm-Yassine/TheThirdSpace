import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect in render phase to avoid "navigate before mount" runtime errors.
  return <Redirect href="/home" />;
}
