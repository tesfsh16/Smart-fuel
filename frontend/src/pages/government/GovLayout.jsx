import PortalLayout from "../../components/PortalLayout";

const links = [
  { to: "/government",               label: "National Overview" },
  { to: "/government/map",           label: "Stations"          },
  { to: "/government/intelligence",  label: "AI Intelligence"   },
  { to: "/government/anomalies",     label: "Anomalies"         },
  { to: "/government/supply",        label: "Supply Requests"   },
];

export default function GovLayout() {
  return <PortalLayout role="Government Portal" links={links} />;
}
