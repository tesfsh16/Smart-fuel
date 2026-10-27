import PortalLayout from "../../components/PortalLayout";

const links = [
  { to: "/station",              label: "Dashboard"        },
  { to: "/station/inventory",    label: "Inventory"        },
  { to: "/station/reservations", label: "Reservations"     },
  { to: "/station/queue",        label: "Queue"            },
  { to: "/station/deliveries",   label: "Deliveries"       },
  { to: "/station/supply",       label: "Supply Requests"  },
];

export default function StationLayout() {
  return <PortalLayout role="Station Portal" links={links} />;
}
