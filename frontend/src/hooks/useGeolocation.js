import { useState, useEffect, useCallback } from "react";

export function useGeolocation() {
  const [coords, setCoords] = useState({ lat: 28.6139, lng: 77.2090 });
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));
        setCoords({ lat, lng });
        setHasPermission(true);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.warn("Geolocation permission or position error:", err.message);
        setError(err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  return { coords, setCoords, hasPermission, loading, error, detectLocation };
}
