import type { JSX, MouseEventHandler } from "react";
import type { AuthUser } from "@/lib/authApi";

export interface GozaloMenuProps {
  isOpen?: boolean;
  onClose: () => void;
  loggedIn?: boolean;
  authUser?: AuthUser | null;
  isStaff?: boolean;
  onLogout?: () => void;
  onStaffPanel?: () => void;
  onDashboardClick?: MouseEventHandler;
}

declare function GozaloMenu(props: GozaloMenuProps): JSX.Element;
export default GozaloMenu;
