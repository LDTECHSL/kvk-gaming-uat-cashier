import { useEffect, useMemo, useState } from "react";
import type {
  ChangeEvent,
  DragEvent,
  ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Gamepad2,
  ImagePlus,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  createGame,
  deleteGame as deleteGameApi,
  getGames,
  updateGame,
} from "@/services/game-api";
import Alert from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Game = {
  id: string;
  name: string;
  description: string;
  image?: string | null;
  isActive: boolean;
};

type GameForm = {
  id?: string;
  name: string;
  description: string;
  isActive: boolean;
};

type ModalMode = "create" | "edit";

const PAGE_SIZE = 10;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const getValue = (
  obj: any,
  ...keys: string[]
) => {
  return keys.reduce(
    (value, key) => value ?? obj?.[key],
    undefined
  );
};

const normalizeGame = (item: any): Game => {
  const rawId = getValue(
    item,
    "id",
    "Id",
    "gameId",
    "GameId",
    "gameID",
    "GameID",
    "game_id",
    "Game_Id",
    "_id"
  );

  return {
    id: String(rawId ?? "").trim(),

    name: String(
      getValue(item, "name", "Name") ?? ""
    ),

    description: String(
      getValue(item, "description", "Description") ?? ""
    ),

    image:
      getValue(item, "image", "Image") ??
      getValue(item, "imageUrl", "ImageUrl") ??
      null,

    isActive:
      Boolean(
        getValue(item, "isActive", "IsActive")
      ) === true,
  };
};

const extractGames = (response: any): Game[] => {
  const data = response?.data ?? response;

  let list: any[] = [];

  if (Array.isArray(data)) {
    list = data;
  } else if (Array.isArray(data?.response)) {
    list = data.response;
  } else if (Array.isArray(data?.Response)) {
    list = data.Response;
  } else if (
    Array.isArray(data?.additionalData?.response)
  ) {
    list = data.additionalData.response;
  } else if (
    Array.isArray(data?.additionalData?.Response)
  ) {
    list = data.additionalData.Response;
  } else if (Array.isArray(data?.raw)) {
    list = data.raw;
  } else if (Array.isArray(data?.items)) {
    list = data.items;
  } else if (Array.isArray(data?.Items)) {
    list = data.Items;
  }

  return list.map(normalizeGame);
};

const getImageSrc = (image?: string | null) => {
  if (!image) return null;

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:")
  ) {
    return image;
  }

  return `data:image/png;base64,${image}`;
};

/* -------------------------------------------------------------------------- */
/* Summary Card                                                               */
/* -------------------------------------------------------------------------- */

const SummaryCard = ({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  description: string;
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
          {icon}
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Status Badge                                                               */
/* -------------------------------------------------------------------------- */

const StatusBadge = ({
  isActive,
}: {
  isActive: boolean;
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isActive
        ? "bg-emerald-50 text-emerald-700"
        : "bg-slate-100 text-slate-500"
        }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isActive
          ? "bg-emerald-500"
          : "bg-slate-400"
          }`}
      />

      {isActive ? "Active" : "Inactive"}
    </span>
  );
};

/* -------------------------------------------------------------------------- */
/* Empty State                                                                */
/* -------------------------------------------------------------------------- */

const EmptyState = ({
  search,
  onCreate,
}: {
  search: string;
  onCreate: () => void;
}) => {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
        <Gamepad2 size={30} />
      </div>

      <h3 className="mt-5 text-base font-semibold text-slate-900">
        {search
          ? "No games found"
          : "No games available"}
      </h3>

      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
        {search
          ? "Try changing your search keyword."
          : "Create your first game to start managing the gaming centre."}
      </p>

      {!search && (
        <button
          type="button"
          onClick={onCreate}
          className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
        >
          <Plus size={17} />
          Add Game
        </button>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Game Modal                                                                 */
/* -------------------------------------------------------------------------- */

const GameModal = ({
  mode,
  form,
  imageFile,
  imagePreview,
  dragging,
  submitting,
  onClose,
  onSubmit,
  onChange,
  onImageChange,
  onDrop,
  onDragOver,
  onDragLeave,
}: {
  mode: ModalMode;
  form: GameForm;
  imageFile: File | null;
  imagePreview: string | null;
  dragging: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (
    e: React.FormEvent<HTMLFormElement>
  ) => void;
  onChange: (
    e: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement
    >
  ) => void;
  onImageChange: (file: File | null) => void;
  onDrop: (
    e: DragEvent<HTMLDivElement>
  ) => void;
  onDragOver: (
    e: DragEvent<HTMLDivElement>
  ) => void;
  onDragLeave: () => void;
}) => {
  return createPortal(
    <div
      className="fixed inset-0 z-[99990] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          if (!submitting) {
            onClose();
          }
        }
      }}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {mode === "create"
                ? "Add Game"
                : "Update Game"}
            </h2>

            <p className="mt-0.5 text-sm text-slate-500">
              {mode === "create"
                ? "Add a new game to the gaming centre."
                : "Update the selected game details."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed"
          >
            <X size={19} />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={onSubmit}
          className="overflow-y-auto"
        >
          <div className="space-y-5 p-6">
            {/* Name */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Game Name
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={onChange}
                placeholder="Enter game name"
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Description
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <textarea
                name="description"
                value={form.description}
                onChange={onChange}
                rows={4}
                required
                placeholder="Enter game description"
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
              />
            </div>

            {/* Image */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Game Image
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition ${dragging
                  ? "border-red-500 bg-red-50"
                  : "border-slate-200 bg-slate-50/70 hover:border-red-300 hover:bg-red-50/30"
                  }`}
              >
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Game preview"
                      className="h-56 w-full object-cover"
                    />

                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-4 pt-12">
                      <span className="truncate pr-3 text-xs font-medium text-white">
                        {imageFile?.name ??
                          "Current image"}
                      </span>

                      <label className="shrink-0 cursor-pointer rounded-lg bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-white">
                        Change

                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            onImageChange(
                              e.target.files?.[0] ??
                              null
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center px-6 py-10 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
                      {dragging ? (
                        <Upload size={22} />
                      ) : (
                        <ImagePlus size={22} />
                      )}
                    </div>

                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      {dragging
                        ? "Drop image here"
                        : "Upload game image"}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Drag & drop or click to browse
                    </p>

                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        onImageChange(
                          e.target.files?.[0] ??
                          null
                        )
                      }
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Game Status
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Enable this game when it is available
                    for customers.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={form.isActive}
                  onClick={() =>
                    onChange({
                      target: {
                        name: "isActive",
                        value: !form.isActive,
                      },
                    } as any)
                  }
                  className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition ${form.isActive
                    ? "bg-red-600"
                    : "bg-slate-300"
                    }`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${form.isActive
                      ? "left-6"
                      : "left-1"
                      }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed sm:w-auto"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {submitting && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}

              {mode === "create"
                ? "Create Game"
                : "Update Game"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

/* -------------------------------------------------------------------------- */
/* Delete Confirmation Modal                                                  */
/* -------------------------------------------------------------------------- */

const DeleteConfirmModal = ({
  game,
  deleting,
  onClose,
  onConfirm,
}: {
  game: Game;
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
            Delete Game
          </h3>

          {/* DESCRIPTION */}
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-700">
              {game.name}
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

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

const GamePage = () => {
  const [games, setGames] = useState<Game[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] =
    useState<ModalMode>("create");
  const [pageAlert, setPageAlert] = useState<{
    visible: boolean;
    variant?: "success" | "error" | "warning" | "info";
    title?: string;
    description?: string;
  }>({
    visible: false,
  });

  const [form, setForm] = useState<GameForm>({
    name: "",
    description: "",
    isActive: true,
  });

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [imagePreview, setImagePreview] =
    useState<string | null>(null);

  const [dragging, setDragging] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* Action Menu State                                                        */
  /* ------------------------------------------------------------------------ */

  const [openMenuGame, setOpenMenuGame] =
    useState<Game | null>(null);

  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const [deleteGame, setDeleteGame] =
    useState<Game | null>(null);

  const [deleting, setDeleting] = useState(false);

  const navigate = useNavigate();

  const dayendData = localStorage.getItem("dayEndData")
    ? JSON.parse(localStorage.getItem("dayEndData") as string)
    : null;

  useEffect(() => {
    if (!dayendData) {
      navigate("/dayend");
    }
  }, [dayendData, navigate]);

  /* ------------------------------------------------------------------------ */
  /* Load Games                                                               */
  /* ------------------------------------------------------------------------ */

  const loadGames = async () => {
    try {
      setLoading(true);

      const response = await getGames();

      const normalized = extractGames(response);

      setGames(normalized);
    } catch (error) {
      console.error("Failed to load games:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGames();
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Close Action Menu                                                        */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const closeMenu = () => {
      setOpenMenuGame(null);
      setMenuPosition(null);
    };

    window.addEventListener(
      "resize",
      closeMenu
    );

    window.addEventListener(
      "scroll",
      closeMenu,
      true
    );

    return () => {
      window.removeEventListener(
        "resize",
        closeMenu
      );

      window.removeEventListener(
        "scroll",
        closeMenu,
        true
      );
    };
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Search                                                                   */
  /* ------------------------------------------------------------------------ */

  const filteredGames = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    if (!keyword) return games;

    return games.filter((game) => {
      return (
        game.name
          .toLowerCase()
          .includes(keyword) ||
        game.description
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [games, search]);

  /* ------------------------------------------------------------------------ */
  /* Pagination                                                               */
  /* ------------------------------------------------------------------------ */

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredGames.length / PAGE_SIZE
    )
  );

  const safeCurrentPage = Math.min(
    currentPage,
    totalPages
  );

  const paginatedGames = useMemo(() => {
    const start =
      (safeCurrentPage - 1) * PAGE_SIZE;

    return filteredGames.slice(
      start,
      start + PAGE_SIZE
    );
  }, [
    filteredGames,
    safeCurrentPage,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [
    currentPage,
    totalPages,
  ]);

  /* ------------------------------------------------------------------------ */
  /* Statistics                                                               */
  /* ------------------------------------------------------------------------ */

  const totalGames = games.length;

  const activeGames = games.filter(
    (game) => game.isActive
  ).length;

  const inactiveGames = games.filter(
    (game) => !game.isActive
  ).length;

  /* ------------------------------------------------------------------------ */
  /* Form                                                                     */
  /* ------------------------------------------------------------------------ */

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      isActive: true,
    });

    setImageFile(null);
    setImagePreview(null);
  };

  const openCreateModal = () => {
    setOpenMenuGame(null);
    setMenuPosition(null);

    resetForm();

    setModalMode("create");
    setModalOpen(true);
  };

  const openEditModal = (game: Game) => {
    setForm({
      id: game.id,
      name: game.name,
      description: game.description,
      isActive: game.isActive,
    });

    setImageFile(null);

    setImagePreview(
      getImageSrc(game.image)
    );

    setModalMode("edit");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;

    setModalOpen(false);
    resetForm();
  };

  const handleFormChange = (
    e: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    if (name === "isActive") {
      setForm((prev) => ({
        ...prev,
        isActive:
          typeof value === "boolean"
            ? value
            : value === "true",
      }));

      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* ------------------------------------------------------------------------ */
  /* Image Upload                                                             */
  /* ------------------------------------------------------------------------ */

  const handleImageChange = (
    file: File | null
  ) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPageAlert({
        visible: true,
        variant: "error",
        title: "Invalid image file",
        description:
          "Please select a valid image file.",
      });

      return;
    }

    setImageFile(file);

    const reader = new FileReader();

    reader.onload = () => {
      setImagePreview(
        reader.result as string
      );
    };

    reader.readAsDataURL(file);
  };

  const handleDrop = (
    e: DragEvent<HTMLDivElement>
  ) => {
    e.preventDefault();

    setDragging(false);

    const file =
      e.dataTransfer.files?.[0];

    if (file) {
      handleImageChange(file);
    }
  };

  const handleDragOver = (
    e: DragEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  /* ------------------------------------------------------------------------ */
  /* Submit                                                                   */
  /* ------------------------------------------------------------------------ */

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setPageAlert({
        visible: true,
        variant: "error",
        title: "Invalid game name",
        description:
          "The game name is required. Please enter a valid name.",
      });

      return;
    }

    if (!form.description.trim()) {
      setPageAlert({
        visible: true,
        variant: "error",
        title: "Invalid game description",
        description:
          "The game description is required. Please enter a valid description.",
      });
      return;
    }

    if (!imageFile && !imagePreview) {
      setPageAlert({
        visible: true,
        variant: "error",
        title: "Invalid game image",
        description:
          "The game image is required. Please upload a valid image.",
      });

      return;
    }

    const gameId = form.id?.trim();

    if (
      modalMode === "edit" &&
      !gameId
    ) {
      setPageAlert({
        visible: true,
        variant: "error",
        title: "Invalid game ID",
        description:
          "The game ID is missing or invalid. Please try again.",
      });

      return;
    }

    setLoading(true);

    try {
      setSubmitting(true);

      const formData = new FormData();

      formData.append(
        "Name",
        form.name.trim()
      );

      formData.append(
        "Description",
        form.description.trim()
      );

      formData.append(
        "IsActive",
        String(form.isActive)
      );

      if (imageFile) {
        formData.append(
          "Image",
          imageFile
        );
      }

      if (modalMode === "create") {
        await createGame(formData);

        setPageAlert({
          visible: true,
          variant: "success",
          title: "Game created",
          description:
            "Game created successfully.",
        });
      } else {
        /*
         * gameId is narrowed to string here because
         * the edit-mode validation above guarantees it.
         */
        formData.append(
          "Id",
          gameId!
        );

        await updateGame(formData);

        setPageAlert({
          visible: true,
          variant: "success",
          title: "Game updated",
          description:
            "Game updated successfully.",
        });
      }

      setModalOpen(false);

      resetForm();

      await loadGames();
    } catch (error) {
      console.error(
        "Failed to save game:",
        error
      );

      setPageAlert({
        visible: true,
        variant: "error",
        title: "Failed to save game",
        description:
          modalMode === "create"
            ? "Failed to create game."
            : "Failed to update game.",
      });
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Delete                                                                   */
  /* ------------------------------------------------------------------------ */

  const handleDelete = async () => {
    if (!deleteGame) return;

    setLoading(true);
    try {
      setDeleting(true);

      await deleteGameApi(
        deleteGame.id
      );

      setDeleteGame(null);

      setPageAlert({
        visible: true,
        variant: "success",
        title: "Game deleted",
        description:
          "Game deleted successfully.",
      });

      await loadGames();
    } catch (error) {
      console.error(
        "Failed to delete game:",
        error
      );

      setPageAlert({
        visible: true,
        variant: "error",
        title: "Failed to delete game",
        description:
          "An error occurred while deleting the game. Please try again.",
      });
    } finally {
      setLoading(false);
      setDeleting(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Action Menu                                                              */
  /* ------------------------------------------------------------------------ */

  const handleActionMenuClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    game: Game
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      openMenuGame?.id === game.id
    ) {
      setOpenMenuGame(null);
      setMenuPosition(null);
      return;
    }

    const rect =
      e.currentTarget.getBoundingClientRect();

    const menuWidth = 176;
    const menuHeight = 104;
    const spacing = 8;
    const viewportPadding = 12;

    let left =
      rect.right - menuWidth;

    let top =
      rect.bottom + spacing;

    if (
      left + menuWidth >
      window.innerWidth -
      viewportPadding
    ) {
      left =
        window.innerWidth -
        menuWidth -
        viewportPadding;
    }

    if (
      left < viewportPadding
    ) {
      left = viewportPadding;
    }

    if (
      top + menuHeight >
      window.innerHeight -
      viewportPadding
    ) {
      top =
        rect.top -
        menuHeight -
        spacing;
    }

    if (
      top < viewportPadding
    ) {
      top = viewportPadding;
    }

    setMenuPosition({
      top,
      left,
    });

    setOpenMenuGame(game);
  };

  /* ------------------------------------------------------------------------ */
  /* Portal Action Menu                                                       */
  /* ------------------------------------------------------------------------ */

  const actionMenu =
    openMenuGame &&
      menuPosition
      ? createPortal(
        <div
          className="fixed z-[999999] w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {/* Update */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();

              const selectedGame =
                openMenuGame;

              if (!selectedGame) return;

              setOpenMenuGame(null);
              setMenuPosition(null);

              requestAnimationFrame(() => {
                openEditModal(
                  selectedGame
                );
              });
            }}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-red-50 hover:text-red-700"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
              <Edit3 size={15} />
            </span>

            <span>Update</span>
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();

              const selectedGame =
                openMenuGame;

              if (!selectedGame) return;

              setOpenMenuGame(null);
              setMenuPosition(null);

              requestAnimationFrame(() => {
                setDeleteGame(
                  selectedGame
                );
              });
            }}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-500">
              <Trash2 size={15} />
            </span>

            <span>Delete</span>
          </button>
        </div>,
        document.body
      )
      : null;

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <>
      {actionMenu}

      {modalOpen && (
        <GameModal
          mode={modalMode}
          form={form}
          imageFile={imageFile}
          imagePreview={imagePreview}
          dragging={dragging}
          submitting={submitting}
          onClose={closeModal}
          onSubmit={handleSubmit}
          onChange={handleFormChange}
          onImageChange={
            handleImageChange
          }
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={
            handleDragLeave
          }
        />
      )}

      {pageAlert.visible && (
        <Alert
          variant={pageAlert.variant}
          title={pageAlert.title}
          description={pageAlert.description}
          onClose={() =>
            setPageAlert((current) => ({
              ...current,
              visible: false,
            }))
          }
        />
      )}

      {deleteGame && (
        <DeleteConfirmModal
          game={deleteGame}
          deleting={deleting}
          onClose={() => {
            if (!deleting) {
              setDeleteGame(null);
            }
          }}
          onConfirm={handleDelete}
        />
      )}

      <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-[1600px]">

          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm">
                  <Gamepad2 size={22} />
                </div>

                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                    Games
                  </h1>

                  <p className="mt-0.5 text-sm text-slate-500">
                    Manage gaming centre games
                    and availability.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={
                openCreateModal
              }
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 hover:shadow-md"
            >
              <Plus size={18} />
              Add Game
            </button>
          </div>

          {/* Summary */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryCard
              title="Total Games"
              value={totalGames}
              description="All registered games"
              icon={
                <Gamepad2 size={21} />
              }
            />

            <SummaryCard
              title="Active Games"
              value={activeGames}
              description="Currently available"
              icon={
                <Activity size={21} />
              }
            />

            <SummaryCard
              title="Inactive Games"
              value={inactiveGames}
              description="Currently unavailable"
              icon={<X size={21} />}
            />
          </div>

          {/* Main Card */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Loading */}
            {loading &&
              createPortal(
                <div className="fixed inset-0 z-[9999999999] flex items-center justify-center bg-black/60 px-4 backdrop-blur-md">
                  <div className="w-full max-w-xs rounded-3xl p-7 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/25 border-t-white" />
                    </div>

                    <p className="mt-4 text-base font-bold text-white">
                      Loading
                    </p>

                    <p className="mt-1 text-sm text-white/70">
                      Please wait a moment...
                    </p>
                  </div>
                </div>,
                document.body
              )}

            {/* Toolbar */}
            <div className="border-b border-slate-200 p-4 sm:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Game List
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    {filteredGames.length}{" "}
                    {filteredGames.length ===
                      1
                      ? "game"
                      : "games"}{" "}
                    found
                  </p>
                </div>

                <div className="relative w-full md:max-w-sm">
                  <Search
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={search}
                    onChange={(e) =>
                      setSearch(
                        e.target.value
                      )
                    }
                    placeholder="Search games..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10"
                  />

                  {search && (
                    <button
                      type="button"
                      onClick={() =>
                        setSearch("")
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 transition hover:text-slate-700"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden overflow-x-auto md:block">
              {paginatedGames.length ===
                0 ? (
                <EmptyState
                  search={search}
                  onCreate={
                    openCreateModal
                  }
                />
              ) : (
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70">
                      <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Game
                      </th>

                      <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Description
                      </th>

                      <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>

                      <th className="w-20 px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {paginatedGames.map(
                      (game) => {
                        const imageSrc =
                          getImageSrc(
                            game.image
                          );

                        return (
                          <tr
                            key={game.id}
                            className="transition hover:bg-slate-50/70"
                          >
                            <td className="px-5 py-4">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                                  {imageSrc ? (
                                    <img
                                      src={
                                        imageSrc
                                      }
                                      alt={
                                        game.name
                                      }
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                                      <Gamepad2
                                        size={
                                          20
                                        }
                                      />
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {
                                      game.name
                                    }
                                  </p>

                                  <p className="mt-0.5 text-xs text-slate-400">
                                    Game #
                                    {
                                      game.id
                                    }
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="max-w-md px-5 py-4">
                              <p className="line-clamp-2 text-sm leading-6 text-slate-500">
                                {game.description ||
                                  "No description available."}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <StatusBadge
                                isActive={
                                  game.isActive
                                }
                              />
                            </td>

                            <td className="px-5 py-4 text-right">
                              <button
                                type="button"
                                aria-label={`Actions for ${game.name}`}
                                aria-expanded={
                                  openMenuGame?.id ===
                                  game.id
                                }
                                onClick={(e) =>
                                  handleActionMenuClick(
                                    e,
                                    game
                                  )
                                }
                                className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition ${openMenuGame?.id ===
                                  game.id
                                  ? "bg-red-50 text-red-700"
                                  : "text-slate-400 hover:bg-red-50 hover:text-red-700"
                                  }`}
                              >
                                <MoreVertical
                                  size={18}
                                />
                              </button>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden">
              {paginatedGames.length ===
                0 ? (
                <EmptyState
                  search={search}
                  onCreate={
                    openCreateModal
                  }
                />
              ) : (
                <div className="divide-y divide-slate-100">
                  {paginatedGames.map(
                    (game) => {
                      const imageSrc =
                        getImageSrc(
                          game.image
                        );

                      return (
                        <div
                          key={game.id}
                          className="p-4 transition hover:bg-slate-50/60"
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                              {imageSrc ? (
                                <img
                                  src={
                                    imageSrc
                                  }
                                  alt={
                                    game.name
                                  }
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-slate-400">
                                  <Gamepad2
                                    size={
                                      21
                                    }
                                  />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h3 className="truncate text-sm font-bold text-slate-900">
                                    {
                                      game.name
                                    }
                                  </h3>

                                  <p className="mt-0.5 text-xs text-slate-400">
                                    Game #
                                    {
                                      game.id
                                    }
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  aria-label={`Actions for ${game.name}`}
                                  aria-expanded={
                                    openMenuGame?.id ===
                                    game.id
                                  }
                                  onClick={(e) =>
                                    handleActionMenuClick(
                                      e,
                                      game
                                    )
                                  }
                                  className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg transition ${openMenuGame?.id ===
                                    game.id
                                    ? "bg-red-50 text-red-700"
                                    : "text-slate-400 hover:bg-red-50 hover:text-red-700"
                                    }`}
                                >
                                  <MoreVertical
                                    size={
                                      18
                                    }
                                  />
                                </button>
                              </div>

                              <div className="mt-2">
                                <StatusBadge
                                  isActive={
                                    game.isActive
                                  }
                                />
                              </div>
                            </div>
                          </div>

                          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
                            {game.description ||
                              "No description available."}
                          </p>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>

            {/* Pagination */}
            {filteredGames.length >
              0 && (
                <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <p className="text-xs text-slate-500">
                    Showing{" "}
                    <span className="font-semibold text-slate-700">
                      {(safeCurrentPage -
                        1) *
                        PAGE_SIZE +
                        1}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold text-slate-700">
                      {Math.min(
                        safeCurrentPage *
                        PAGE_SIZE,
                        filteredGames.length
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-700">
                      {
                        filteredGames.length
                      }
                    </span>
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={
                        safeCurrentPage <=
                        1
                      }
                      onClick={() =>
                        setCurrentPage(
                          (prev) =>
                            Math.max(
                              1,
                              prev - 1
                            )
                        )
                      }
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft
                        size={17}
                      />
                    </button>

                    <div className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-red-600 px-3 text-xs font-semibold text-white">
                      {
                        safeCurrentPage
                      }
                    </div>

                    <button
                      type="button"
                      disabled={
                        safeCurrentPage >=
                        totalPages
                      }
                      onClick={() =>
                        setCurrentPage(
                          (prev) =>
                            Math.min(
                              totalPages,
                              prev + 1
                            )
                        )
                      }
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight
                        size={17}
                      />
                    </button>
                  </div>
                </div>
              )}
          </div>
        </div>
      </main>
    </>
  );
};

export default GamePage;
