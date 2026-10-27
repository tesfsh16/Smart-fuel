import PortalLayout from "../../components/PortalLayout";

const links = [
  { to: "/distributor", label: "Dashboard", icon: "📊" },
  { to: "/distributor/deliveries", label: "Deliveries", icon: "🚛" },
  { to: "/distributor/supply", label: "Supply Requests", icon: "📦" },
];

export default function DistLayout() {
  return <PortalLayout role="Distributor Portal" links={links} />;
}
