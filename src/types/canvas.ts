export interface BusinessProcess {
  id: string;
  name: string;
  category: string;
  description: string | null;
  position_x: number;
  position_y: number;
  metadata?: {
    icon?: string;
    color?: string;
    stats?: Array<{ icon: string; label: string; value: string }>;
  };
}

export interface ProcessConnection {
  id: string;
  source_id: string;
  target_id: string;
  label: string | null;
}
