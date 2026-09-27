import { useLocation, useNavigate } from "react-router-dom";
import { CheckSquare, Settings, ChevronDown, Calendar, CalendarClock, Gamepad2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getCategories } from "@/services/categories-api";
import { getDayEndData } from "@/services/dayend-api";

interface SidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  onClose?: () => void;
}

interface NavSubitem {
  id: string;
  label: string;
  path: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  path?: string;
  submenu: NavSubitem[] | null;
}

export default function Sidebar({ isOpen, isMobile, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = !isOpen && !isMobile;
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const toggleMenu = (id: string) => {
    setOpenMenu((prev) => (prev === id ? null : id));
  };

  const isParentActive = (item: NavItem) => {
    return (
      item.submenu?.some((subitem) => location.pathname === subitem.path) ??
      false
    );
  };

  const [isDidDayEnd, setIsDidDayEnd] = useState(false);

  const handleGetDayEndData = async () => {
    const today = new Date().toISOString().split("T")[0];

    try {
      const res = await getDayEndData(today);
      if (res && res.length > 0) {
        setIsDidDayEnd(true);
        localStorage.setItem("dayEndData", JSON.stringify(res[0]));
      } else {
        setIsDidDayEnd(false);
        localStorage.removeItem("dayEndData");
      }
    } catch (error) {
      setIsDidDayEnd(false);
      localStorage.removeItem("dayEndData");
    }
  };

  useEffect(() => {
    handleGetDayEndData();
  }, []);

  const canAccessMenu = (itemId: string) => {
    if (isDidDayEnd) return true;

    return itemId === "dayend";
  };

  const cashier = localStorage.getItem("cashier")
    ? JSON.parse(localStorage.getItem("cashier") as string)
    : null;

  const handleGetCategories = async () => {
    try {
      const response = await getCategories();
      localStorage.setItem("categories", JSON.stringify(response));
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }

  useEffect(() => {
    handleGetCategories();
  }, []);

  const navItems: NavItem[] = [
    {
      id: "system-settings",
      label: "System Settings",
      icon: Settings,
      path: "",
      submenu: [
        {
          id: "pc-settings",
          label: "PC Settings",
          path: "/pc-settings",
        },
        {
          id: "ps5-settings",
          label: "PS5 Settings",
          path: "/ps5-settings",
        },
        {
          id: "pool-settings",
          label: "Pool Settings",
          path: "/pool-settings",
        },
        {
          id: "movie-room-settings",
          label: "Movie Room Settings",
          path: "/movie-rooms-settings",
        },
      ],
    },
    {
      id: "games",
      label: "Games",
      icon: Gamepad2,
      path: "/games",
      submenu: null,
    },
    {
      id: "bookings",
      label: "Bookings",
      icon: Calendar,
      path: "/bookings",
      submenu: null,
    },
    {
      id: "today",
      label: "Today's Schedule",
      icon: CalendarClock,
      path: "/today",
      submenu: null,
    },
    {
      id: "dayend",
      label: "Day end",
      icon: CheckSquare,
      path: "/dayend",
      submenu: null,
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      path: "/settings",
      submenu: null,
    },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile && onClose) {
      onClose();
    }
  };

  const isActive = (path: string) => location.pathname === path;

  // Mobile drawer backdrop
  if (isMobile && !isOpen) {
    return null;
  }

  return (
    <>
      <aside
        className={`${isMobile ? "fixed inset-y-0 left-0 z-40" : "relative"} h-full w-full bg-white border-r border-gray-200 shadow-[0_0_0_1px_rgba(15,23,42,0.03)] transition-all duration-300 ease-in-out ${isMobile ? (isOpen ? "translate-x-0" : "-translate-x-full") : ""} overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent`}
      >
        <div className="flex flex-col h-full">
          {/* Brand Header */}
          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-sm">
                <span className="text-xs font-bold">KVK</span>
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    KVK Gaming System
                  </p>
                  <p className="text-xs text-gray-500">Cashier Panel</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.submenu
                ? isParentActive(item)
                : isActive(item.path || "");

              const isOpen = openMenu === item.id;

              const btnBase = `w-full flex items-center ${collapsed ? "justify-center" : "justify-between"} ${collapsed ? "px-2" : "px-3"} py-1.5 rounded-xl transition-colors duration-150`;
              const iconWrapper = `${active ? "bg-red-600 text-white" : "text-gray-400"} w-8 h-8 flex items-center justify-center rounded-lg transition`;

              return (
                <div key={item.id}>
                  <button
                    onClick={() => {
                      if (!canAccessMenu(item.id)) return;

                      item.submenu
                        ? toggleMenu(item.id)
                        : handleNavigation(item.path!);
                    }}
                    disabled={!canAccessMenu(item.id)}
                    className={`${btnBase}
    ${active && !collapsed
                        ? "bg-red-50 text-red-700 shadow-sm"
                        : "text-gray-700 hover:bg-gray-50"
                      }
    ${!canAccessMenu(item.id)
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                      }
  `}
                  >
                    <div
                      className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""
                        }`}
                    >
                      <span className={iconWrapper}>
                        <Icon size={16} />
                      </span>

                      {!collapsed && (
                        <span
                          className={`text-sm ${active
                              ? "text-red-700 font-semibold"
                              : "text-gray-700"
                            }`}
                        >
                          {item.label}
                        </span>
                      )}
                    </div>

                    {!collapsed && item.submenu && (
                      <ChevronDown
                        size={16}
                        className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""
                          }`}
                      />
                    )}
                  </button>

                  {/* Submenu */}
                  {item.submenu && isOpen && !collapsed && (
                    <div className="ml-11 mt-1 space-y-1">
                      {item.submenu.map((subitem) => (
                        <button
                          key={subitem.id}
                          onClick={() => handleNavigation(subitem.path)}
                          className={`w-full text-left px-3 py-2 text-sm rounded-lg transition cursor-pointer ${isActive(subitem.path)
                              ? "bg-red-50 text-red-700 font-medium"
                              : "text-gray-600 hover:bg-gray-50"
                            }`}
                        >
                          {subitem.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="mt-auto px-4 pb-4 pt-3 border-t border-gray-100 space-y-3">
            <div className="flex items-center gap-2 text-xs text-emerald-600">
              {!collapsed && (
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              )}
              {!collapsed && <span>System online</span>}
            </div>

            {!collapsed && (
              <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-semibold">
                  {cashier?.firstName?.charAt(0)}
                  {cashier?.lastName?.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {cashier?.firstName} {cashier?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{cashier?.email}</p>
                </div>
              </div>
            )}

            {collapsed && (
              <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-semibold">
                {cashier?.firstName?.charAt(0)}
                {cashier?.lastName?.charAt(0)}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
