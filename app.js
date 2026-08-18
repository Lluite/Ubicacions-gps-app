const STORAGE_KEY = "ubicacions-gps-lluis-ia-v2";

const form = document.getElementById("recordForm");
const drawer = document.getElementById("recordDrawer");
const drawerBackdrop = document.getElementById("drawerBackdrop");
const recordList = document.getElementById("recordList");
const searchInput = document.getElementById("searchInput");
const gpsStatus = document.getElementById("gpsStatus");
const recordTotalPill = document.getElementById("recordTotalPill");
const recordPositionPill = document.getElementById("recordPositionPill");
const contentGrid = document.getElementById("contentGrid");
const photoStage = document.getElementById("photoStage");
const photoDots = document.getElementById("photoDots");
const photoTitle = document.getElementById("photoTitle");
const photoCounterPill = document.getElementById("photoCounterPill");
const photoHelper = document.getElementById("photoHelper");
const galleryModal = document.getElementById("galleryModal");
const galleryBackdrop = document.getElementById("galleryBackdrop");
const galleryStage = document.getElementById("galleryStage");
const galleryThumbs = document.getElementById("galleryThumbs");
const recordTemplate = document.getElementById("recordItemTemplate");
const toolsMenu = document.getElementById("toolsMenu");
const toolsMenuButton = document.getElementById("toolsMenuButton");

const fields = {
  date: document.getElementById("dateInput"),
  time: document.getElementById("timeInput"),
  name: document.getElementById("nameInput"),
  group: document.getElementById("groupInput"),
  latitude: document.getElementById("latitudeInput"),
  longitude: document.getElementById("longitudeInput"),
  address: document.getElementById("addressInput"),
  web: document.getElementById("webInput"),
  phone: document.getElementById("phoneInput"),
  notes: document.getElementById("notesInput"),
};

const buttons = {
  newTop: document.getElementById("newButton"),
  deleteTop: document.getElementById("deleteButton"),
  deleteBottom: document.getElementById("deleteBottomButton"),
  backup: document.getElementById("backupButton"),
  openDrawer: document.getElementById("openDrawerButton"),
  closeDrawer: document.getElementById("closeDrawerButton"),
  previousRecord: document.getElementById("previousRecordButton"),
  nextRecord: document.getElementById("nextRecordButton"),
  captureGpsTop: document.getElementById("captureGpsTopButton"),
  quickPhoto: document.getElementById("quickPhotoButton"),
  route: document.getElementById("routeButton"),
  call: document.getElementById("callButton"),
  web: document.getElementById("openWebButton"),
  albumPrimary: document.getElementById("albumPrimaryButton"),
  albumExtra: document.getElementById("albumExtraButton"),
  closeGallery: document.getElementById("closeGalleryButton"),
  deletePrimaryPhoto: document.getElementById("deletePrimaryPhotoButton"),
  deleteExtraPhoto: document.getElementById("deleteExtraPhotoButton"),
};

const quickPhotoInput = document.getElementById("quickPhotoInput");
const extraPhotoInput = document.getElementById("extraPhotoInput");

const DEFAULT_GROUP_CHOICES = [
  "Restaurant",
  "Parking",
  "Casa",
  "Platja",
  "Hotel",
  "Botiga",
  "Mirador",
  "Bar",
  "Museu",
  "Lloc d'interès",
];

let state = {
  records: loadRecords(),
  currentId: null,
  activePhotoIndex: 0,
  activeGalleryPhotoIndex: 0,
  dirty: false,
  searchTerm: "",
  groupChoices: loadGroupChoices(),
};

let gpsCaptureInProgress = false;
let autosaveTimer = null;
let photoTouchStartX = null;
let recordTouchStartX = null;
let recordTouchStartY = null;
const PHOTO_MAX_SIZE = 1600;
const PHOTO_QUALITY = 0.8;

const GROUP_MAP = {
  restaurant: "Restaurant",
  cafe: "Cafè",
  bar: "Bar",
  fast_food: "Menjar ràpid",
  pub: "Bar",
  hotel: "Hotel",
  guest_house: "Hotel",
  apartment: "Apartament",
  house: "Casa",
  beach: "Platja",
  parking: "Parking",
  supermarket: "Botiga",
  convenience: "Botiga",
  mall: "Botiga",
  museum: "Museu",
  viewpoint: "Mirador",
  attraction: "Lloc d'interès",
};

function loadRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem("ubicacions-gps-lluis-ia-v1") || "[]");
    if (!Array.isArray(saved)) {
      return [];
    }
    return saved.map((record) => ({
      ...record,
      group: record.group || "",
      photosPrimary: record.photosPrimary || record.photos || [],
      photosExtra: record.photosExtra || [],
    }));
  } catch {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
}

function loadGroupChoices() {
  try {
    const saved = JSON.parse(localStorage.getItem(`${STORAGE_KEY}-groups`) || "[]");
    const merged = [...new Set([...DEFAULT_GROUP_CHOICES, ...(Array.isArray(saved) ? saved : [])])];
    return merged.filter(Boolean);
  } catch {
    return [...DEFAULT_GROUP_CHOICES];
  }
}

function saveGroupChoices() {
  localStorage.setItem(`${STORAGE_KEY}-groups`, JSON.stringify(state.groupChoices));
}

function renderGroupChoices() {
  fields.group.innerHTML = "";

  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "Tria un grup...";
  fields.group.appendChild(emptyOption);

  state.groupChoices.forEach((choice) => {
    const option = document.createElement("option");
    option.value = choice;
    option.textContent = choice;
    fields.group.appendChild(option);
  });

  const newOption = document.createElement("option");
  newOption.value = "__new__";
  newOption.textContent = "Afegir grup nou...";
  fields.group.appendChild(newOption);
}

function rememberGroupChoice(value) {
  const clean = value.trim();
  if (!clean) {
    return;
  }
  if (!state.groupChoices.some((item) => item.toLowerCase() === clean.toLowerCase())) {
    state.groupChoices.push(clean);
    state.groupChoices.sort((a, b) => a.localeCompare(b, "ca"));
    saveGroupChoices();
    renderGroupChoices();
  }
}

function promptNewGroup() {
  const value = window.prompt("Escriu el nom del grup nou:");
  if (!value) {
    fields.group.value = "";
    return;
  }

  const clean = value.trim();
  if (!clean) {
    fields.group.value = "";
    return;
  }

  rememberGroupChoice(clean);
  fields.group.value = clean;
  markDirty();
}

function setGroupValue(value) {
  renderGroupChoices();

  if (!value) {
    fields.group.value = "";
    return;
  }

  rememberGroupChoice(value);
  fields.group.value = value;
}

function createBlankRecord() {
  return {
    id: crypto.randomUUID(),
    date: "",
    time: "",
    name: "",
    group: "",
    latitude: "",
    longitude: "",
    address: "",
    web: "",
    phone: "",
    notes: "",
    photosPrimary: [],
    photosExtra: [],
    updatedAt: new Date().toISOString(),
  };
}

function getCurrentRecord() {
  return state.records.find((record) => record.id === state.currentId) || null;
}

function fillForm(record) {
  Object.entries(fields).forEach(([key, input]) => {
    if (key === "group") {
      return;
    }
    input.value = record?.[key] || "";
  });
  setGroupValue(record?.group || "");
  state.activePhotoIndex = 0;
  state.activeGalleryPhotoIndex = 0;
  renderPhotos(record?.photosPrimary || []);
  renderExtraGallery(record?.photosExtra || []);
  state.dirty = false;
}

function readForm() {
  return {
    date: fields.date.value.trim(),
    time: fields.time.value.trim(),
    name: fields.name.value.trim(),
    group: fields.group.value.trim(),
    latitude: fields.latitude.value.trim(),
    longitude: fields.longitude.value.trim(),
    address: fields.address.value.trim(),
    web: fields.web.value.trim(),
    phone: fields.phone.value.trim(),
    notes: fields.notes.value.trim(),
  };
}

function applyCurrentRecordToForm() {
  const record = getCurrentRecord();
  fillForm(record);
  renderRecordList();
}

function markDirty() {
  state.dirty = true;
}

function confirmDiscardIfNeeded() {
  persistCurrentRecordSilently();
  return true;
}

function discardChangesSilently() {
  state.dirty = false;
}

function hasRecordContent(record) {
  if (!record) {
    return false;
  }

  return Boolean(
    record.date ||
      record.time ||
      record.name ||
      record.group ||
      record.latitude ||
      record.longitude ||
      record.address ||
      record.web ||
      record.phone ||
      record.notes ||
      (record.photosPrimary && record.photosPrimary.length) ||
      (record.photosExtra && record.photosExtra.length)
  );
}

function buildPayloadFromCurrentForm() {
  const values = readForm();
  const current = getCurrentRecord();
  return {
    ...(current || createBlankRecord()),
    ...values,
    photosPrimary: current?.photosPrimary || [],
    photosExtra: current?.photosExtra || [],
    updatedAt: new Date().toISOString(),
  };
}

function persistCurrentRecordSilently() {
  const payload = buildPayloadFromCurrentForm();
  const alreadyExists = state.records.some((record) => record.id === payload.id);

  if (!hasRecordContent(payload)) {
    if (alreadyExists) {
      state.records = state.records.filter((record) => record.id !== payload.id);
      saveRecords();
      renderRecordList();
    }
    state.dirty = false;
    return null;
  }

  rememberGroupChoice(payload.group);

  if (alreadyExists) {
    state.records = state.records.map((record) => (record.id === payload.id ? payload : record));
  } else {
    state.records.push(payload);
  }

  state.currentId = payload.id;
  saveRecords();
  state.dirty = false;
  renderRecordList();
  return payload;
}

function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    persistCurrentRecordSilently();
  }, 450);
}

function flushAutosaveNow() {
  clearTimeout(autosaveTimer);
  autosaveTimer = null;
  persistCurrentRecordSilently();
}

function movePhoto(step) {
  const photos = getCurrentRecord()?.photosPrimary || [];
  const totalSlides = photos.length + (photos.length < 5 ? 1 : 0);
  if (totalSlides <= 1) {
    return;
  }

  const nextIndex = Math.max(0, Math.min(totalSlides - 1, state.activePhotoIndex + step));
  if (nextIndex !== state.activePhotoIndex) {
    state.activePhotoIndex = nextIndex;
    renderPhotos(photos);
  }
}

function getOrderedRecords() {
  return [...state.records].sort((a, b) => (a.name || "").localeCompare(b.name || "", "ca"));
}

function refreshPhotoStatus(photos, totalSlides) {
  const onAddSlide = photos.length < 5 && state.activePhotoIndex === totalSlides - 1;
  photoCounterPill.textContent = `${photos.length}/5`;

  if (!photos.length) {
    photoHelper.textContent = "Fes servir el botó superior per fer la primera foto.";
  } else if (onAddSlide) {
    photoHelper.textContent = "Ara ets a l'espai nou. Fes servir el botó superior per afegir la següent foto.";
  } else {
    photoHelper.textContent = `Foto ${state.activePhotoIndex + 1} de ${photos.length}. Llisca cap als costats per veure'n més.`;
  }

  buttons.deletePrimaryPhoto.disabled = !photos.length || onAddSlide;
  buttons.deletePrimaryPhoto.classList.toggle("is-disabled", !photos.length || onAddSlide);

  [...photoDots.children].forEach((dot, index) => {
    dot.classList.toggle("active", index === state.activePhotoIndex);
  });
}

function renderPhotos(photos) {
  photoStage.innerHTML = "";
  photoDots.innerHTML = "";
  photoTitle.textContent = "Fotos del lloc";
  const canAddMore = photos.length < 5;
  const totalSlides = photos.length + (canAddMore ? 1 : 0);

  state.activePhotoIndex = Math.max(0, Math.min(state.activePhotoIndex, Math.max(0, totalSlides - 1)));

  if (!photos.length) {
    photoStage.innerHTML = `
      <article class="photo-slide add-slide">
        <div class="add-photo-slide">
          <img src="./camera-icon.png?v=20260818-1" alt="" />
          <strong>Encara no hi ha fotos</strong>
          <span>Fes servir el botó “Fer o afegir fotos” per començar.</span>
        </div>
      </article>
    `;
  } else if (canAddMore && state.activePhotoIndex === totalSlides - 1) {
    photoStage.innerHTML = `
      <article class="photo-slide add-slide">
        <div class="add-photo-slide">
          <img src="./camera-icon.png?v=20260818-1" alt="" />
          <strong>Espai per una altra foto</strong>
          <span>Quan vulguis la següent, fes servir el botó superior “Fer o afegir fotos”.</span>
        </div>
      </article>
    `;
  } else {
    const photoIndex = Math.min(state.activePhotoIndex, photos.length - 1);
    photoStage.innerHTML = `<article class="photo-slide"><img src="${photos[photoIndex]}" alt="Foto ${photoIndex + 1} del registre" /></article>`;
  }

  for (let index = 0; index < totalSlides; index += 1) {
    const dot = document.createElement("span");
    dot.className = `photo-dot${index === state.activePhotoIndex ? " active" : ""}`;
    dot.addEventListener("click", () => {
      state.activePhotoIndex = index;
      renderPhotos(photos);
    });
    photoDots.appendChild(dot);
  }

  photoStage.onpointerdown = null;
  photoStage.ontouchstart = (event) => {
    photoTouchStartX = event.touches[0].clientX;
  };
  photoStage.ontouchend = (event) => {
    if (photoTouchStartX === null) {
      return;
    }
    const deltaX = event.changedTouches[0].clientX - photoTouchStartX;
    photoTouchStartX = null;
    if (Math.abs(deltaX) < 40) {
      return;
    }
    movePhoto(deltaX < 0 ? 1 : -1);
  };

  refreshPhotoStatus(photos, totalSlides);
}

function renderExtraGallery(photos) {
  galleryStage.innerHTML = "";
  galleryThumbs.innerHTML = "";

  if (!photos.length) {
    galleryStage.innerHTML = '<p class="empty-photo">Encara no hi ha cap foto extra en aquest registre.</p>';
    return;
  }

  const active = photos[state.activeGalleryPhotoIndex] || photos[0];
  const full = document.createElement("img");
  full.src = active;
  full.alt = "Foto extra del registre";
  galleryStage.appendChild(full);

  photos.forEach((photo, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `photo-thumb${index === state.activeGalleryPhotoIndex ? " active" : ""}`;
    button.innerHTML = `<img src="${photo}" alt="Miniatura extra ${index + 1}" />`;
    button.addEventListener("click", () => {
      state.activeGalleryPhotoIndex = index;
      renderExtraGallery(photos);
    });
    galleryThumbs.appendChild(button);
  });
}

function formatListSubtitle(record) {
  const pieces = [record.group, record.address, record.phone, record.web].filter(Boolean);
  return pieces[0] || "Sense informació extra";
}

function deleteRecordById(recordId, options = {}) {
  const target = state.records.find((record) => record.id === recordId);
  if (!target) {
    return;
  }

  const { skipConfirm = false, fromDrawer = false } = options;
  if (!skipConfirm && !window.confirm(`Vols esborrar el registre "${target.name || "Sense nom"}"?`)) {
    return;
  }

  const wasCurrent = target.id === state.currentId;
  state.records = state.records.filter((record) => record.id !== target.id);
  saveRecords();

  if (!state.records.length) {
    const blank = createBlankRecord();
    state.currentId = blank.id;
    fillForm(blank);
    gpsStatus.textContent = "";
  } else if (wasCurrent) {
    state.currentId = getOrderedRecords()[0].id;
    applyCurrentRecordToForm();
  } else {
    renderRecordList();
  }

  if (!fromDrawer && state.records.length) {
    gpsStatus.textContent = "Registre esborrat.";
  }
}

function renderRecordList() {
  const term = state.searchTerm.trim().toLowerCase();
  const records = getOrderedRecords();
  const filtered = records.filter((record) => {
    if (!term) {
      return true;
    }
    return [record.name, record.group, record.address, record.phone, record.web, record.notes]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });

  recordList.innerHTML = "";

  if (!filtered.length) {
    recordList.innerHTML = '<p class="empty-photo">No hi ha registres amb aquest text.</p>';
  } else {
    filtered.forEach((record) => {
      const shell = recordTemplate.content.firstElementChild.cloneNode(true);
      const item = shell.querySelector(".record-item");
      const deleteButton = shell.querySelector(".record-delete-button");

      item.classList.toggle("active", record.id === state.currentId);
      item.querySelector(".record-avatar").textContent = (record.name || "?").trim().slice(0, 2).toUpperCase();
      item.querySelector("strong").textContent = record.name || "Sense nom";
      item.querySelector("span").textContent = formatListSubtitle(record);
      item.addEventListener("click", () => {
        if (!confirmDiscardIfNeeded()) {
          return;
        }
        state.currentId = record.id;
        applyCurrentRecordToForm();
        closeDrawer();
      });
      deleteButton.addEventListener("click", (event) => {
        event.stopPropagation();
        deleteRecordById(record.id, { fromDrawer: true });
      });
      recordList.appendChild(shell);
    });
  }

  if (recordTotalPill) {
    recordTotalPill.textContent = `${state.records.length} ${state.records.length === 1 ? "registre" : "registres"}`;
  }

  if (recordPositionPill) {
    const currentIndex = records.findIndex((record) => record.id === state.currentId);
    recordPositionPill.textContent =
      currentIndex >= 0 ? `Fitxa ${currentIndex + 1}/${records.length}` : `Fitxa 0/${records.length}`;
  }

}

function openDrawer() {
  closeToolsMenu();
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  drawerBackdrop.hidden = false;
}

function closeDrawer() {
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  drawerBackdrop.hidden = true;
}

function openToolsMenu() {
  if (!toolsMenu || !toolsMenuButton) {
    return;
  }
  toolsMenu.hidden = false;
  toolsMenuButton.setAttribute("aria-expanded", "true");
}

function closeToolsMenu() {
  if (!toolsMenu || !toolsMenuButton) {
    return;
  }
  toolsMenu.hidden = true;
  toolsMenuButton.setAttribute("aria-expanded", "false");
}

function toggleToolsMenu() {
  if (!toolsMenu || !toolsMenuButton) {
    return;
  }
  if (toolsMenu.hidden) {
    openToolsMenu();
  } else {
    closeToolsMenu();
  }
}

function saveCurrentRecord() {
  const values = readForm();
  if (!hasRecordContent({ ...values, photosPrimary: getCurrentRecord()?.photosPrimary || [], photosExtra: getCurrentRecord()?.photosExtra || [] })) {
    return;
  }
  persistCurrentRecordSilently();
  gpsStatus.textContent = "";
}

function startNewRecord() {
  persistCurrentRecordSilently();
  discardChangesSilently();
  const blank = createBlankRecord();
  state.currentId = blank.id;
  fillForm(blank);
  gpsStatus.textContent = "";
  renderRecordList();
}

function deleteCurrentRecord() {
  const current = getCurrentRecord();
  if (!current) {
    alert("No hi ha cap registre seleccionat.");
    return;
  }
  closeToolsMenu();
  deleteRecordById(current.id);
}

function changeRecord(step) {
  if (!state.records.length) {
    return;
  }

  persistCurrentRecordSilently();
  discardChangesSilently();

  const ordered = getOrderedRecords();
  const currentIndex = Math.max(
    0,
    ordered.findIndex((record) => record.id === state.currentId)
  );
  const nextIndex = (currentIndex + step + ordered.length) % ordered.length;
  state.currentId = ordered[nextIndex].id;
  applyCurrentRecordToForm();
}

function normalizeWeb(url) {
  if (!url) {
    return "";
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `https://${url}`;
}

function getWebsiteFromTags(tags = {}) {
  return tags.website || tags["contact:website"] || tags.url || "";
}

function getPhoneFromTags(tags = {}) {
  return tags.phone || tags["contact:phone"] || tags.mobile || tags["contact:mobile"] || "";
}

function inferGroupFromPlace(place = {}) {
  const tags = place.tags || {};
  const values = [tags.amenity, tags.tourism, tags.shop, tags.leisure, tags.natural, place.type, place.category].filter(Boolean);
  for (const value of values) {
    const normalized = String(value).toLowerCase();
    if (GROUP_MAP[normalized]) {
      return GROUP_MAP[normalized];
    }
  }
  return "";
}

function buildAddressFromParts(address = {}) {
  const line1 = [address.road, address.house_number].filter(Boolean).join(" ");
  const line2 = [address.postcode, address.city || address.town || address.village || address.hamlet].filter(Boolean).join(" ");
  const line3 = [address.state, address.country].filter(Boolean).join(", ");
  return [line1, line2, line3].filter(Boolean).join("\n");
}

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

async function optimizeImage(file) {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImageFromDataUrl(dataUrl);
  const longestSide = Math.max(image.width, image.height);

  if (longestSide <= PHOTO_MAX_SIZE) {
    return dataUrl;
  }

  const scale = PHOTO_MAX_SIZE / longestSide;
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return dataUrl;
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", PHOTO_QUALITY);
}

function downloadBackup() {
  flushAutosaveNow();

  const payload = {
    exportedAt: new Date().toISOString(),
    version: "v16",
    totalRecords: state.records.length,
    groupChoices: state.groupChoices,
    records: state.records,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  link.href = url;
  link.download = `ubicacions-gps-backup-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function reverseLookup(lat, lon) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lon);
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("extratags", "1");
  url.searchParams.set("namedetails", "1");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("No s'ha pogut obtenir l'adreça.");
  }

  return response.json();
}

async function nearbyPoiLookup(lat, lon) {
  const query = `
[out:json][timeout:20];
(
  node(around:40,${lat},${lon})[name];
  way(around:40,${lat},${lon})[name];
  relation(around:40,${lat},${lon})[name];
);
out tags center qt 10;
`;

  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      Accept: "application/json",
    },
    body: query,
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  if (!Array.isArray(data.elements) || !data.elements.length) {
    return null;
  }

  const scored = data.elements
    .map((element) => {
      const pointLat = element.lat ?? element.center?.lat;
      const pointLon = element.lon ?? element.center?.lon;
      const distance = pointLat && pointLon ? Math.hypot(pointLat - Number(lat), pointLon - Number(lon)) : Number.MAX_VALUE;
      return { ...element, distance };
    })
    .sort((a, b) => a.distance - b.distance);

  return scored[0];
}

async function enrichLocationData(lat, lon) {
  const [reverse, poi] = await Promise.allSettled([reverseLookup(lat, lon), nearbyPoiLookup(lat, lon)]);
  return {
    reverse: reverse.status === "fulfilled" ? reverse.value : null,
    poi: poi.status === "fulfilled" ? poi.value : null,
  };
}

function openRoute() {
  const latitude = fields.latitude.value.trim();
  const longitude = fields.longitude.value.trim();
  const address = fields.address.value.trim();

  let target = "";
  if (latitude && longitude) {
    target = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${latitude},${longitude}`)}`;
  } else if (address) {
    target = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  }

  if (!target) {
    alert("Primer posa coordenades o una adreça.");
    return;
  }

  window.open(target, "_blank");
}

function callPhone() {
  const phone = fields.phone.value.trim();
  if (!phone) {
    alert("No hi ha cap telèfon per trucar.");
    return;
  }
  window.location.href = `tel:${phone.replace(/\s+/g, "")}`;
}

function openWeb() {
  const url = normalizeWeb(fields.web.value.trim());
  if (!url) {
    alert("No hi ha cap web per obrir.");
    return;
  }
  window.open(url, "_blank");
}

function setCurrentDateAndTime() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  if (!fields.date.value.trim()) {
    fields.date.value = `${day}/${month}/${year}`;
  }
  if (!fields.time.value.trim()) {
    fields.time.value = `${hours}:${minutes}:${seconds}`;
  }
}

function setGpsCaptureBusy(isBusy) {
  gpsCaptureInProgress = isBusy;
  if (!buttons.captureGpsTop) {
    return;
  }

  buttons.captureGpsTop.disabled = isBusy;
  buttons.captureGpsTop.classList.toggle("busy", isBusy);
  buttons.captureGpsTop.innerHTML = isBusy
    ? '<span class="quick-icon">⏳</span> Buscant posició...'
    : '<span class="quick-icon">📍</span> Gravar posició actual';
}

function explainGeolocationError(error) {
  if (!error || typeof error.code !== "number") {
    return "No s'ha pogut obtenir la ubicació ara mateix.";
  }

  if (error.code === 1) {
    return "Has de permetre la ubicació perquè la app pugui gravar la posició actual.";
  }

  if (error.code === 2) {
    return "La ubicació no està disponible ara mateix. Torna-ho a provar en un moment.";
  }

  if (error.code === 3) {
    return "La lectura de la ubicació ha trigat massa. Torna-ho a provar.";
  }

  return "No s'ha pogut obtenir la ubicació ara mateix.";
}

function captureGps() {
  if (gpsCaptureInProgress) {
    return;
  }

  if (!navigator.geolocation) {
    alert("Aquest dispositiu no permet llegir la ubicació.");
    return;
  }

  startNewRecord();
  setGpsCaptureBusy(true);
  gpsStatus.textContent = "Buscant la posició actual...";
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const latitude = position.coords.latitude.toFixed(6);
      const longitude = position.coords.longitude.toFixed(6);
      fields.latitude.value = latitude;
      fields.longitude.value = longitude;
      setCurrentDateAndTime();
      markDirty();
      gpsStatus.textContent = "Coordenades capturades. Ara busco la informació del lloc...";

      try {
        const { reverse, poi } = await enrichLocationData(latitude, longitude);
        const reverseAddress = reverse?.address || {};
        const poiTags = poi?.tags || {};

        if (!fields.address.value.trim()) {
          fields.address.value = buildAddressFromParts(reverseAddress) || reverse?.display_name || "";
        }

        if (!fields.name.value.trim()) {
          fields.name.value = poiTags.name || reverse?.name || reverse?.namedetails?.name || "";
        }

        if (!fields.group.value.trim()) {
          fields.group.value = inferGroupFromPlace({
            ...reverse,
            tags: poiTags,
            category: reverse?.category,
            type: reverse?.type,
          });
        }

        if (!fields.web.value.trim()) {
          fields.web.value = getWebsiteFromTags(poiTags);
        }

        if (!fields.phone.value.trim()) {
          fields.phone.value = getPhoneFromTags(poiTags);
        }

        gpsStatus.textContent = "";
        scheduleAutosave();
      } catch {
        gpsStatus.textContent = "";
      } finally {
        setGpsCaptureBusy(false);
      }
    },
    (error) => {
      setGpsCaptureBusy(false);
      gpsStatus.textContent = "";
      alert(explainGeolocationError(error));
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    }
  );
}

function handlePhotos(files, target = "primary") {
  const current = getCurrentRecord() || createBlankRecord();
  const readers = [...files].map((file) => optimizeImage(file));

  Promise.all(readers).then((images) => {
    if (target === "primary") {
      const currentPhotos = current.photosPrimary || [];
      const remainingSlots = Math.max(0, 5 - currentPhotos.length);
      const acceptedImages = images.slice(0, remainingSlots);
      current.photosPrimary = [...currentPhotos, ...acceptedImages];
      if (acceptedImages.length < images.length) {
        alert("F1 només permet fins a 5 fotos principals per registre.");
      }
    } else {
      current.photosExtra = [...(current.photosExtra || []), ...images];
    }

    if (!getCurrentRecord()) {
      state.records.push(current);
      state.currentId = current.id;
    } else {
      state.records = state.records.map((record) => (record.id === current.id ? current : record));
    }

    if (target === "primary") {
      state.activePhotoIndex = Math.max(0, (current.photosPrimary || []).length - 1);
    } else {
      state.activeGalleryPhotoIndex = Math.max(0, (current.photosExtra || []).length - 1);
    }
    state.dirty = true;
    saveRecords();
    if (target === "primary") {
      renderPhotos(current.photosPrimary || []);
    } else {
      renderExtraGallery(current.photosExtra || []);
    }
    renderRecordList();
    scheduleAutosave();
  });
}

function deleteCurrentPhoto(target = "primary") {
  const current = getCurrentRecord();
  if (!current) {
    return;
  }

  if (target === "primary") {
    const photos = [...(current.photosPrimary || [])];
    if (!photos.length || state.activePhotoIndex >= photos.length) {
      return;
    }
    photos.splice(state.activePhotoIndex, 1);
    current.photosPrimary = photos;
    state.activePhotoIndex = Math.max(0, Math.min(state.activePhotoIndex, photos.length - 1));
  } else {
    const photos = [...(current.photosExtra || [])];
    if (!photos.length) {
      return;
    }
    photos.splice(state.activeGalleryPhotoIndex, 1);
    current.photosExtra = photos;
    state.activeGalleryPhotoIndex = Math.max(0, Math.min(state.activeGalleryPhotoIndex, photos.length - 1));
  }

  state.records = state.records.map((record) => (record.id === current.id ? current : record));
  state.dirty = true;
  saveRecords();
  renderPhotos(current.photosPrimary || []);
  renderExtraGallery(current.photosExtra || []);
  renderRecordList();
  scheduleAutosave();
}

function openExtraGallery() {
  galleryModal.hidden = false;
  renderExtraGallery(getCurrentRecord()?.photosExtra || []);
}

function closeExtraGallery() {
  galleryModal.hidden = true;
}

function bootstrap() {
  renderGroupChoices();

  if (state.records.length) {
    const ordered = getOrderedRecords();
    state.currentId = ordered[0].id;
    fillForm(getCurrentRecord());
  } else {
    const blank = createBlankRecord();
    state.currentId = blank.id;
    fillForm(blank);
  }

  renderRecordList();
}

Object.values(fields).forEach((input) => {
  input.addEventListener("input", () => {
    markDirty();
    scheduleAutosave();
  });
});

fields.group.addEventListener("change", () => {
  if (fields.group.value === "__new__") {
    promptNewGroup();
    return;
  }
  markDirty();
  scheduleAutosave();
});

searchInput.addEventListener("input", () => {
  state.searchTerm = searchInput.value;
  renderRecordList();
});

if (contentGrid) {
  contentGrid.addEventListener(
    "touchstart",
    (event) => {
      if (event.target.closest("input, textarea, select, button, .photo-stage, .photo-dots, .gallery-modal")) {
        recordTouchStartX = null;
        recordTouchStartY = null;
        return;
      }

      recordTouchStartX = event.touches[0].clientX;
      recordTouchStartY = event.touches[0].clientY;
    },
    { passive: true }
  );

  contentGrid.addEventListener(
    "touchend",
    (event) => {
      if (recordTouchStartX === null || recordTouchStartY === null) {
        return;
      }

      const deltaX = event.changedTouches[0].clientX - recordTouchStartX;
      const deltaY = event.changedTouches[0].clientY - recordTouchStartY;
      recordTouchStartX = null;
      recordTouchStartY = null;

      if (Math.abs(deltaX) < 70 || Math.abs(deltaY) > 50) {
        return;
      }

      changeRecord(deltaX < 0 ? 1 : -1);
    },
    { passive: true }
  );
}

buttons.closeDrawer.addEventListener("click", closeDrawer);
drawerBackdrop.addEventListener("click", closeDrawer);

if (buttons.newTop) {
  buttons.newTop.addEventListener("click", startNewRecord);
}
if (toolsMenuButton) {
  toolsMenuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleToolsMenu();
  });
}
buttons.deleteTop.addEventListener("click", deleteCurrentRecord);
if (buttons.deleteBottom) {
  buttons.deleteBottom.addEventListener("click", deleteCurrentRecord);
}
if (buttons.backup) {
  buttons.backup.addEventListener("click", () => {
    closeToolsMenu();
    downloadBackup();
  });
}
if (buttons.previousRecord) {
  buttons.previousRecord.addEventListener("click", () => changeRecord(-1));
}
if (buttons.nextRecord) {
  buttons.nextRecord.addEventListener("click", () => changeRecord(1));
}
buttons.captureGpsTop.addEventListener("click", captureGps);
if (buttons.quickPhoto) {
  buttons.quickPhoto.addEventListener("click", () => {
    quickPhotoInput.click();
  });
}
buttons.route.addEventListener("click", openRoute);
buttons.call.addEventListener("click", callPhone);
buttons.web.addEventListener("click", openWeb);
buttons.closeGallery.addEventListener("click", closeExtraGallery);
buttons.deletePrimaryPhoto.addEventListener("click", () => deleteCurrentPhoto("primary"));
buttons.deleteExtraPhoto.addEventListener("click", () => deleteCurrentPhoto("extra"));
galleryBackdrop.addEventListener("click", closeExtraGallery);
if (buttons.openDrawer) {
  buttons.openDrawer.addEventListener("click", () => {
    closeToolsMenu();
    openDrawer();
  });
}

document.addEventListener("click", (event) => {
  if (!toolsMenu || !toolsMenuButton || toolsMenu.hidden) {
    return;
  }
  if (toolsMenu.contains(event.target) || toolsMenuButton.contains(event.target)) {
    return;
  }
  closeToolsMenu();
});

quickPhotoInput.addEventListener("change", () => {
  if (quickPhotoInput.files?.length) {
    handlePhotos(quickPhotoInput.files, "primary");
    quickPhotoInput.value = "";
  }
});

extraPhotoInput.addEventListener("change", () => {
  if (extraPhotoInput.files?.length) {
    handlePhotos(extraPhotoInput.files, "extra");
    extraPhotoInput.value = "";
  }
});

window.addEventListener("beforeunload", (event) => {
  flushAutosaveNow();
  if (!state.dirty) {
    return;
  }
  event.preventDefault();
  event.returnValue = "";
});

window.addEventListener("pagehide", () => {
  flushAutosaveNow();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    flushAutosaveNow();
  }
});

window.addEventListener("blur", () => {
  flushAutosaveNow();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  saveCurrentRecord();
});

bootstrap();
