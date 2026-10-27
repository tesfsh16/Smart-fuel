import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider, homePathForUser } from "./contexts/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { useAuth } from "./contexts/AuthContext.jsx";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";

import StationLayout from "./pages/station/StationLayout";
import StationDashboard from "./pages/station/StationDashboard";
import StationInventory from "./pages/station/StationInventory";
import StationReservations from "./pages/station/StationReservations";
import StationQueue from "./pages/station/StationQueue";
import StationDeliveries from "./pages/station/StationDeliveries";
import StationSupply from "./pages/station/StationSupply";

import DriverLayout from "./pages/driver/DriverLayout";
import FindFuel from "./pages/driver/FindFuel";
import Reserve from "./pages/driver/Reserve";
import MyQueue from "./pages/driver/MyQueue";
import UssdSms from "./pages/driver/UssdSms";
import StationMap from "./pages/driver/StationMap";

import GovLayout from "./pages/government/GovLayout";
import NationalOverview from "./pages/government/NationalOverview";
import FuelMap from "./pages/government/FuelMap";
import AiIntelligence from "./pages/government/AiIntelligence";
import Anomalies from "./pages/government/Anomalies";
import SupplyReview from "./pages/government/SupplyReview";

import AdminDashboard from "./pages/admin/AdminDashboard";
import DistLayout from "./pages/distributor/DistLayout";
import DistDashboard from "./pages/distributor/DistDashboard";
import DistDeliveries from "./pages/distributor/DistDeliveries";
import SupplyRequests from "./pages/distributor/SupplyRequests";

// Always show the landing page at "/".
// Logged-in users can still navigate to their portal from there.
function LandingOrPortal() {
  return <Landing />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingOrPortal />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/station"
            element={
              <ProtectedRoute roles={["STATION_STAFF", "STATION_MANAGER"]}>
                <StationLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<StationDashboard />} />
            <Route path="inventory"    element={<StationInventory />} />
            <Route path="reservations" element={<StationReservations />} />
            <Route path="queue"        element={<StationQueue />} />
            <Route path="deliveries"   element={<StationDeliveries />} />
            <Route path="supply"       element={<StationSupply />} />
          </Route>

          {/* Driver portal — FindFuel and Map are public (no login needed).
              Reserve, Queue, USSD require a DRIVER account. */}
          <Route path="/driver" element={<DriverLayout />}>
            <Route index element={<FindFuel />} />
            <Route path="map"     element={<StationMap />} />
            <Route path="reserve" element={
              <ProtectedRoute roles={["DRIVER"]} redirectTo="/register">
                <Reserve />
              </ProtectedRoute>
            } />
            <Route path="queue"   element={
              <ProtectedRoute roles={["DRIVER"]} redirectTo="/register">
                <MyQueue />
              </ProtectedRoute>
            } />
            <Route path="ussd"    element={<UssdSms />} />
          </Route>

          <Route
            path="/government"
            element={
              <ProtectedRoute roles={["AUTHORITY"]}>
                <GovLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<NationalOverview />} />
            <Route path="map"          element={<FuelMap />} />
            <Route path="intelligence" element={<AiIntelligence />} />
            <Route path="anomalies"    element={<Anomalies />} />
            <Route path="supply"       element={<SupplyReview />} />
          </Route>

          <Route
            path="/distributor"
            element={
              <ProtectedRoute roles={["DISTRIBUTOR_USER"]}>
                <DistLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DistDashboard />} />
            <Route path="deliveries" element={<DistDeliveries />} />
            <Route path="supply" element={<SupplyRequests />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />

          <Route path="/admin" element={
            <ProtectedRoute roles={["PLATFORM_ADMIN"]}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
