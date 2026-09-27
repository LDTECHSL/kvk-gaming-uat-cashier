import { Alert } from "@/components/ui/alert";
import {
  createGamingStation,
  deleteGamingStation,
  getGamingStationsByCategory,
  updateGamingStation,
} from "@/services/gaming-stations-api";
import {
  createSlotConfiguration,
  getSlotConfigurationByCategory,
  updateSlotConfiguration,
} from "@/services/slots-api";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

export default function PS5Settings() {
  const [ps5s, setPcs] = useState<any[]>([]);
  const [selectedPc, setSelectedPc] = useState<any>(null);

  const [pageAlert, setPageAlert] = useState<{
    visible: boolean;
    variant?: "success" | "error" | "warning" | "info";
    title?: string;
    description?: string;
  }>({ visible: false });

  const [loading, setLoading] = useState(false);

  // PS5 form
  const [name, setName] = useState("");
  const [status, setStatus] = useState(true);

  // Slot configuration
  const [id, setId] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("22:00");
  const [duration, setDuration] = useState(60);
  const [gap, setGap] = useState(0);
  const [price, setPrice] = useState("0.00");
  const [isConfigure, setIsConfigure] = useState(false);

  // Delete confirmation
  const [deletePc, setDeletePc] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const categories = localStorage.getItem("categories")
    ? JSON.parse(localStorage.getItem("categories") as string)
    : [];

  const navigate = useNavigate();

  const dayendData = localStorage.getItem("dayEndData")
    ? JSON.parse(localStorage.getItem("dayEndData") as string)
    : null;

  useEffect(() => {
    if (!dayendData) {
      navigate("/dayend");
    }
  }, [dayendData, navigate]);

  const ps5Category = categories.find(
    (category: any) => category.name === "PS5"
  );

  const ps5CategoryId = ps5Category?.id;

  // =========================================================
  // GET PS5s
  // =========================================================
  const handleGetPS5s = async () => {
    if (!ps5CategoryId) {
      setPageAlert({
        visible: true,
        variant: "error",
        title: "Error",
        description: "PS5 category not found. Please ensure it exists.",
      });
      return;
    }

    try {
      const response = await getGamingStationsByCategory(ps5CategoryId);
      setPcs(response);
    } catch (error) {
      console.error("Error fetching PS5s:", error);

      setPageAlert({
        visible: true,
        variant: "error",
        title: "Error",
        description: "Failed to fetch PS5s.",
      });
    }
  };

  // =========================================================
  // DELETE PS5
  // =========================================================
  const handleDeletePS5 = async (ps5Id: string) => {
    setDeleting(true);

    try {
      await deleteGamingStation(ps5Id);

      setPageAlert({
        visible: true,
        variant: "success",
        title: "PS5 Deleted",
        description: "The PS5 has been deleted successfully.",
      });

      // Close confirmation modal
      setDeletePc(null);

      // If deleted PS5 was selected, reset form
      if (selectedPc?.id === ps5Id) {
        setSelectedPc(null);
        setName("");
        setStatus(true);
      }

      // Refresh PS5 list
      await handleGetPS5s();
    } catch (error) {
      console.error("Error deleting PS5:", error);

      setPageAlert({
        visible: true,
        variant: "error",
        title: "Error",
        description: "Failed to delete PS5.",
      });
    } finally {
      setDeleting(false);
    }
  };

  // =========================================================
  // CREATE PS5
  // =========================================================
  const handleCreatePS5 = async () => {
    if (!ps5CategoryId) {
      setPageAlert({
        visible: true,
        variant: "error",
        title: "Error",
        description: "PS5 category not found. Please ensure it exists.",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await createGamingStation({
        name,
        gamingCategoryId: ps5CategoryId,
        isActive: status,
        stationCode: name.toUpperCase().replace(/\s+/g, "_"),
      });

      console.log("PS5 created successfully:", response);

      setPageAlert({
        visible: true,
        variant: "success",
        title: "PS5 Created",
        description: "The PS5 has been created successfully.",
      });

      setName("");
      setStatus(true);

      await handleGetPS5s();
    } catch (error) {
      console.error("Error creating PS5:", error);

      setPageAlert({
        visible: true,
        variant: "error",
        title: "Error",
        description: "Failed to create PS5.",
      });
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // UPDATE PS5
  // =========================================================
  const handleUpdatePS5 = async () => {
    if (!selectedPc) {
      setPageAlert({
        visible: true,
        variant: "error",
        title: "Error",
        description: "No PS5 selected for update.",
      });
      return;
    }

    setLoading(true);

    try {
      await updateGamingStation({
        id: selectedPc.id,
        gamingCategoryId: ps5CategoryId,
        stationCode: selectedPc.stationCode,
        name,
        isActive: status,
      });

      setPageAlert({
        visible: true,
        variant: "success",
        title: "PS5 Updated",
        description: "The PS5 has been updated successfully.",
      });

      setSelectedPc(null);
      setName("");
      setStatus(true);

      await handleGetPS5s();
    } catch (error) {
      console.error("Error updating PS5:", error);

      setPageAlert({
        visible: true,
        variant: "error",
        title: "Error",
        description: "Failed to update PS5.",
      });
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // GET SLOT CONFIGURATION
  // =========================================================
  const handleGetSlotConfiguration = async () => {
    if (!ps5CategoryId) {
      setPageAlert({
        visible: true,
        variant: "error",
        title: "Error",
        description: "PS5 category not found. Please ensure it exists.",
      });
      return;
    }

    try {
      const response = await getSlotConfigurationByCategory(ps5CategoryId);

      console.log("Fetched slot configuration:", response);

      setStartTime(response.startTime);
      setEndTime(response.endTime);

      setDuration(
        Number(
          response.slotDurationMinutes ??
          response.duration ??
          60
        )
      );

      setGap(
        Number(
          response.slotGapMinutes ??
          response.gap ??
          0
        )
      );

      setPrice(
        Number(response.price ?? 0).toFixed(2)
      );

      setId(response.id);
      setIsConfigure(true);
    } catch (error) {
      setStartTime("09:00");
      setEndTime("22:00");
      setDuration(60);
      setGap(0);
      setPrice("0.00");
      setIsConfigure(false);
    }
  };

  // =========================================================
  // UPDATE SLOT CONFIGURATION
  // =========================================================
  const handleUpdateSlotConfiguration = async (configId: string) => {
    if (!ps5CategoryId) {
      setPageAlert({
        visible: true,
        variant: "error",
        title: "Error",
        description: "PS5 category not found. Please ensure it exists.",
      });
      return;
    }

    setLoading(true);

    try {
      await updateSlotConfiguration({
        id: configId,
        gamingCategoryId: ps5CategoryId,
        startTime,
        endTime,
        slotDurationMinutes: duration,
        slotGapMinutes: gap,
        isActive: 1,
        price: Number(price),
      });

      setPageAlert({
        visible: true,
        variant: "success",
        title: "Slot Configuration Updated",
        description:
          "The slot configuration has been updated successfully.",
      });

      await handleGetSlotConfiguration();
    } catch (error) {
      console.error("Error updating slot configuration:", error);

      setPageAlert({
        visible: true,
        variant: "error",
        title: "Error",
        description: "Failed to update slot configuration.",
      });
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // CREATE SLOT CONFIGURATION
  // =========================================================
  const handleCreateSlotConfiguration = async () => {
    if (!ps5CategoryId) {
      setPageAlert({
        visible: true,
        variant: "error",
        title: "Error",
        description: "PS5 category not found. Please ensure it exists.",
      });
      return;
    }

    setLoading(true);

    try {
      await createSlotConfiguration({
        gamingCategoryId: ps5CategoryId,
        startTime,
        endTime,
        slotDurationMinutes: duration,
        slotGapMinutes: gap,
        isActive: 1,
        price: Number(price),
      });

      setPageAlert({
        visible: true,
        variant: "success",
        title: "Slot Configuration Created",
        description:
          "The slot configuration has been created successfully.",
      });

      await handleGetSlotConfiguration();
    } catch (error) {
      console.error("Error creating slot configuration:", error);

      setPageAlert({
        visible: true,
        variant: "error",
        title: "Error",
        description: "Failed to create slot configuration.",
      });
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // LOAD DATA
  // =========================================================
  useEffect(() => {
    if (ps5CategoryId) {
      handleGetPS5s();
      handleGetSlotConfiguration();
    }
  }, [ps5CategoryId]);

  // =========================================================
  // RESET FORM
  // =========================================================
  const resetForm = () => {
    setSelectedPc(null);
    setName("");
    setStatus(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

      {/* =====================================================
          ALERT
      ===================================================== */}
      {pageAlert.visible && (
        <div>
          <Alert
            variant={pageAlert.variant as any}
            title={pageAlert.title}
            description={pageAlert.description}
            onClose={() =>
              setPageAlert((s) => ({
                ...s,
                visible: false,
              }))
            }
          />
        </div>
      )}

      {/* =====================================================
          LOADING
      ===================================================== */}
      {loading &&
        createPortal(
          <div className="fixed inset-0 z-[9999999999] flex items-center justify-center bg-black/60 backdrop-blur-md">
            <div className="flex flex-col items-center gap-3">
              <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/30 border-t-white" />
              <p className="text-sm text-white font-medium">
                Loading
              </p>
            </div>
          </div>,
          document.body
        )}

      {/* =====================================================
          HEADER
      ===================================================== */}
      <div>
        <h1 className="text-2xl font-semibold">
          PS5 Settings
        </h1>
      </div>

      {/* =====================================================
          PS5 CONFIGURATION + PS5 LIST
      ===================================================== */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* ===================================================
            LEFT FORM
        =================================================== */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold mb-6">
            PS5 Configuration
          </h2>

          <div className="space-y-5 grid md:grid-cols-1 gap-5">

            {/* PS5 NAME */}
            <div>
              <label className="text-sm text-gray-600 block mb-2">
                PS5 Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 rounded-xl border border-gray-200 px-3 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
            </div>

            {/* STATUS */}
            <div>
              <label className="text-sm text-gray-600 block mb-2">
                Status
              </label>

              <button
                type="button"
                onClick={() => setStatus(!status)}
                className={`
                  relative w-12 h-6 rounded-full transition-all cursor-pointer
                  ${status ? "bg-green-500" : "bg-gray-300"}
                `}
              >
                <span
                  className={`
                    absolute top-0.5 left-0.5
                    w-5 h-5 bg-white rounded-full
                    transition-transform
                    ${status ? "translate-x-6" : ""}
                  `}
                />
              </button>
            </div>

            {/* ACTIONS */}
            <div className="flex justify-end">

              {selectedPc ? (
                <>
                  {/* RESET */}
                  <button
                    type="button"
                    onClick={resetForm}
                    className="
                      h-11 px-5 rounded-xl
                      cursor-pointer
                      bg-gray-200
                      text-gray-700
                      mr-3
                    "
                  >
                    Reset
                  </button>

                  {/* UPDATE */}
                  <button
                    type="button"
                    onClick={handleUpdatePS5}
                    disabled={!name}
                    className="
                      h-11 px-5 rounded-xl
                      cursor-pointer
                      bg-gradient-to-r
                      from-red-500
                      via-red-600
                      to-red-700
                      text-white
                      disabled:opacity-50
                    "
                  >
                    Update PS5
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleCreatePS5}
                  disabled={!name}
                  className="
                    h-11 px-5 rounded-xl
                    cursor-pointer
                    bg-gradient-to-r
                    from-red-500
                    via-red-600
                    to-red-700
                    text-white
                    disabled:opacity-50
                  "
                >
                  Create PS5
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ===================================================
            PS5 LIST
        =================================================== */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">

          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">
              PS5 List
            </h2>
          </div>

          <div className="max-h-[500px] overflow-y-auto space-y-2">

            {ps5s.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500">
                No PS5s available.
              </div>
            ) : (
              ps5s.map((ps5) => (
                <div
                  key={ps5.id}
                  onClick={() => {
                    setSelectedPc(ps5);
                    setName(ps5.name);
                    setStatus(ps5.isActive);
                  }}
                  className={`
                    w-full p-3 rounded-xl border
                    text-left transition-all
                    cursor-pointer
                    hover:bg-gray-50
                    ${selectedPc?.id === ps5.id
                      ? "border-amber-500 bg-amber-50"
                      : "border-gray-200"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">

                    {/* PS5 NAME */}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium block truncate">
                        {ps5.name}
                      </span>

                      {ps5.stationCode && (
                        <span className="text-xs text-gray-400">
                          {ps5.stationCode}
                        </span>
                      )}
                    </div>

                    {/* STATUS */}
                    <span
                      className={`
                        shrink-0
                        px-2 py-1 rounded-full text-xs
                        ${ps5.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                        }
                      `}
                    >
                      {ps5.isActive ? "Active" : "Inactive"}
                    </span>

                    {/* DELETE */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();

                        // Open confirmation modal
                        setDeletePc(ps5);
                      }}
                      className="
                        shrink-0
                        w-9 h-9
                        bg-red-500
                        hover:bg-red-600
                        text-white
                        rounded-xl
                        transition-colors
                        cursor-pointer
                        flex items-center justify-center
                      "
                      title="Delete PS5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                  </div>
                </div>
              ))
            )}

          </div>
        </div>
      </div>

      {/* =====================================================
          SLOT CONFIGURATION
      ===================================================== */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">

        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold">
            PS5 Slot Configuration
          </h2>
        </div>

        {!isConfigure && (
          <div className="text-center py-10">
            <p className="text-gray-500">
              No slot configuration available.
              Create a new slot configuration to get started.
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-5">

          {/* START TIME */}
          <div>
            <label className="text-sm text-gray-600 block mb-2">
              Start Time
            </label>

            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full h-11 rounded-xl border border-gray-200 px-3"
            />
          </div>

          {/* END TIME */}
          <div>
            <label className="text-sm text-gray-600 block mb-2">
              End Time
            </label>

            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full h-11 rounded-xl border border-gray-200 px-3"
            />
          </div>

          {/* DURATION */}
          <div>
            <label className="text-sm text-gray-600 block mb-2">
              Duration (Minutes)
            </label>

            <input
              type="number"
              value={duration}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full h-11 rounded-xl border border-gray-200 px-3"
            />
          </div>

          {/* GAP */}
          <div>
            <label className="text-sm text-gray-600 block mb-2">
              Gap (Minutes)
            </label>

            <input
              type="number"
              value={gap}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setGap(Number(e.target.value))}
              className="w-full h-11 rounded-xl border border-gray-200 px-3"
            />
          </div>

          {/* PRICE */}
          <div>
            <label className="text-sm text-gray-600 block mb-2">
              Price
            </label>

            <input
              type="text"
              inputMode="decimal"
              value={price}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const value = e.target.value;

                // Allow empty value
                if (value === "") {
                  setPrice("");
                  return;
                }

                // Only allow numbers with maximum 2 decimal places
                if (/^\d+(\.\d{0,2})?$/.test(value)) {
                  setPrice(value);
                }
              }}
              onBlur={() => {
                if (price === "") {
                  setPrice("0.00");
                  return;
                }

                setPrice(Number(price).toFixed(2));
              }}
              placeholder="0.00"
              className="w-full h-11 rounded-xl border border-gray-200 px-3 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
          </div>
        </div>

        {/* SLOT ACTION */}
        <div className="flex justify-end mt-6">

          {!isConfigure ? (
            <button
              type="button"
              onClick={handleCreateSlotConfiguration}
              className="
                h-11 px-5 rounded-xl
                bg-gradient-to-r
                from-red-500
                via-red-600
                to-red-700
                text-white
                cursor-pointer
              "
            >
              Create Configuration
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                handleUpdateSlotConfiguration(id)
              }
              className="
                h-11 px-5 rounded-xl
                bg-gradient-to-r
                from-red-500
                via-red-600
                to-red-700
                text-white
                cursor-pointer
              "
            >
              Update Configuration
            </button>
          )}

        </div>
      </div>

      {/* =====================================================
          DELETE CONFIRMATION MODAL
      ===================================================== */}
      {deletePc && (
        <DeleteConfirmModal
          ps5={deletePc}
          deleting={deleting}
          onClose={() => {
            if (!deleting) {
              setDeletePc(null);
            }
          }}
          onConfirm={() => {
            handleDeletePS5(deletePc.id);
          }}
        />
      )}
    </div>
  );
}

/* ============================================================
   DELETE CONFIRMATION MODAL
============================================================ */

const DeleteConfirmModal = ({
  ps5,
  deleting,
  onClose,
  onConfirm,
}: {
  ps5: any;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) => {
  return createPortal(
    <div
      className="
        fixed inset-0
        z-[9999999999]
        flex items-center justify-center
        bg-slate-950/50
        p-4
        backdrop-blur-sm
      "
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !deleting) {
          onClose();
        }
      }}
    >
      <div
        className="
          w-full max-w-md
          overflow-hidden
          rounded-2xl
          border border-slate-200
          bg-white
          shadow-2xl
        "
        onMouseDown={(e) => e.stopPropagation()}
      >

        {/* ==================================================
            MODAL CONTENT
        ================================================== */}
        <div className="p-6 space-y-4 text-center">

          {/* ICON + CLOSE */}
          <div className="flex items-center justify-center">

            <div
              className="
                flex h-12 w-12
                items-center justify-center
                rounded-xl
                bg-red-50
                text-red-600
              "
            >
              <Trash2 size={22} />
            </div>
          </div>

          {/* TITLE */}
          <h3 className="mt-5 text-lg font-bold text-slate-900">
            Delete PS5?
          </h3>

          {/* DESCRIPTION */}
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-700">
              {ps5?.name}
            </span>
            ?
          </p>

          <p className="mt-2 text-xs text-slate-400">
            This action cannot be undone.
          </p>

        </div>

        {/* ==================================================
            FOOTER
        ================================================== */}
        <div
          className="
            flex flex-col-reverse gap-3
            border-t border-slate-200
            bg-slate-50/70
            px-6 py-4
            sm:flex-row
            sm:justify-end
          "
        >

          {/* CANCEL */}
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="
              w-full
              cursor-pointer
              rounded-xl
              border border-slate-200
              bg-white
              px-5 py-2.5
              text-sm font-semibold
              text-slate-700
              transition
              hover:bg-slate-50
              disabled:cursor-not-allowed
              disabled:opacity-60
              sm:w-auto
            "
          >
            Cancel
          </button>

          {/* DELETE */}
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="
              inline-flex
              w-full
              cursor-pointer
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-red-600
              px-5 py-2.5
              text-sm font-semibold
              text-white
              transition
              hover:bg-red-700
              disabled:cursor-not-allowed
              disabled:opacity-60
              sm:w-auto
            "
          >
            {deleting && (
              <div
                className="
                  h-4 w-4
                  animate-spin
                  rounded-full
                  border-2
                  border-white/40
                  border-t-white
                "
              />
            )}

            {deleting ? "Deleting..." : "Delete"}
          </button>

        </div>
      </div>
    </div>,
    document.body
  );
};