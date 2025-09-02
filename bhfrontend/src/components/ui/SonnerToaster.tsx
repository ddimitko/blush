import React, { useEffect, useState, memo } from 'react';
import { Toaster } from 'sonner';

// Sonner Toaster with default styling
const SonnerToaster: React.FC = memo(() => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Ensure we're on the client side
    setIsClient(true);
  }, []);

  // Don't render anything on server side
  if (!isClient) {
    return null;
  }

  return (
    <Toaster
      position="top-right"
      richColors={true}
      closeButton={true}
      visibleToasts={4}
      gap={12}
      offset={16}
    />
  );
});

SonnerToaster.displayName = 'SonnerToaster';

export default SonnerToaster;
