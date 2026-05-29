import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";

interface LeadRowProps {
  name: string;
  phone: string;
  status: "new" | "contacted" | "qualified" | "converted" | "lost";
  source: string;
  lastActivity: string;
}

const statusConfig = {
  new: { label: "New", variant: "info" as const },
  contacted: { label: "Contacted", variant: "default" as const },
  qualified: { label: "Qualified", variant: "warning" as const },
  converted: { label: "Converted", variant: "success" as const },
  lost: { label: "Lost", variant: "danger" as const },
};

export default function LeadRow({
  name,
  phone,
  status,
  source,
  lastActivity,
}: LeadRowProps) {
  const statusInfo = statusConfig[status];

  return (
    <tr className="border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors">
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-3">
          <Avatar name={name} size="sm" />
          <div>
            <p className="text-sm font-medium text-text-primary">{name}</p>
            <p className="text-xs text-text-muted">{phone}</p>
          </div>
        </div>
      </td>
      <td className="py-3.5 px-4">
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      </td>
      <td className="py-3.5 px-4">
        <span className="text-sm text-text-secondary">{source}</span>
      </td>
      <td className="py-3.5 px-4">
        <span className="text-sm text-text-muted">{lastActivity}</span>
      </td>
    </tr>
  );
}
