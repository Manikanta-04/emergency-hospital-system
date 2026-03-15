import { useEffect, useRef } from 'react';

/**
 * RouteNavigator — draws a route line on the Leaflet map
 * Uses OpenRouteService (free, no API key needed for basic use)
 * Falls back to straight line if routing API fails
 */
export default function RouteNavigator({ map, userLocation, hospitalLocation, etaMinutes }) {
  const routeLayerRef = useRef(null);
  const animatedMarkerRef = useRef(null);

  useEffect(() => {
    if (!map || !userLocation || !hospitalLocation) return;

    drawRoute();

    return () => {
      if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
      if (animatedMarkerRef.current) map.removeLayer(animatedMarkerRef.current);
    };
  }, [map, userLocation, hospitalLocation]);

  const drawRoute = async () => {
    const L = (await import('leaflet')).default;

    // Clear existing route
    if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
    if (animatedMarkerRef.current) map.removeLayer(animatedMarkerRef.current);

    const start = [userLocation.lng, userLocation.lat];
    const end = [hospitalLocation.lng, hospitalLocation.lat];

    try {
      // Try OpenRouteService for real road routing (free, no key needed for demo)
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (response.ok) {
        const data = await response.json();
        const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        drawPolyline(L, coords);
      } else {
        drawStraightLine(L);
      }
    } catch {
      // ✅ Edge Case #15: Network failure — fall back to straight line
      drawStraightLine(L);
    }
  };

  const drawPolyline = (L, coords) => {
    // Animated dashed route line
    const routeLine = L.polyline(coords, {
      color: '#22c55e',
      weight: 4,
      opacity: 0.85,
      dashArray: '10, 8',
      lineCap: 'round',
    }).addTo(map);

    routeLayerRef.current = routeLine;

    // Fit map to show full route
    map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });

    // Animated ambulance marker along route
    addAmbulanceMarker(L, coords);
  };

  const drawStraightLine = (L) => {
    const coords = [
      [userLocation.lat, userLocation.lng],
      [hospitalLocation.lat, hospitalLocation.lng],
    ];

    const routeLine = L.polyline(coords, {
      color: '#facc15',
      weight: 3,
      opacity: 0.7,
      dashArray: '8, 6',
    }).addTo(map);

    routeLayerRef.current = routeLine;
    map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
    addAmbulanceMarker(L, coords);
  };

  const addAmbulanceMarker = (L, coords) => {
    if (!coords.length) return;

    const ambulanceIcon = L.divIcon({
      html: `<div style="font-size:22px;filter:drop-shadow(0 0 6px #22c55e)">🚑</div>`,
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const marker = L.marker(coords[0], { icon: ambulanceIcon }).addTo(map);
    animatedMarkerRef.current = marker;

    // Animate ambulance along route
    let step = 0;
    const totalSteps = coords.length;
    const intervalMs = etaMinutes ? (etaMinutes * 60000) / totalSteps : 200;

    const animate = setInterval(() => {
      if (step >= totalSteps - 1) {
        clearInterval(animate);
        return;
      }
      step++;
      marker.setLatLng(coords[step]);
    }, Math.max(100, Math.min(500, intervalMs)));
  };

  return null; // This component only affects the map imperatively
}
