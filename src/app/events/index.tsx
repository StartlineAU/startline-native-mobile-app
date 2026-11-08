import { Redirect, useLocalSearchParams } from 'expo-router';

export default function EventsIndexRedirect() {
  const params = useLocalSearchParams<{
    type?: string;
    division?: string;
    where?: string;
    what?: string;
  }>();

  return (
    <Redirect
      href={{
        pathname: '/discover',
        params: Object.fromEntries(
          Object.entries(params).filter(([, value]) => typeof value === 'string' && value),
        ),
      }}
    />
  );
}
