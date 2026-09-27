import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  CalendarClock,
  ChevronDown,
  Clock,
  Eye,
  Gamepad2,
  Hash,
  Phone,
  PlayCircle,
  RefreshCcw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { getGamingBookingsList } from "@/services/bookings-api";
import { getCategories } from "@/services/categories-api";
import { getGamingStationsByCategory } from "@/services/gaming-stations-api";

/* =========================================================
   Types
   ========================================================= */

type AdditionalPurchaseLine = {
  id: string;
  additionalPurchaseId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

type GamingBookingRow = {
  id: string;
  bookingNumber: string;
  gamingCategoryId: string;
  gamingCategoryName: string;
  gamingStationId: string;
  gamingStationName: string;
  gamingSlotId: string;
  slotDate: string;
  slotStartTime: string;
  slotEndTime: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  status: number;
  createdAt: string;
  paymentType: number;
  additionalPurchases?: AdditionalPurchaseLine[];
};

type CategoryOption = {
  id: string;
  name: string;
};

type StationOption = {
  id: string;
  name: string;
};

type ScheduleStatus = "upcoming" | "ongoing" | "completed";

const CONFIRMED_STATUS = 2;

/* =========================================================
   Today's Schedule Page
   ========================================================= */

export default function Today() {
  const today = new Date();
  const todayDate = today.toISOString().split("T")[0];

  const navigate = useNavigate();

  const dayendData = localStorage.getItem("dayEndData")
    ? JSON.parse(localStorage.getItem("dayEndData") as string)
    : null;

  useEffect(() => {
    if (!dayendData) {
      navigate("/dayend");
    }
  }, [dayendData, navigate]);

  const [bookings, setBookings] = useState<GamingBookingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [now, setNow] = useState(new Date());

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [stations, setStations] = useState<StationOption[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedStationId, setSelectedStationId] = useState("");
  const [isLoadingStations, setIsLoadingStations] = useState(false);

  const [viewingBooking, setViewingBooking] = useState<GamingBookingRow | null>(
    null,
  );

  /* Keep "ongoing/upcoming" status ticking without refetching data */
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const formatDateDisplay = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const parsed = new Date();
    parsed.setHours(Number(hours), Number(minutes), 0, 0);

    return parsed.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const paymentLabel = (paymentType: number) =>
    paymentType === 2 ? "Card" : "Cash";

  /* =========================================================
     Category / Station Filter Options
     ========================================================= */

  const loadCategories = async () => {
    try {
      const response = await getCategories();
      const rows: CategoryOption[] = Array.isArray(response)
        ? response.map((category: any) => ({
            id: category.id,
            name: category.name,
          }))
        : [];
      setCategories(rows);
    } catch (error) {
      console.error("Failed to load gaming categories:", error);
      setCategories([]);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  useEffect(() => {
    if (!selectedCategoryId) {
      setStations([]);
      setSelectedStationId("");
      return;
    }

    const loadStations = async () => {
      try {
        setIsLoadingStations(true);
        setSelectedStationId("");

        const response = await getGamingStationsByCategory(selectedCategoryId);
        const rows: StationOption[] = Array.isArray(response)
          ? response.map((station: any) => ({
              id: station.id,
              name: station.name,
            }))
          : [];
        setStations(rows);
      } catch (error) {
        console.error("Failed to load gaming stations:", error);
        setStations([]);
      } finally {
        setIsLoadingStations(false);
      }
    };

    void loadStations();
  }, [selectedCategoryId]);

  /* =========================================================
     Bookings Data Loading
     ========================================================= */

  const loadTodaysBookings = async () => {
    try {
      setIsLoading(true);
      setLoadError("");

      const response = await getGamingBookingsList({
        fromDate: todayDate,
        toDate: todayDate,
        status: CONFIRMED_STATUS,
        gamingCategoryId: selectedCategoryId || undefined,
        gamingStationId: selectedStationId || undefined,
        pageSize: 500,
      });

      const rows: GamingBookingRow[] = Array.isArray(response) ? response : [];

      rows.sort((a, b) => a.slotStartTime.localeCompare(b.slotStartTime));

      setBookings(rows);
    } catch (error) {
      console.error("Failed to load today's bookings:", error);
      setBookings([]);
      setLoadError("Unable to load today's guest schedule. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTodaysBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId, selectedStationId]);

  const getScheduleStatus = (booking: GamingBookingRow): ScheduleStatus => {
    const start = new Date(`${booking.slotDate}T${booking.slotStartTime}`);
    const end = new Date(`${booking.slotDate}T${booking.slotEndTime}`);

    if (now < start) return "upcoming";
    if (now >= start && now <= end) return "ongoing";
    return "completed";
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredBookings = useMemo(() => {
    if (!normalizedSearch) return bookings;

    return bookings.filter((booking) =>
      [booking.customerName, booking.customerPhone]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [bookings, normalizedSearch]);

  const nextUpcomingId = useMemo(() => {
    const upcoming = bookings.find(
      (booking) => getScheduleStatus(booking) === "upcoming",
    );
    return upcoming?.id ?? null;
  }, [bookings, now]);

  const stats = useMemo(() => {
    const upcomingCount = bookings.filter(
      (booking) => getScheduleStatus(booking) === "upcoming",
    ).length;

    const ongoingCount = bookings.filter(
      (booking) => getScheduleStatus(booking) === "ongoing",
    ).length;

    const totalRevenue = bookings.reduce(
      (sum, booking) => sum + booking.amount,
      0,
    );

    return {
      totalGuests: bookings.length,
      upcomingCount,
      ongoingCount,
      totalRevenue,
    };
  }, [bookings, now]);

  return (
    <main className="min-h-screen bg-slate-50/60">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-700 text-white shadow-sm shadow-red-900/20">
              <CalendarClock size={22} />
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Today's Schedule
                </h1>

                <span className="hidden items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-900 sm:inline-flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                  {formatDateDisplay(todayDate)}
                </span>
              </div>

              <p className="text-sm text-slate-500">
                Confirmed guests booked to play today, sorted by
                station time.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadTodaysBookings()}
            disabled={isLoading}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-red-900 hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
          >
            <RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Summary Metric Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Total Guests Today"
            value={stats.totalGuests.toLocaleString()}
            subtitle="Confirmed bookings"
            icon={<Users size={20} />}
            iconClassName="bg-red-50 text-red-800"
          />

          <SummaryCard
            title="Upcoming"
            value={stats.upcomingCount.toLocaleString()}
            subtitle="Yet to arrive"
            icon={<Clock size={20} />}
            iconClassName="bg-blue-50 text-blue-600"
          />

          <SummaryCard
            title="Now Playing"
            value={stats.ongoingCount.toLocaleString()}
            subtitle="Currently in session"
            icon={<PlayCircle size={20} />}
            iconClassName="bg-emerald-50 text-emerald-600"
          />

          <SummaryCard
            title="Today's Revenue"
            value={formatPrice(stats.totalRevenue)}
            subtitle="From confirmed guests"
            icon={<TrendingUp size={20} />}
            iconClassName="bg-violet-50 text-violet-600"
          />
        </div>

        {/* Schedule List */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 p-4 sm:px-6">
            <div>
              <h2 className="font-bold text-slate-900">Guest Schedule</h2>
              <p className="text-xs text-slate-500">
                Station time, guest details, and payment for each confirmed
                booking today.
              </p>
            </div>

            <div className="flex flex-nowrap items-center gap-2.5 overflow-x-auto pb-0.5">
              <div className="flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 shadow-sm transition hover:border-red-300 focus-within:border-red-400 focus-within:ring-4 focus-within:ring-red-50">
                <Search size={16} className="shrink-0 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by name or phone..."
                  className="w-full text-sm outline-none placeholder:text-slate-400"
                />
              </div>

              <FilterSelect
                icon={<SlidersHorizontal size={15} />}
                value={selectedCategoryId}
                onChange={setSelectedCategoryId}
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                icon={<Gamepad2 size={15} />}
                value={selectedStationId}
                onChange={setSelectedStationId}
                disabled={!selectedCategoryId || isLoadingStations}
              >
                <option value="">
                  {isLoadingStations ? "Loading..." : "All Stations"}
                </option>
                {stations.map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name}
                  </option>
                ))}
              </FilterSelect>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-red-100 border-t-red-600" />
              <p className="text-sm text-slate-500">
                Loading today's schedule...
              </p>
            </div>
          ) : loadError ? (
            <div className="py-16 text-center text-sm text-red-600">
              {loadError}
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <CalendarClock size={26} />
              </div>
              <p className="font-semibold text-slate-700">
                {bookings.length === 0
                  ? "No confirmed guests booked for today yet."
                  : "No guests match your search or filter."}
              </p>
              <p className="text-xs text-slate-400">
                Confirmed bookings for today will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredBookings.map((booking) => {
                const status = getScheduleStatus(booking);
                const isNext = booking.id === nextUpcomingId;
                const purchaseCount = (booking.additionalPurchases ?? []).reduce(
                  (sum, item) => sum + item.quantity,
                  0,
                );

                return (
                  <div
                    key={booking.id}
                    className={`flex flex-col gap-3 p-4 transition sm:flex-row sm:items-center sm:gap-4 sm:p-5 ${
                      isNext ? "bg-red-50/40" : "hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex w-full shrink-0 items-center justify-between gap-2 rounded-xl bg-red-50 px-3 py-2 text-red-900 sm:w-24 sm:flex-col sm:justify-center sm:py-2.5 sm:text-center">
                      <span className="text-sm font-bold leading-tight">
                        {formatTime(booking.slotStartTime)}
                      </span>
                      <span className="text-[11px] text-red-700">
                        {formatTime(booking.slotEndTime)}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-slate-900">
                          {booking.customerName}
                        </p>
                        <StatusBadge status={status} />
                        {isNext && (
                          <span className="inline-flex items-center rounded-full bg-red-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            Next Up
                          </span>
                        )}
                        {purchaseCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                            <ShoppingBag size={11} />
                            {purchaseCount} item{purchaseCount > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Phone size={12} />
                          {booking.customerPhone}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Gamepad2 size={12} />
                          {booking.gamingCategoryName} &middot;{" "}
                          {booking.gamingStationName}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Hash size={12} />
                          {booking.bookingNumber}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center sm:gap-1.5">
                      <p className="font-bold text-slate-900">
                        {formatPrice(booking.amount)}
                      </p>
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                        {paymentLabel(booking.paymentType)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setViewingBooking(booking)}
                      className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-red-900 hover:bg-red-50 hover:text-red-700 sm:self-center"
                    >
                      <Eye size={14} />
                      View
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {viewingBooking && (
        <BookingDetailModal
          booking={viewingBooking}
          status={getScheduleStatus(viewingBooking)}
          formatPrice={formatPrice}
          formatTime={formatTime}
          formatDateDisplay={formatDateDisplay}
          paymentLabel={paymentLabel}
          onClose={() => setViewingBooking(null)}
        />
      )}
    </main>
  );
}

/* =========================================================
   Summary Card
   ========================================================= */

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  iconClassName,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  iconClassName: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-0.5 text-2xl font-bold text-slate-900 truncate">
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   Filter Select
   ========================================================= */

function FilterSelect({
  icon,
  value,
  onChange,
  disabled,
  children,
}: {
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`relative flex h-10 shrink-0 items-center gap-2 rounded-xl border pl-3 pr-8 shadow-sm transition ${
        disabled
          ? "border-slate-100 bg-slate-50"
          : "border-slate-200 bg-white hover:border-red-300 focus-within:border-red-400 focus-within:ring-4 focus-within:ring-red-50"
      }`}
    >
      <span className={disabled ? "text-slate-300" : "text-slate-400"}>
        {icon}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full cursor-pointer appearance-none bg-transparent text-sm text-slate-700 outline-none disabled:cursor-not-allowed disabled:text-slate-400"
      >
        {children}
      </select>

      <ChevronDown
        size={14}
        className={`pointer-events-none absolute right-3 ${
          disabled ? "text-slate-300" : "text-slate-400"
        }`}
      />
    </div>
  );
}

/* =========================================================
   Status Badge
   ========================================================= */

function StatusBadge({ status }: { status: ScheduleStatus }) {
  if (status === "ongoing") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Now Playing
      </span>
    );
  }

  if (status === "completed") {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
        Completed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
      Upcoming
    </span>
  );
}

/* =========================================================
   Booking Detail Modal
   ========================================================= */

function BookingDetailModal({
  booking,
  status,
  formatPrice,
  formatTime,
  formatDateDisplay,
  paymentLabel,
  onClose,
}: {
  booking: GamingBookingRow;
  status: ScheduleStatus;
  formatPrice: (price: number) => string;
  formatTime: (time: string) => string;
  formatDateDisplay: (date: string) => string;
  paymentLabel: (paymentType: number) => string;
  onClose: () => void;
}) {
  const purchases = booking.additionalPurchases ?? [];
  const purchasesTotal = purchases.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-700 text-white">
              <CalendarClock size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Booking Details
              </h2>
              <p className="text-xs text-slate-500">
                {booking.bookingNumber}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
            <DetailRow label="Guest Name" value={booking.customerName} />
            <DetailRow label="Phone" value={booking.customerPhone} />
            <DetailRow label="Category" value={booking.gamingCategoryName} />
            <DetailRow label="Station" value={booking.gamingStationName} />
            <DetailRow
              label="Date"
              value={formatDateDisplay(booking.slotDate)}
            />
            <DetailRow
              label="Time Slot"
              value={`${formatTime(booking.slotStartTime)} - ${formatTime(
                booking.slotEndTime,
              )}`}
            />
            <DetailRow
              label="Payment Method"
              value={paymentLabel(booking.paymentType)}
            />
            <div className="h-px bg-slate-200" />
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-red-900">Slot Amount</span>
              <span className="text-base font-extrabold text-red-900">
                {formatPrice(booking.amount)}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center gap-2">
              <ShoppingBag size={16} className="text-violet-600" />
              <p className="text-sm font-bold text-slate-900">
                Additional Purchases
              </p>
            </div>

            {purchases.length === 0 ? (
              <p className="text-xs text-slate-400">
                No additional purchases for this booking.
              </p>
            ) : (
              <div className="space-y-2">
                {purchases.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50/70 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.quantity} &times; {formatPrice(item.unitPrice)}
                      </p>
                    </div>
                    <p className="font-bold text-slate-900">
                      {formatPrice(item.quantity * item.unitPrice)}
                    </p>
                  </div>
                ))}

                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-sm">
                  <span className="font-bold text-violet-700">
                    Purchases Total
                  </span>
                  <span className="font-extrabold text-violet-700">
                    {formatPrice(purchasesTotal)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}:</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}
