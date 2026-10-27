/**
 * LocationPicker
 * A Leaflet map that lets the user click to place a pin.
 * Props:
 *   lat, lng        – current values (number or "")
 *   onChange(lat, lng) – called whenever the pin moves
 */
import { useEffect, useRef } from "react";
import L from "leaflet";

// Custom red pin for the selected location
function pinIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 9.625 14 22 14 22S28 23.625 28 14C28 6.268 21.732 0 14 0z"
          fill="#1e3a5f" stroke="white" stroke-width="2"/>
    <circle cx="14" cy="14" r="5" fill="white"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize:   [28, 36],
    iconAnchor: [14, 36],
    popupAnchor:[0, -36],
  });
}

export default function LocationPicker({ lat, lng, onChange }) {
  const wrapRef = useRef(null);
  const mapRef  = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!wrapRef.current || mapRef.current) return;

    mapRef.current = L.map(wrapRef.current, {
      center: [9.005, 38.763],
      zoom: 12,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapRef.current);

    // Click to place / move pin
    mapRef.current.on("click", (e) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;

      if (markerRef.current) {
        markerRef.current.setLatLng([clickLat, clickLng]);
      } else {
        markerRef.current = L.marker([clickLat, clickLng], {
          icon: pinIcon(),
          draggable: true,
        }).addTo(mapRef.current);

        markerRef.current.on("dragend", (ev) => {
          const pos = ev.target.getLatLng();
          onChange(parseFloat(pos.lat.toFixed(6)), parseFloat(pos.lng.toFixed(6)));
        });
      }

      onChange(parseFloat(clickLat.toFixed(6)), parseFloat(clickLng.toFixed(6)));
    });

    setTimeout(() => mapRef.current?.invalidateSize(), 100);

    return () => {
      mapRef.current?.remove();
      mapRef.current  = null;
      markerRef.current = null;
    };
  }, []);

  // If lat/lng are passed in from outside (e.g. reset), sync the marker
  useEffect(() => {
    if (!mapRef.current) return;
    if (lat && lng) {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], {
          icon: pinIcon(),
          draggable: true,
        }).addTo(mapRef.current);

        markerRef.current.on("dragend", (ev) => {
          const pos = ev.target.getLatLng();
          onChange(parseFloat(pos.lat.toFixed(6)), parseFloat(pos.lng.toFixed(6)));
        });
      }
      mapRef.current.setView([lat, lng], mapRef.current.getZoom());
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [lat, lng]);

  return (
    <div>
      {/* Map */}
      <div
        ref={wrapRef}
        style={{ height: 300, borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0" }}
      />
      {/* Coordinate display */}
      <div className="mt-2 flex gap-4">
        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600">
          <span className="text-slate-400 mr-1">Lat:</span>
          <span className="font-mono font-semibold">{lat || "—"}</span>
        </div>
        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600">
          <span className="text-slate-400 mr-1">Lng:</span>
          <span className="font-mono font-semibold">{lng || "—"}</span>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 mt-1.5">
        Click the map to place the station pin. Drag the pin to adjust.
      </p>
    </div>
  );
}
