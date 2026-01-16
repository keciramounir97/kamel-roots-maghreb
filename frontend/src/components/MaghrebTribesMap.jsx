import {
  MapContainer,
  TileLayer,
  Polygon,
  Popup,
  Marker,
  ZoomControl,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useState, useEffect } from "react";
import L from "leaflet";

// Fix for default marker icons in React-Leaflet
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

/* =======================
   DATA: TRIBAL ZONES (Expanded Maghreb)
======================= */
const tribalZones = [
  // --- WESTERN SAHARA (Keeping Existing) ---
  {
    name: "Reguibat es-Sahel",
    color: "#e74c3c",
    coordinates: [
      [27.5, -13.0],
      [26.0, -14.5],
      [24.5, -15.0],
      [23.5, -16.0],
      [22.0, -16.8],
      [21.5, -13.0],
      [23.0, -12.0],
      [26.0, -11.0],
      [27.5, -11.5],
    ],
    population: "Zone côtière (Sahara)",
  },
  {
    name: "Reguibat el-Gharb",
    color: "#3498db",
    coordinates: [
      [27.0, -11.0],
      [26.5, -10.0],
      [25.5, -9.5],
      [25.0, -10.5],
      [25.5, -12.0],
      [26.5, -11.5],
    ],
    population: "Intérieur nord (Sahara)",
  },
  {
    name: "Reguibat ech-Charg",
    color: "#2ecc71",
    coordinates: [
      [26.0, -8.0],
      [25.0, -7.0],
      [24.0, -8.0],
      [24.5, -9.5],
      [25.5, -9.0],
    ],
    population: "Zone orientale (Sahara)",
  },
  {
    name: "Oulad Delim",
    color: "#f39c12",
    coordinates: [
      [23.0, -17.0],
      [22.5, -16.0],
      [23.5, -15.5],
      [24.0, -16.5],
      [23.5, -17.5],
    ],
    population: "Zone de Dakhla",
  },
  {
    name: "Izarguien",
    color: "#9b59b6",
    coordinates: [
      [26.7, -11.4],
      [26.5, -11.2],
      [26.3, -11.6],
      [26.5, -11.8],
      [26.7, -11.6],
    ],
    population: "Smara et oasis",
  },

  // --- MOROCCO ---
  {
    name: "Rif Tribes (Sanhaja)",
    color: "#16a085",
    coordinates: [
      [35.2, -5.5],
      [35.4, -3.5],
      [34.8, -3.0],
      [34.5, -4.5],
      [34.8, -5.8],
    ],
    population: "Nord Maroc (Rif)",
  },
  {
    name: "Chleuh (Souss)",
    color: "#d35400",
    coordinates: [
      [30.5, -9.5],
      [30.8, -8.0],
      [29.5, -8.0],
      [29.2, -9.8],
    ],
    population: "Sud Maroc (Souss)",
  },
  {
    name: "Zayane (Atlas)",
    color: "#8e44ad",
    coordinates: [
      [33.0, -6.5],
      [33.0, -5.0],
      [32.0, -5.5],
      [32.0, -7.0],
    ],
    population: "Moyen Atlas",
  },

  // --- ALGERIA ---
  {
    name: "Kabyles (Zwawa)",
    color: "#27ae60",
    coordinates: [
      [36.9, 4.0],
      [36.8, 5.2],
      [36.3, 5.0],
      [36.4, 3.8],
    ],
    population: "Kabylie (Algérie)",
  },
  {
    name: "Chaouis (Aurès)",
    color: "#c0392b",
    coordinates: [
      [35.8, 5.9],
      [35.5, 7.2],
      [34.8, 6.8],
      [35.0, 5.7],
    ],
    population: "Aurès (Algérie)",
  },
  {
    name: "Kel Ahaggar (Tuareg)",
    color: "#f1c40f",
    coordinates: [
      [24.0, 5.0],
      [24.0, 7.0],
      [22.0, 6.5],
      [22.0, 4.5],
    ],
    population: "Grand Sud (Hoggar)",
  },
  {
    name: "Mozabites",
    color: "#e67e22",
    coordinates: [
      [32.8, 3.5],
      [32.8, 4.2],
      [32.2, 4.0],
      [32.2, 3.4],
    ],
    population: "Vallée du M'zab",
  },

  // --- TUNISIA ---
  {
    name: "Kroumirie Tribes",
    color: "#2c3e50",
    coordinates: [
      [36.9, 8.5],
      [37.0, 9.5],
      [36.5, 9.2],
      [36.4, 8.4],
    ],
    population: "Nord-Ouest Tunisie",
  },
  {
    name: "Hamama / Fraichich",
    color: "#7f8c8d",
    coordinates: [
      [35.5, 9.0],
      [35.5, 10.0],
      [34.8, 9.8],
      [34.9, 8.8],
    ],
    population: "Centre Tunisie (Steppes)",
  },

  // --- LIBYA ---
  {
    name: "Warfalla",
    color: "#8e44ad",
    coordinates: [
      [31.5, 13.5],
      [31.5, 15.0],
      [30.5, 14.8],
      [30.6, 13.2],
    ],
    population: "Tripolitaine (Libye)",
  },
  {
    name: "Senussi Tribes",
    color: "#2980b9",
    coordinates: [
      [32.0, 20.0],
      [32.0, 22.0],
      [30.5, 21.5],
      [30.5, 19.8],
    ],
    population: "Cyrénaïque (Libye)",
  },
  {
    name: "Tuareg (Fezzan)",
    color: "#f39c12",
    coordinates: [
      [26.0, 10.0],
      [26.0, 12.0],
      [24.0, 11.5],
      [24.0, 9.5],
    ],
    population: "Sud-Ouest Libye",
  },

  // --- MAURITANIA ---
  {
    name: "Trarza",
    color: "#1abc9c",
    coordinates: [
      [17.5, -16.0],
      [17.5, -13.5],
      [16.5, -13.5],
      [16.5, -16.2],
    ],
    population: "Sud-Ouest Mauritanie",
  },
  {
    name: "Brakna",
    color: "#16a085",
    coordinates: [
      [17.5, -13.4],
      [17.6, -11.5],
      [16.6, -11.8],
      [16.6, -13.3],
    ],
    population: "Sud Mauritanie",
  },
  {
    name: "Adrar Tribes",
    color: "#d35400",
    coordinates: [
      [21.5, -13.5],
      [21.5, -11.0],
      [19.5, -11.2],
      [19.5, -13.8],
    ],
    population: "Plateau de l'Adrar",
  },
];

/* =======================
   DATA: CITIES
======================= */
const cities = [
  // Western Sahara
  { name: "Laâyoune", coords: [27.15, -13.2], importance: "Capitale admin." },
  { name: "Dakhla", coords: [23.7, -15.95], importance: "Port principal" },
  // Morocco
  { name: "Fes", coords: [34.03, -5.0], importance: "Ville Impériale" },
  { name: "Marrakech", coords: [31.62, -7.99], importance: "Ville Impériale" },
  // Algeria
  { name: "Algiers", coords: [36.75, 3.05], importance: "Capitale" },
  {
    name: "Constantine",
    coords: [36.36, 6.61],
    importance: "Capitale de l'Est",
  },
  { name: "Ghardaïa", coords: [32.49, 3.67], importance: "Vallée du M'zab" },
  // Tunisia
  { name: "Tunis", coords: [36.8, 10.18], importance: "Capitale" },
  { name: "Kairouan", coords: [35.67, 10.09], importance: "Ville Sainte" },
  // Libya
  { name: "Tripoli", coords: [32.88, 13.19], importance: "Capitale" },
  { name: "Benghazi", coords: [32.11, 20.08], importance: "Cyrénaïque" },
  // Mauritania
  { name: "Nouakchott", coords: [18.07, -15.95], importance: "Capitale" },
  {
    name: "Chinguetti",
    coords: [20.46, -12.36],
    importance: "Ville Historique",
  },
];

/* =======================
   MAIN COMPONENT
======================= */
export default function MaghrebTribesMap() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full bg-[#f8f5ef]/10 flex items-center justify-center animate-pulse">
        <span className="text-white/20 text-xs uppercase tracking-widest">
          Loading Map...
        </span>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 w-full h-full">
      <MapContainer
        center={[24.5, -13]} // Centered on Western Sahara
        zoom={6}
        zoomControl={false} // Disable default top-left (we use custom position)
        scrollWheelZoom={true} // Re-enable scroll zooming as requested
        dragging={true} // Ensure panning is allowed
        doubleClickZoom={true} // Allow zooming
        attributionControl={false}
        className="h-full w-full bg-transparent outline-none"
        style={{ background: "#aad3df", pointerEvents: "auto" }}
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="opacity-60 grayscale-[20%]"
        />

        {/* TRIBAL ZONES */}
        {tribalZones.map((zone) => {
          // Calculate center for text label
          const center = zone.coordinates
            .reduce(
              (acc, coord) => [acc[0] + coord[0], acc[1] + coord[1]],
              [0, 0]
            )
            .map((sum) => sum / zone.coordinates.length);

          const labelIcon = L.divIcon({
            className: "custom-label-marker",
            html: `<div style="background-color: ${
              zone.color
            }; color: white; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 10px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.3); width: max-content; margin-left: -50%; border: 1px solid white;">${
              zone.name.split(" ")[0]
            }</div>`,
            iconSize: [0, 0], // Size handled by CSS/HTML content
          });

          return (
            <div key={zone.name}>
              <Polygon
                positions={zone.coordinates}
                pathOptions={{
                  color: zone.color,
                  fillColor: zone.color,
                  fillOpacity: 0.3,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="text-sm p-1">
                    <h4
                      style={{ color: zone.color }}
                      className="font-bold mb-1"
                    >
                      {zone.name}
                    </h4>
                    <p>
                      <strong>Population:</strong> {zone.population}
                    </p>
                    <p>
                      <strong>Type:</strong>{" "}
                      {zone.name.includes("Reguibat")
                        ? "Confédération guerrière"
                        : zone.name.includes("Oulad")
                        ? "Tribu commerçante"
                        : "Tribu maraboutique"}
                    </p>
                  </div>
                </Popup>
              </Polygon>
              <Marker position={center} icon={labelIcon} interactive={false} />
            </div>
          );
        })}

        {/* CITIES */}
        {cities.map((city) => (
          <Marker key={city.name} position={city.coords}>
            <Popup>
              <div className="text-sm p-1">
                <h4 className="font-bold mb-1">{city.name}</h4>
                <p>{city.importance}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* LEGEND OVERLAY */}
      <div className="absolute bottom-6 left-6 z-[400] w-[220px] rounded-lg bg-white/90 p-3 shadow-lg border border-gray-200 pointer-events-auto">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2 border-b pb-1">
          Tribes of Western Sahara
        </h3>
        <div className="space-y-1.5">
          {tribalZones.map((zone) => (
            <div key={zone.name} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: zone.color }}
              />
              <span className="text-[10px] font-medium text-gray-800">
                {zone.name}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1 mt-1 border-t border-gray-100">
            <span className="grid place-items-center w-3 h-3">
              {/* Simple dot for city legend */}
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
            </span>
            <span className="text-[10px] font-medium text-gray-800">
              Major Cities
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
