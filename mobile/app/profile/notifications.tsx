import { Redirect, type Href } from 'expo-router';

export default function ProfileNotificationsRedirect() {
  return <Redirect href={'/notifications' as Href} />;
}
