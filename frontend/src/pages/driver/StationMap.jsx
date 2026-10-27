import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { findStations } from "../../api/driver";
import L from "leaflet";
import { riskLabel } from "../../utils/riskLabel.js";

// Fix Leaflet's default icon paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Colour per stock level (green = good stock, yellow = low, red = critical)
const COLOUR = {
  LOW:      "#22c55e",
  HIGH:     "#eab308",
  CRITICAL: "#ef4444",
};

function circleIcon(colour) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26">
    <circle cx="13" cy="13" r="10" fill="${colour}" stroke="white" stroke-width="3"/>
  </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -16] });
}

function buildPopup(station) {
  const fuels = Object.values(station.fuels).map(f => {
    const c = f.riskLevel === "LOW" ? "#16a34a" : f.riskLevel === "HIGH" ? "#ca8a04" : "#dc2626";
    return `<div style="margin-top:5px;display:flex;justify-content:space-between;align-items:center;gap:12px">
      <span style="font-weight:600">${f.fuelName}</span>
      <span>${f.quantity.toLocaleString()} L <span style="color:${c};font-weight:700">[${riskLabel(f.riskLevel)}]</span></span>
    </div>`;
  }).join("");

  return `<div style="min-width:190px;font-family:system-ui,sans-serif;font-size:13px;line-height:1.4">
    <p style="font-weight:700;font-size:14px;margin:0 0 3px">${station.name}</p>
    <p style="color:#64748b;font-size:11px;margin:0 0 8px">${station.address || station.region}</p>
    ${fuels}
    <p style="margin-top:8px;font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:6px">
      Queue: <strong>${station.queueCount} vehicles</strong>
    </p>
  </div>`;
}

export default function StationMap() {
  const navigate = useNavigate();
  const wrapRef  = useRef(null); // outer wrapper for size measurement
  const mapRef   = useRef(null); // the actual map div
  const mapInst  = useRef(null);
  const { data: stations, loading } = useApi(() => findStations("All"));

  // Init map — use a position:absolute fill so Leaflet always gets a concrete size
  useEffect(() => {
    if (!mapRef.current || mapInst.current) return;

    mapInst.current = L.map(mapRef.current, {
      center: [9.005, 38.763],
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
      minZoom: 3,
    }).addTo(mapInst.current);

    // Ensure Leaflet recalculates size after mount
    setTimeout(() => mapInst.current?.invalidateSize(), 100);

    return () => {
      mapInst.current?.remove();
      mapInst.current = null;
    };
  }, []);

  // Add markers when data arrives
  useEffect(() => {
    if (!mapInst.current || !stations?.length) return;

    mapInst.current.eachLayer(layer => {
      if (layer instanceof L.Marker) mapInst.current.removeLayer(layer);
    });

    const validStations = stations.filter(s => s.lat && s.lng);
    validStations.forEach(station => {
      const colour = COLOUR[station.riskLevel] || COLOUR.LOW;
      const marker = L.marker([station.lat, station.lng], {
        icon: circleIcon(colour),
        title: station.name,
      });
      marker.bindPopup(buildPopup(station), { maxWidth: 260, closeButton: true });
      marker.on("click", () => marker.openPopup());
      marker.addTo(mapInst.current);
    });

    // Fit map to show all stations
    if (validStations.length > 1) {
      const bounds = L.latLngBounds(validStations.map(s => [s.lat, s.lng]));
      mapInst.current.fitBounds(bounds, { padding: [60, 60] });
    }

    mapInst.current.invalidateSize();
  }, [stations]);

  return (
    // Outer: fill the remaining viewport height below the driver header+nav
    <div className="flex flex-col" style={{ height: "calc(100vh - 130px)" }}>
      {/* Sub-header */}
      <div style={{ background: "#1e3a5f" }} className="px-5 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => navigate("/driver")} className="text-blue-300 text-sm hover:text-white">
          ← Back
        </button>
        <span className="text-white font-semibold">Station Map</span>
        <div className="ml-auto flex items-center gap-4 text-xs text-white">
          {[
            { label: "High stock", color: "#22c55e" },
            { label: "Low stock",  color: "#eab308" },
            { label: "Critical",   color: "#ef4444" },
          ].map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          Loading stations…
        </div>
      )}

      {/* Map wrapper — position:relative so the absolute-fill child works */}
      <div ref={wrapRef} className="flex-1 relative" style={{ minHeight: 0 }}>
        <div
          ref={mapRef}
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
          }}
        />
      </div>
    </div>
  );
}
