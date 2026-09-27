import { useEffect, useState } from "react";
import {
  Calendar,
  ChevronRight,
  X,
  Gamepad2,
  Clock3,
  MapPin,
  Check,
  Minus,
  Plus,
  ShoppingBag,
  CreditCard,
  Banknote,
  User,
  Phone,
  Sparkles,
  CircleCheck,
} from "lucide-react";
import { getCategories } from "@/services/categories-api";
import { getGamingStationsByCategory } from "@/services/gaming-stations-api";
import { getSlotsAvailability } from "@/services/slots-api";
import {
  confirmBooking,
  multiHoldBooking,
} from "@/services/bookings-api";
import { useNavigate } from "react-router-dom";
import { getNextWorkingDays } from "@/services/holidays-api";
import { createPortal } from "react-dom";
import { getAdditionalPurchasesByCategory } from "@/services/gaming-additional-api";

export default function Bookings() {
  const [selectedDate, setSelectedDate] = useState(0);

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedStation, setSelectedStation] = useState("");

  const [days, setDays] = useState<
    { label: string; day: number; date: string }[]
  >([]);

  const [gamingStations, setGamingStations] = useState<any[]>([]);
  const [slotsAvailability, setSlotsAvailability] = useState<any[]>([]);

  const [selectedGamingStation, setSelectedGamingStation] = useState("");
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // ---------------------------------------------------------
  // Loading
  // ---------------------------------------------------------

  const [loading, setLoading] = useState(false);

  // ---------------------------------------------------------
  // Customer Details
  // ---------------------------------------------------------

  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // 1 = Cash, 2 = Card
  const [paymentType, setPaymentType] = useState<number>(1);

  // ---------------------------------------------------------
  // Hold IDs returned from multi hold API
  // ---------------------------------------------------------

  const [holdIds, setHoldIds] = useState<string[]>([]);

  // ---------------------------------------------------------
  // Additional Purchases
  // ---------------------------------------------------------

  const [additionalPurchases, setAdditionalPurchases] = useState<any[]>(
    []
  );

  const [selectedAdditionalPurchases, setSelectedAdditionalPurchases] =
    useState<Record<string, number>>({});

  const navigate = useNavigate();

  const dayendData = localStorage.getItem("dayEndData")
    ? JSON.parse(localStorage.getItem("dayEndData") as string)
    : null;

  useEffect(() => {
    if (!dayendData) {
      navigate("/dayend");
    }
  }, [dayendData, navigate]);

  // ---------------------------------------------------------
  // Additional Purchases
  // ---------------------------------------------------------

  const handleGetAdditionalPurchases = async (categoryId: string) => {
    try {
      const response = await getAdditionalPurchasesByCategory(categoryId);

      console.log("Additional Purchases:", response);

      setAdditionalPurchases(response || []);
      setSelectedAdditionalPurchases({});
    } catch (error) {
      console.error("Error fetching additional purchases:", error);
      setAdditionalPurchases([]);
      setSelectedAdditionalPurchases({});
    }
  };

  // ---------------------------------------------------------
  // Format Time
  // ---------------------------------------------------------

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);

    const date = new Date();
    date.setHours(hours, minutes, 0);

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // ---------------------------------------------------------
  // Toggle Slot
  // ---------------------------------------------------------

  const toggleSlot = (slotId: string) => {
    const slotIndex = slotsAvailability.findIndex(
      (s) => s.id === slotId
    );

    setSelectedSlots((prev) => {
      const existing = [...prev];

      // Deselect
      if (existing.includes(slotId)) {
        return existing.filter((id) => id !== slotId);
      }

      // First selection
      if (existing.length === 0) {
        return [slotId];
      }

      const indexes = existing.map((id) =>
        slotsAvailability.findIndex((s) => s.id === id)
      );

      const min = Math.min(...indexes);
      const max = Math.max(...indexes);

      // Allow only previous or next consecutive slot
      if (slotIndex === min - 1 || slotIndex === max + 1) {
        return [...existing, slotId];
      }

      return prev;
    });
  };

  const isSelected = (slotId: string) =>
    selectedSlots.includes(slotId);

  // ---------------------------------------------------------
  // Get Working Days
  // ---------------------------------------------------------

  const handleGetNextWorkingDays = async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const startDate = yesterday.toISOString().split("T")[0];

    try {
      const workingDays = await getNextWorkingDays(startDate, 7);

      const today = new Date();

      const todayDate = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("-");

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const tomorrowDate = [
        tomorrow.getFullYear(),
        String(tomorrow.getMonth() + 1).padStart(2, "0"),
        String(tomorrow.getDate()).padStart(2, "0"),
      ].join("-");

      const mappedDays = workingDays.map(
        (dateString: string) => {
          const dateOnly = dateString.split("T")[0];

          const date = new Date(`${dateOnly}T00:00:00`);

          let label = date.toLocaleDateString("en-US", {
            weekday: "short",
          });

          if (dateOnly === todayDate) {
            label = "Today";
          } else if (dateOnly === tomorrowDate) {
            label = "Tomorrow";
          }

          return {
            label,
            day: date.getDate(),
            date: dateString,
          };
        }
      );

      setDays(mappedDays);

      return mappedDays;
    } catch (error) {
      console.error(
        "Error fetching next working days:",
        error
      );

      return [];
    }
  };

  // ---------------------------------------------------------
  // Get Categories
  // ---------------------------------------------------------

  const handleGetCategories = async (
    workingDays: {
      label: string;
      day: number;
      date: string;
    }[]
  ) => {
    try {
      const response = await getCategories();

      setCategories(response);

      if (response.length > 0 && workingDays.length > 0) {
        setSelectedStation(response[0].id);

        handleGetGamingStations(
          response[0].id,
          workingDays[0].date
        );
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategories([]);
    }
  };

  // ---------------------------------------------------------
  // Get Gaming Stations
  // ---------------------------------------------------------

  const handleGetGamingStations = async (
    categoryId: string,
    date: string
  ) => {
    try {
      const response =
        await getGamingStationsByCategory(categoryId);

      setGamingStations(response);

      if (response.length > 0) {
        const firstStation = response[0];

        setSelectedGamingStation(firstStation.id);
        handleGetAdditionalPurchases(categoryId);

        handleGetSlotsAvailability(
          firstStation.id,
          categoryId,
          date
        );
      } else {
        setSelectedGamingStation("");
        setSlotsAvailability([]);
      }
    } catch (error) {
      console.error(
        "Error fetching gaming stations:",
        error
      );

      setGamingStations([]);
      setSlotsAvailability([]);
    }
  };

  // ---------------------------------------------------------
  // FINAL CONFIRM BOOKING
  // ---------------------------------------------------------

  const handleConfirmBooking = async () => {
    if (!customerName.trim()) {
      alert("Customer name is required.");
      return;
    }

    if (!phoneNumber.trim()) {
      alert("Phone number is required.");
      return;
    }

    if (!/^07\d{8}$/.test(phoneNumber)) {
      alert(
        "Please enter a valid Sri Lankan phone number."
      );
      return;
    }

    if (holdIds.length === 0) {
      alert(
        "No booking holds found. Please select the slots again."
      );
      return;
    }

    setLoading(true);

    try {
      const bookingData = {
        holdIds: holdIds,
        paymentIntentId: null,
        customerDetails: {
          customerName: customerName.trim(),
          phoneNumber: phoneNumber.trim(),
          paymentType: paymentType,
        },
      };

      console.log(
        "Confirm Booking Request:",
        bookingData
      );

      const response = await confirmBooking(
        bookingData
      );

      console.log(
        "Confirm Booking Response:",
        response
      );

      setIsBookingModalOpen(false);

      setSelectedSlots([]);
      setHoldIds([]);

      setCustomerName("");
      setPhoneNumber("");
      setPaymentType(1);
      setSelectedAdditionalPurchases({});

      if (
        selectedGamingStation &&
        selectedStation &&
        days[selectedDate]
      ) {
        await handleGetSlotsAvailability(
          selectedGamingStation,
          selectedStation,
          days[selectedDate].date
        );
      }

      alert(
        response?.message ||
        "Booking confirmed successfully."
      );
    } catch (error) {
      console.error(
        "Error confirming booking:",
        error
      );

      alert(
        "Unable to confirm the booking. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // HOLD BOOKING
  // ---------------------------------------------------------

  const handleBooking = async () => {
    if (!selectedGamingStation) {
      alert("Please select a gaming station.");
      return;
    }

    if (selectedSlots.length === 0) {
      alert("Please select at least one slot.");
      return;
    }

    if (!days[selectedDate]) {
      alert("Please select a booking date.");
      return;
    }

    setLoading(true);

    try {
      const bookingDate =
        days[selectedDate].date.split("T")[0];

      const bookings = selectedSlots.map((slotId) => ({
        gamingCategoryId: selectedStation,
        gamingStationId: selectedGamingStation,
        gamingSlotId: slotId,
        bookingDate,
      }));

      const request = {
        bookings,
        totalAmount,
        paymentTypes: 0,
        additionalPurchases: additionalPurchases
          .filter(
            (item) =>
              (selectedAdditionalPurchases[item.id] || 0) > 0
          )
          .map((item) => ({
            additionalPurchaseId: item.id,
            quantity: selectedAdditionalPurchases[item.id],
          })),
      };

      console.log(
        "Multi Hold Request:",
        request
      );

      const response = await multiHoldBooking(
        request
      );

      console.log(
        "Multi Hold Response:",
        response
      );

      const returnedHoldIds =
        response?.additionalData?.response
          ?.map((item: any) => item.holdId)
          ?.filter(Boolean) || [];

      if (returnedHoldIds.length === 0) {
        alert(
          "The slots could not be held. Please try again."
        );
        return;
      }

      setHoldIds(returnedHoldIds);

      console.log(
        "Stored Hold IDs:",
        returnedHoldIds
      );

      setCustomerName("");
      setPhoneNumber("");
      setPaymentType(1);

      setIsBookingModalOpen(true);
    } catch (error) {
      console.error(
        "Error holding booking slots:",
        error
      );

      alert(
        "Unable to hold the selected slots. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // Get Slots Availability
  // ---------------------------------------------------------

  const handleGetSlotsAvailability = async (
    stationId: string,
    categoryId: string,
    date: string
  ) => {
    try {
      const response =
        await getSlotsAvailability(
          stationId,
          categoryId,
          date
        );

      const now = new Date();

      const bookingDate =
        date.split("T")[0];

      const isToday =
        bookingDate ===
        now.toISOString().split("T")[0];

      const mappedSlots = response.map(
        (slot: any) => {
          let status:
            | "available"
            | "booked"
            | "past" = "available";

          if (slot.isBooked) {
            status = "booked";
          } else if (isToday) {
            const slotDateTime =
              new Date(
                `${bookingDate}T${slot.startTime}`
              );

            if (slotDateTime <= now) {
              status = "past";
            }
          }

          return {
            id: slot.id,
            startTime: slot.startTime,
            endTime: slot.endTime,
            time: formatTime(slot.startTime),
            status,
            price: slot.price,
          };
        }
      );

      setSlotsAvailability(mappedSlots);
    } catch (error) {
      console.error(
        "Error fetching slots:",
        error
      );

      setSlotsAvailability([]);
    }
  };

  // ---------------------------------------------------------
  // Initial Load
  // ---------------------------------------------------------

  useEffect(() => {
    const load = async () => {
      const workingDays =
        await handleGetNextWorkingDays();

      if (workingDays.length > 0) {
        await handleGetCategories(
          workingDays
        );
      }
    };

    load();
  }, []);

  // ---------------------------------------------------------
  // Selected Slots
  // ---------------------------------------------------------

  const selectedSlotObjects =
    slotsAvailability.filter((slot) =>
      selectedSlots.includes(slot.id)
    );

  const totalHours =
    selectedSlotObjects.length;

  const rate =
    selectedSlotObjects.length > 0
      ? selectedSlotObjects[0].price
      : 0;

  const slotTotalAmount =
    selectedSlotObjects.reduce(
      (sum, slot) =>
        sum + Number(slot.price || 0),
      0
    );

  const additionalPurchaseTotal = additionalPurchases.reduce(
    (sum, item) => {
      const quantity =
        selectedAdditionalPurchases[item.id] || 0;

      return (
        sum +
        Number(item.price || 0) *
          quantity
      );
    },
    0
  );

  const totalAmount =
    slotTotalAmount +
    additionalPurchaseTotal;

  // ---------------------------------------------------------
  // Close Booking Modal
  // ---------------------------------------------------------

  const closeBookingModal = async () => {
    setIsBookingModalOpen(false);

    setHoldIds([]);

    setSelectedSlots([]);

    setCustomerName("");
    setPhoneNumber("");
    setPaymentType(1);
    setSelectedAdditionalPurchases({});

    if (
      selectedGamingStation &&
      selectedStation &&
      days[selectedDate]
    ) {
      await handleGetSlotsAvailability(
        selectedGamingStation,
        selectedStation,
        days[selectedDate].date
      );
    }
  };

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex items-start gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <Gamepad2 size={24} strokeWidth={2} />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                    Gaming Booking
                  </h1>

                  <span className="hidden rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 sm:inline-flex">
                    LIVE
                  </span>
                </div>

                <p className="mt-1 text-sm text-gray-500">
                  Choose your gaming experience, station and
                  available time slots.
                </p>
              </div>

            </div>

            {/* Category */}

            <div className="w-full lg:w-72">

              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                Gaming Category
              </label>

              <div className="relative">
                <select
                  value={selectedStation}
                  onChange={(e) => {
                    const categoryId =
                      e.target.value;

                    setSelectedStation(categoryId);
                    setSelectedGamingStation("");
                    setSelectedSlots([]);

                    if (days[selectedDate]) {
                      handleGetGamingStations(
                        categoryId,
                        days[selectedDate].date
                      );
                    }
                  }}
                  className="
                    h-11
                    w-full
                    cursor-pointer
                    appearance-none
                    rounded-xl
                    border
                    border-gray-200
                    bg-white
                    px-4
                    pr-10
                    text-sm
                    font-medium
                    text-gray-800
                    shadow-sm
                    outline-none
                    transition
                    hover:border-gray-300
                    focus:border-red-400
                    focus:ring-4
                    focus:ring-red-50
                  "
                >
                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>

                <ChevronRight
                  size={17}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-gray-400"
                />
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* ===================================================
            DATE SELECTOR
        ==================================================== */}

        <section className="mb-7">

          <div className="mb-3 flex items-center justify-between">

            <div>
              <h2 className="text-sm font-bold text-gray-900">
                Select Date
              </h2>

              <p className="mt-0.5 text-xs text-gray-500">
                Choose when you want to play.
              </p>
            </div>

            <div className="hidden items-center gap-1.5 text-xs text-gray-400 sm:flex">
              <Calendar size={14} />
              Booking calendar
            </div>

          </div>

          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max gap-3">

              {days.map((day, index) => (
                <button
                  key={day.date}
                  onClick={() => {
                    setSelectedDate(index);
                    setSelectedSlots([]);

                    if (
                      selectedGamingStation
                    ) {
                      handleGetSlotsAvailability(
                        selectedGamingStation,
                        selectedStation,
                        day.date
                      );
                    }
                  }}
                  className={`
                    group
                    relative
                    flex
                    min-w-[118px]
                    cursor-pointer
                    flex-col
                    items-center
                    rounded-2xl
                    border
                    px-5
                    py-3.5
                    transition-all
                    duration-200

                    ${
                      selectedDate === index
                        ? "border-red-500 bg-red-500 text-white shadow-lg shadow-red-100"
                        : "border-gray-200 bg-white text-gray-700 shadow-sm hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md"
                    }
                  `}
                >

                  <span
                    className={`
                      text-[11px] font-semibold uppercase tracking-wide
                      ${
                        selectedDate === index
                          ? "text-red-100"
                          : "text-gray-400"
                      }
                    `}
                  >
                    {day.label}
                  </span>

                  <span
                    className={`
                      mt-0.5 text-xl font-bold
                      ${
                        selectedDate === index
                          ? "text-white"
                          : "text-gray-900"
                      }
                    `}
                  >
                    {day.day}
                  </span>

                  {selectedDate === index && (
                    <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-red-500" />
                  )}

                </button>
              ))}

            </div>
          </div>

        </section>

        {/* ===================================================
            GAMING STATIONS
        ==================================================== */}

        <section className="mb-7">

          <div className="mb-4 flex items-end justify-between">

            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Choose Your Station
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Select the gaming station you want to reserve.
              </p>
            </div>

            {gamingStations.length > 0 && (
              <span className="hidden text-xs font-medium text-gray-400 sm:block">
                {gamingStations.length} station
                {gamingStations.length !== 1 ? "s" : ""} available
              </span>
            )}

          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {gamingStations.map((station) => {
              const isActive =
                selectedGamingStation === station.id;

              return (
                <button
                  key={station.id}
                  type="button"
                  onClick={() => {
                    setSelectedGamingStation(
                      station.id
                    );

                    handleGetAdditionalPurchases(
                      station.categoryId
                    );

                    setSelectedSlots([]);

                    if (days[selectedDate]) {
                      handleGetSlotsAvailability(
                        station.id,
                        selectedStation,
                        days[selectedDate].date
                      );
                    }
                  }}
                  className={`
                    group
                    relative
                    min-h-[108px]
                    cursor-pointer
                    overflow-hidden
                    rounded-2xl
                    border
                    p-5
                    text-left
                    transition-all
                    duration-200

                    ${
                      isActive
                        ? "border-red-400 bg-white shadow-lg shadow-red-100/70 ring-1 ring-red-100"
                        : "border-gray-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md"
                    }
                  `}
                >

                  {/* Accent */}

                  <div
                    className={`
                      absolute left-0 top-0 h-full w-1 transition-all
                      ${
                        isActive
                          ? "bg-red-500"
                          : "bg-transparent group-hover:bg-red-200"
                      }
                    `}
                  />

                  <div className="flex items-start justify-between gap-3">

                    <div className="flex min-w-0 items-start gap-3">

                      <div
                        className={`
                          flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition
                          ${
                            isActive
                              ? "bg-red-50 text-red-600"
                              : "bg-gray-50 text-gray-500 group-hover:bg-red-50 group-hover:text-red-500"
                          }
                        `}
                      >
                        <Gamepad2 size={20} />
                      </div>

                      <div className="min-w-0">

                        <h3
                          className={`
                            truncate text-sm font-bold
                            ${
                              isActive
                                ? "text-red-700"
                                : "text-gray-900"
                            }
                          `}
                        >
                          {station.name}
                        </h3>

                        <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                          <MapPin size={12} />
                          Gaming Station
                        </div>

                      </div>

                    </div>

                    {isActive && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
                        <Check size={14} strokeWidth={3} />
                      </div>
                    )}

                  </div>

                </button>
              );
            })}

          </div>

        </section>

        {/* ===================================================
            BOOKING AREA
        ==================================================== */}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">

          {/* =================================================
              LEFT COLUMN
          ================================================== */}

          <div className="min-w-0 space-y-5">

            {/* SLOT CARD */}

            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

              <div className="border-b border-gray-100 px-5 py-4">

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                      <Clock3 size={19} />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        Available Time Slots
                      </h3>

                      <p className="mt-0.5 text-xs text-gray-500">
                        Select consecutive slots for your session.
                      </p>
                    </div>

                  </div>

                  <div className="flex items-center gap-3 text-[11px] font-medium">

                    <div className="flex items-center gap-1.5 text-gray-500">
                      <span className="h-2.5 w-2.5 rounded-full border border-gray-300 bg-white" />
                      Available
                    </div>

                    <div className="flex items-center gap-1.5 text-red-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                      Selected
                    </div>

                    <div className="flex items-center gap-1.5 text-gray-400">
                      <span className="h-2.5 w-2.5 rounded-full bg-green-100" />
                      Booked
                    </div>

                  </div>

                </div>

              </div>

              <div className="p-5">

                {slotsAvailability.length > 0 ? (

                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">

                    {slotsAvailability.map((slot) => {

                      const selected =
                        isSelected(slot.id);

                      const available =
                        slot.status === "available";

                      const booked =
                        slot.status === "booked";

                      const past =
                        slot.status === "past";

                      return (
                        <button
                          key={slot.id}
                          disabled={!available}
                          onClick={() =>
                            toggleSlot(slot.id)
                          }
                          className={`
                            relative
                            flex
                            min-h-[64px]
                            cursor-pointer
                            flex-col
                            items-center
                            justify-center
                            rounded-xl
                            border
                            px-2
                            transition-all
                            duration-150

                            ${
                              selected
                                ? "border-red-500 bg-red-500 text-white shadow-md shadow-red-100"
                                : available
                                  ? "border-gray-200 bg-white text-gray-800 hover:border-red-300 hover:bg-red-50/40"
                                  : booked
                                    ? "cursor-not-allowed border-green-100 bg-green-50 text-gray-400"
                                    : "cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300"
                            }
                          `}
                        >

                          {selected && (
                            <span className="absolute right-2 top-2">
                              <Check
                                size={13}
                                strokeWidth={3}
                              />
                            </span>
                          )}

                          <span
                            className={`
                              text-xs font-bold
                              ${
                                selected
                                  ? "text-white"
                                  : ""
                              }
                            `}
                          >
                            {slot.time}
                          </span>

                          <span
                            className={`
                              mt-1 text-[10px]
                              ${
                                selected
                                  ? "text-red-100"
                                  : booked
                                    ? "text-green-500"
                                    : past
                                      ? "text-gray-300"
                                      : "text-gray-400"
                              }
                            `}
                          >
                            {selected
                              ? "Selected"
                              : booked
                                ? "Booked"
                                : past
                                  ? "Unavailable"
                                  : "Available"}
                          </span>

                        </button>
                      );
                    })}

                  </div>

                ) : (

                  <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50">

                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-300 shadow-sm">
                      <Clock3 size={22} />
                    </div>

                    <p className="mt-3 text-sm font-semibold text-gray-500">
                      No slots available
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      Try selecting another date or station.
                    </p>

                  </div>

                )}

              </div>

            </section>

            {/* =================================================
                ADDITIONAL PURCHASES
            ================================================== */}

            {additionalPurchases.length > 0 && (
              <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

                <div className="border-b border-gray-100 px-5 py-4">

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                      <ShoppingBag size={19} />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        Additional Items
                      </h3>

                      <p className="mt-0.5 text-xs text-gray-500">
                        Enhance your gaming session with additional items.
                      </p>
                    </div>

                  </div>

                </div>

                <div className="grid gap-3 p-5 sm:grid-cols-2">

                  {additionalPurchases.map((item) => {

                    const quantity =
                      selectedAdditionalPurchases[
                        item.id
                      ] || 0;

                    return (
                      <div
                        key={item.id}
                        className={`
                          rounded-xl
                          border
                          p-4
                          transition-all
                          ${
                            quantity > 0
                              ? "border-orange-200 bg-orange-50/40"
                              : "border-gray-200 bg-white"
                          }
                        `}
                      >

                        <div className="flex items-center justify-between gap-4">

                          <div className="min-w-0">

                            <h4 className="truncate text-sm font-semibold text-gray-900">
                              {item.name}
                            </h4>

                            <p className="mt-1 text-sm font-bold text-red-600">
                              Rs.{" "}
                              {Number(
                                item.price || 0
                              ).toLocaleString()}
                            </p>

                          </div>

                          <div className="flex shrink-0 items-center rounded-xl border border-gray-200 bg-white p-1 shadow-sm">

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAdditionalPurchases(
                                  (prev) => {
                                    const current =
                                      prev[item.id] || 0;

                                    if (current <= 0) {
                                      return prev;
                                    }

                                    return {
                                      ...prev,
                                      [item.id]:
                                        current - 1,
                                    };
                                  }
                                );
                              }}
                              disabled={
                                quantity === 0
                              }
                              className="
                                flex
                                h-8
                                w-8
                                cursor-pointer
                                items-center
                                justify-center
                                rounded-lg
                                text-gray-500
                                transition
                                hover:bg-gray-100
                                disabled:cursor-not-allowed
                                disabled:opacity-30
                              "
                            >
                              <Minus size={15} />
                            </button>

                            <span className="w-8 text-center text-sm font-bold text-gray-900">
                              {quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAdditionalPurchases(
                                  (prev) => {
                                    const current =
                                      prev[item.id] || 0;

                                    if (current >= 4) {
                                      return prev;
                                    }

                                    return {
                                      ...prev,
                                      [item.id]:
                                        current + 1,
                                    };
                                  }
                                );
                              }}
                              disabled={
                                quantity >= 4
                              }
                              className="
                                flex
                                h-8
                                w-8
                                cursor-pointer
                                items-center
                                justify-center
                                rounded-lg
                                bg-red-500
                                text-white
                                transition
                                hover:bg-red-600
                                disabled:cursor-not-allowed
                                disabled:opacity-30
                              "
                            >
                              <Plus size={15} />
                            </button>

                          </div>

                        </div>

                      </div>
                    );
                  })}

                </div>

              </section>
            )}

          </div>

          {/* =================================================
              BOOKING SUMMARY
          ================================================== */}

          <aside className="h-fit lg:sticky lg:top-5">

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

              {/* Summary Header */}

              <div className="border-b border-gray-100 px-5 py-4">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <Calendar size={19} />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      Booking Summary
                    </h3>

                    <p className="mt-0.5 text-xs text-gray-500">
                      Review your reservation.
                    </p>
                  </div>

                </div>

              </div>

              <div className="p-5">

                {/* Selected station */}

                <div className="rounded-xl bg-gray-50 p-4">

                  <div className="flex items-start gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-red-500 shadow-sm">
                      <Gamepad2 size={17} />
                    </div>

                    <div className="min-w-0">

                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        Station
                      </p>

                      <p className="mt-1 truncate text-sm font-bold text-gray-900">
                        {
                          gamingStations.find(
                            (x) =>
                              x.id ===
                              selectedGamingStation
                          )?.name ||
                          "Select a station"
                        }
                      </p>

                    </div>

                  </div>

                </div>

                {/* Date */}

                <div className="mt-4 flex items-center justify-between">

                  <div className="flex items-center gap-2 text-gray-500">
                    <Calendar size={15} />
                    <span className="text-xs">
                      Date
                    </span>
                  </div>

                  <span className="text-xs font-semibold text-gray-900">
                    {days[selectedDate]
                      ? `${days[selectedDate].label}, ${days[selectedDate].day}`
                      : "-"}
                  </span>

                </div>

                {/* Hours */}

                <div className="mt-3 flex items-center justify-between">

                  <div className="flex items-center gap-2 text-gray-500">
                    <Clock3 size={15} />
                    <span className="text-xs">
                      Duration
                    </span>
                  </div>

                  <span className="text-xs font-semibold text-gray-900">
                    {totalHours}{" "}
                    {totalHours === 1
                      ? "Hour"
                      : "Hours"}
                  </span>

                </div>

                {/* Divider */}

                <div className="my-5 border-t border-gray-100" />

                {/* Price breakdown */}

                <div className="space-y-3">

                  <div className="flex justify-between gap-4">

                    <span className="text-xs text-gray-500">
                      Slot rate
                    </span>

                    <span className="text-sm font-medium text-gray-900">
                      Rs.{" "}
                      {Number(
                        rate
                      ).toLocaleString()}
                    </span>

                  </div>

                  <div className="flex justify-between gap-4">

                    <span className="text-xs text-gray-500">
                      Selected slots
                    </span>

                    <span className="text-sm font-medium text-gray-900">
                      {selectedSlots.length}
                    </span>

                  </div>

                  {additionalPurchaseTotal > 0 && (
                    <div className="flex justify-between gap-4">

                      <span className="text-xs text-gray-500">
                        Additional items
                      </span>

                      <span className="text-sm font-medium text-gray-900">
                        Rs.{" "}
                        {additionalPurchaseTotal.toLocaleString()}
                      </span>

                    </div>
                  )}

                </div>

                {/* Total */}

                <div className="mt-5 rounded-xl bg-red-50 p-4">

                  <div className="flex items-end justify-between gap-4">

                    <div>

                      <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400">
                        Total Amount
                      </p>

                      <p className="mt-1 text-2xl font-bold tracking-tight text-red-600">
                        Rs.{" "}
                        {totalAmount.toLocaleString()}
                      </p>

                    </div>

                    <Sparkles
                      size={20}
                      className="mb-1 text-red-400"
                    />

                  </div>

                </div>

                {/* Confirm button */}

                <button
                  onClick={handleBooking}
                  disabled={
                    selectedSlots.length === 0 ||
                    loading
                  }
                  className="
                    mt-4
                    flex
                    h-12
                    w-full
                    cursor-pointer
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-red-500
                    px-4
                    text-sm
                    font-bold
                    text-white
                    shadow-lg
                    shadow-red-100
                    transition-all
                    hover:bg-red-600
                    hover:shadow-red-200
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                    disabled:shadow-none
                  "
                >
                  Continue Booking
                  <ChevronRight size={18} />
                </button>

                <p className="mt-3 text-center text-[10px] leading-4 text-gray-400">
                  Your selected slots will be held before
                  completing the customer details.
                </p>

              </div>

            </div>

          </aside>

        </div>

      </main>

      {/* =====================================================
          CUSTOMER DETAILS MODAL
      ====================================================== */}

      {isBookingModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-gray-900/30 p-3 backdrop-blur-sm sm:p-5">

            <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">

              {/* Modal Header */}

              <div className="flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4 sm:px-6">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <User size={19} />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
                      Confirm Booking
                    </h2>

                    <p className="mt-0.5 text-xs text-gray-500">
                      Enter customer details to complete the booking.
                    </p>
                  </div>

                </div>

                <button
                  onClick={closeBookingModal}
                  disabled={loading}
                  className="
                    flex
                    h-9
                    w-9
                    cursor-pointer
                    items-center
                    justify-center
                    rounded-xl
                    text-gray-400
                    transition
                    hover:bg-gray-100
                    hover:text-gray-700
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  <X size={18} />
                </button>

              </div>

              {/* Modal Body */}

              <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">

                {/* Customer Details */}

                <div>

                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-gray-900">
                      Customer Information
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      Please provide the customer's contact details.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">

                    {/* Name */}

                    <div>

                      <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                        Customer Name
                        <span className="ml-1 text-red-500">
                          *
                        </span>
                      </label>

                      <div className="relative">

                        <User
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) =>
                            setCustomerName(
                              e.target.value
                            )
                          }
                          required
                          className="
                            h-11
                            w-full
                            rounded-xl
                            border
                            border-gray-200
                            bg-white
                            pl-10
                            pr-3
                            text-sm
                            outline-none
                            transition
                            placeholder:text-gray-400
                            hover:border-gray-300
                            focus:border-red-400
                            focus:ring-4
                            focus:ring-red-50
                          "
                          placeholder="Enter customer name"
                        />

                      </div>

                    </div>

                    {/* Phone */}

                    <div>

                      <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                        Phone Number
                        <span className="ml-1 text-red-500">
                          *
                        </span>
                      </label>

                      <div className="relative">

                        <Phone
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={phoneNumber}
                          onChange={(e) => {
                            const value =
                              e.target.value.replace(
                                /\D/g,
                                ""
                              );

                            setPhoneNumber(
                              value
                            );
                          }}
                          required
                          className="
                            h-11
                            w-full
                            rounded-xl
                            border
                            border-gray-200
                            bg-white
                            pl-10
                            pr-3
                            text-sm
                            outline-none
                            transition
                            placeholder:text-gray-400
                            hover:border-gray-300
                            focus:border-red-400
                            focus:ring-4
                            focus:ring-red-50
                          "
                          placeholder="07XXXXXXXX"
                        />

                      </div>

                    </div>

                  </div>

                </div>

                {/* Payment */}

                <div className="mt-6 border-t border-gray-100 pt-6">

                  <div className="mb-4">

                    <h3 className="text-sm font-bold text-gray-900">
                      Payment Method
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      Select how the customer will pay.
                    </p>

                  </div>

                  <div className="grid grid-cols-2 gap-3">

                    {/* Cash */}

                    <label
                      className={`
                        flex
                        cursor-pointer
                        items-center
                        gap-3
                        rounded-xl
                        border
                        p-3.5
                        transition
                        ${
                          paymentType === 1
                            ? "border-red-400 bg-red-50 ring-1 ring-red-100"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }
                      `}
                    >

                      <input
                        type="radio"
                        name="paymentType"
                        value="1"
                        checked={
                          paymentType === 1
                        }
                        onChange={() =>
                          setPaymentType(1)
                        }
                        className="sr-only"
                      />

                      <div
                        className={`
                          flex
                          h-9
                          w-9
                          items-center
                          justify-center
                          rounded-lg
                          ${
                            paymentType === 1
                              ? "bg-red-500 text-white"
                              : "bg-gray-100 text-gray-500"
                          }
                        `}
                      >
                        <Banknote size={17} />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900">
                          Cash
                        </p>

                        <p className="mt-0.5 text-[10px] text-gray-400">
                          Pay at counter
                        </p>
                      </div>

                      {paymentType === 1 && (
                        <Check
                          size={16}
                          className="ml-auto text-red-500"
                          strokeWidth={3}
                        />
                      )}

                    </label>

                    {/* Card */}

                    <label
                      className={`
                        flex
                        cursor-pointer
                        items-center
                        gap-3
                        rounded-xl
                        border
                        p-3.5
                        transition
                        ${
                          paymentType === 2
                            ? "border-red-400 bg-red-50 ring-1 ring-red-100"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }
                      `}
                    >

                      <input
                        type="radio"
                        name="paymentType"
                        value="2"
                        checked={
                          paymentType === 2
                        }
                        onChange={() =>
                          setPaymentType(2)
                        }
                        className="sr-only"
                      />

                      <div
                        className={`
                          flex
                          h-9
                          w-9
                          items-center
                          justify-center
                          rounded-lg
                          ${
                            paymentType === 2
                              ? "bg-red-500 text-white"
                              : "bg-gray-100 text-gray-500"
                          }
                        `}
                      >
                        <CreditCard size={17} />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900">
                          Card
                        </p>

                        <p className="mt-0.5 text-[10px] text-gray-400">
                          Pay by card
                        </p>
                      </div>

                      {paymentType === 2 && (
                        <Check
                          size={16}
                          className="ml-auto text-red-500"
                          strokeWidth={3}
                        />
                      )}

                    </label>

                  </div>

                </div>

                {/* Booking Summary */}

                <div className="mt-6 border-t border-gray-100 pt-6">

                  <div className="mb-4 flex items-center justify-between">

                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        Booking Summary
                      </h3>

                      <p className="mt-1 text-xs text-gray-500">
                        Review selected slots and items.
                      </p>
                    </div>

                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-600">
                      {selectedSlots.length} Slot
                      {selectedSlots.length !== 1
                        ? "s"
                        : ""}
                    </span>

                  </div>

                  <div className="overflow-hidden rounded-2xl border border-gray-200">

                    {/* Station */}

                    <div className="border-b border-gray-100 bg-gray-50/70 p-4">

                      <div className="flex items-center gap-3">

                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-red-500 shadow-sm">
                          <Gamepad2 size={17} />
                        </div>

                        <div>

                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                            Gaming Station
                          </p>

                          <p className="mt-0.5 text-sm font-bold text-gray-900">
                            {
                              gamingStations.find(
                                (x) =>
                                  x.id ===
                                  selectedGamingStation
                              )?.name
                            }
                          </p>

                        </div>

                      </div>

                    </div>

                    {/* Slots */}

                    <div className="p-4">

                      <p className="mb-3 text-xs font-bold text-gray-700">
                        Selected Time Slots
                      </p>

                      <div className="space-y-2">

                        {selectedSlotObjects.map(
                          (slot: any) => (
                            <div
                              key={slot.id}
                              className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5"
                            >

                              <div className="flex items-center gap-2">

                                <Clock3
                                  size={14}
                                  className="text-gray-400"
                                />

                                <span className="text-xs font-medium text-gray-700">
                                  {slot.startTime}{" "}
                                  -{" "}
                                  {slot.endTime}
                                </span>

                              </div>

                              <span className="text-xs font-semibold text-gray-900">
                                Rs.{" "}
                                {Number(
                                  slot.price
                                ).toLocaleString()}
                              </span>

                            </div>
                          )
                        )}

                      </div>

                      {/* Additional */}

                      {additionalPurchaseTotal > 0 && (
                        <div className="mt-5 border-t border-gray-100 pt-4">

                          <div className="mb-3 flex items-center gap-2">

                            <ShoppingBag
                              size={15}
                              className="text-orange-500"
                            />

                            <p className="text-xs font-bold text-gray-700">
                              Additional Purchases
                            </p>

                          </div>

                          <div className="space-y-2">

                            {additionalPurchases
                              .filter(
                                (item) =>
                                  (selectedAdditionalPurchases[
                                    item.id
                                  ] || 0) > 0
                              )
                              .map((item) => (
                                <div
                                  key={item.id}
                                  className="flex justify-between gap-3 text-xs"
                                >

                                  <span className="text-gray-500">
                                    {item.name} ×{" "}
                                    {
                                      selectedAdditionalPurchases[
                                        item.id
                                      ]
                                    }
                                  </span>

                                  <span className="font-semibold text-gray-900">
                                    Rs.{" "}
                                    {(
                                      Number(
                                        item.price ||
                                          0
                                      ) *
                                      (selectedAdditionalPurchases[
                                        item.id
                                      ] || 0)
                                    ).toLocaleString()}
                                  </span>

                                </div>
                              ))}

                          </div>

                        </div>
                      )}

                    </div>

                    {/* Total */}

                    <div className="border-t border-gray-100 bg-red-50/70 p-4">

                      <div className="flex items-center justify-between">

                        <div>

                          <p className="text-[10px] font-semibold uppercase tracking-wide text-red-400">
                            Total Amount
                          </p>

                          <p className="mt-1 text-xl font-bold text-red-600">
                            Rs.{" "}
                            {totalAmount.toLocaleString()}
                          </p>

                        </div>

                        <CircleCheck
                          size={22}
                          className="text-red-400"
                        />

                      </div>

                    </div>

                  </div>

                </div>

              </div>

              {/* Modal Footer */}

              <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-white p-4 sm:flex-row sm:justify-end sm:p-5">

                <button
                  onClick={closeBookingModal}
                  disabled={loading}
                  className="
                    h-11
                    cursor-pointer
                    rounded-xl
                    border
                    border-gray-200
                    bg-white
                    px-5
                    text-sm
                    font-semibold
                    text-gray-600
                    transition
                    hover:bg-gray-50
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  Cancel
                </button>

                <button
                  onClick={handleConfirmBooking}
                  disabled={
                    loading ||
                    !customerName.trim() ||
                    !phoneNumber.trim()
                  }
                  className="
                    flex
                    h-11
                    cursor-pointer
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-red-500
                    px-6
                    text-sm
                    font-bold
                    text-white
                    shadow-lg
                    shadow-red-100
                    transition
                    hover:bg-red-600
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                    disabled:shadow-none
                  "
                >
                  <Check size={16} strokeWidth={3} />
                  Confirm Booking
                </button>

              </div>

            </div>

          </div>,
          document.body
        )}

      {/* =====================================================
          GLOBAL LOADING OVERLAY
      ====================================================== */}

      {loading &&
        createPortal(
          <div className="fixed inset-0 z-[9999999999] flex items-center justify-center bg-white/70 backdrop-blur-sm">

            <div className="flex min-w-[150px] flex-col items-center rounded-2xl border border-gray-200 bg-white px-7 py-6 shadow-xl">

              <div className="h-11 w-11 animate-spin rounded-full border-4 border-red-100 border-t-red-500" />

              <p className="mt-3 text-sm font-semibold text-gray-700">
                Processing...
              </p>

              <p className="mt-1 text-[11px] text-gray-400">
                Please wait a moment
              </p>

            </div>

          </div>,
          document.body
        )}

    </div>
  );
}