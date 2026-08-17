const STORAGE_KEY = "ubicacions-gps-lluis-ia-v2";

const form = document.getElementById("recordForm");
const drawer = document.getElementById("recordDrawer");
const drawerBackdrop = document.getElementById("drawerBackdrop");
const recordList = document.getElementById("recordList");
const recordCounter = document.getElementById("recordCounter");
const searchInput = document.getElementById("searchInput");
const gpsStatus = document.getElementById("gpsStatus");
const photoStage = document.getElementById("photoStage");
const photoThumbs = document.getElementById("photoThumbs");
const photoTitle = document.getElementById("photoTitle");
const galleryModal = document.getElementById("galleryModal");
const galleryBackdrop = document.getElementById("galleryBackdrop");
const galleryStage = document.getElementById("galleryStage");
const galleryThumbs = document.getElementById("galleryThumbs");
const recordTemplate = document.getElementById("recordItemTemplate");

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
  save: document.getElementById("saveButton"),
  newTop: document.getElementById("newButton"),
  newBottom: document.getElementById("newBottomButton"),
  deleteTop: document.getElementById("deleteButton"),
  deleteBottom: document.getElementById("deleteBottomButton"),
  openDrawer: document.getElementById("openDrawerButton"),
  closeDrawer: document.getElementById("closeDrawerButton"),
  captureGps: document.getElementById("captureGpsButton"),
  captureGpsTop: document.getElementById("captureGpsTopButton"),
  route: document.getElementById("routeButton"),
  call: document.getElementById("callButton"),
  web: document.getElementById("openWebButton"),
  previous: document.getElementById("previousButton"),
  next: document.getElementById("nextButton"),
  albumPrimary: document.getElementById("albumPrimaryButton"),
  albumExtra: document.getElementById("albumExtraButton"),
  closeGallery: document.getElementById("closeGalleryButton"),
};

const photoInput = document.getElementById("photoInput");
const quickPhotoInput = document.getElementById("quickPhotoInput");
const extraPhotoInput = document.getElementById("extraPhotoInput");

let state = {
  records: loadRecords(),
  currentId: null,
  activePhotoIndex: 0,
  activeGalleryPhotoIndex: 0,
  dirty: false,
  searchTerm: "",
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
    input.value = record?.[key] || "";
  });
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
  if (!state.dirty) {
    return true;
  }
  return window.confirm("Hi ha canvis sense guardar. Vols continuar i perdre aquests canvis?");
}

function renderPhotos(photos) {
  photoStage.innerHTML = "";
  photoThumbs.innerHTML = "";
  photoTitle.textContent = `Fotos del lloc (${photos.length}/5)`;
  buttons.albumPrimary.classList.add("active");
  buttons.albumExtra.classList.remove("active");

  if (!photos.length) {
    photoStage.innerHTML = '<p class="empty-photo">Encara no hi ha cap foto principal en aquest registre.</p>';
    return;
  }

  const active = photos[state.activePhotoIndex] || photos[0];
  const full = document.createElement("img");
  full.src = active;
  full.alt = "Foto del registre";
  photoStage.appendChild(full);

  photos.forEach((photo, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `photo-thumb${index === state.activePhotoIndex ? " active" : ""}`;
    button.innerHTML = `<img src="${photo}" alt="Miniatura ${index + 1}" />`;
    button.addEventListener("click", () => {
      state.activePhotoIndex = index;
      renderPhotos(photos);
    });
    photoThumbs.appendChild(button);
  });
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

function renderRecordList() {
  const term = state.searchTerm.trim().toLowerCase();
  const records = [...state.records].sort((a, b) => (a.name || "").localeCompare(b.name || "", "ca"));
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
      const item = recordTemplate.content.firstElementChild.cloneNode(true);
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
      recordList.appendChild(item);
    });
  }

  recordCounter.textContent = `${state.records.length} ${state.records.length === 1 ? "registre" : "registres"}`;
}

function openDrawer() {
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  drawerBackdrop.hidden = false;
}

function closeDrawer() {
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  drawerBackdrop.hidden = true;
}

function saveCurrentRecord() {
  const values = readForm();
  if (!values.name) {
    alert("Escriu com a mínim un nom per guardar el registre.");
    fields.name.focus();
    return;
  }

  const current = getCurrentRecord();
  const payload = {
    ...(current || createBlankRecord()),
    ...values,
    photosPrimary: current?.photosPrimary || [],
    photosExtra: current?.photosExtra || [],
    updatedAt: new Date().toISOString(),
  };

  if (current) {
    state.records = state.records.map((record) => (record.id === current.id ? payload : record));
  } else {
    state.records.push(payload);
  }

  state.currentId = payload.id;
  saveRecords();
  state.dirty = false;
  renderRecordList();
  gpsStatus.textContent = "Registre guardat correctament.";
}

function startNewRecord() {
  if (!confirmDiscardIfNeeded()) {
    return;
  }
  const blank = createBlankRecord();
  state.currentId = blank.id;
  fillForm(blank);
  gpsStatus.textContent = "Nou registre preparat. Pots omplir-lo i guardar-lo quan vulguis.";
  renderRecordList();
}

function deleteCurrentRecord() {
  const current = getCurrentRecord();
  if (!current) {
    alert("No hi ha cap registre seleccionat.");
    return;
  }

  if (!window.confirm(`Vols esborrar el registre "${current.name || "Sense nom"}"?`)) {
    return;
  }

  state.records = state.records.filter((record) => record.id !== current.id);
  saveRecords();

  if (state.records.length) {
    state.currentId = state.records[0].id;
    fillForm(getCurrentRecord());
  } else {
    state.currentId = null;
    fillForm(createBlankRecord());
  }

  renderRecordList();
  gpsStatus.textContent = "Registre esborrat.";
}

function changeRecord(step) {
  if (!state.records.length) {
    return;
  }

  if (!confirmDiscardIfNeeded()) {
    return;
  }

  const ordered = [...state.records].sort((a, b) => (a.name || "").localeCompare(b.name || "", "ca"));
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

  if (!fields.date.value.trim()) {
    fields.date.value = `${day}/${month}/${year}`;
  }
  if (!fields.time.value.trim()) {
    fields.time.value = `${hours}:${minutes}`;
  }
}

function captureGps() {
  if (!navigator.geolocation) {
    alert("Aquest dispositiu no permet llegir la ubicació.");
    return;
  }

  gpsStatus.textContent = "Buscant la posició actual...";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      fields.latitude.value = position.coords.latitude.toFixed(6);
      fields.longitude.value = position.coords.longitude.toFixed(6);
      setCurrentDateAndTime();
      markDirty();
      gpsStatus.textContent = "Coordenades capturades. Si vols, ara pots acabar d'omplir l'adreça manualment.";
    },
    () => {
      gpsStatus.textContent = "No s'ha pogut llegir la ubicació. Revisa els permisos del dispositiu.";
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
  const readers = [...files].map(
    (file) =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      })
  );

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
    renderPhotos(current.photosPrimary || []);
    renderExtraGallery(current.photosExtra || []);
    renderRecordList();
  });
}

function openExtraGallery() {
  galleryModal.hidden = false;
  renderExtraGallery(getCurrentRecord()?.photosExtra || []);
}

function closeExtraGallery() {
  galleryModal.hidden = true;
}

function bootstrap() {
  if (state.records.length) {
    const ordered = [...state.records].sort((a, b) => (a.name || "").localeCompare(b.name || "", "ca"));
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
  input.addEventListener("input", markDirty);
});

searchInput.addEventListener("input", () => {
  state.searchTerm = searchInput.value;
  renderRecordList();
});

buttons.openDrawer.addEventListener("click", openDrawer);
buttons.closeDrawer.addEventListener("click", closeDrawer);
drawerBackdrop.addEventListener("click", closeDrawer);

buttons.save.addEventListener("click", saveCurrentRecord);
buttons.newTop.addEventListener("click", startNewRecord);
buttons.newBottom.addEventListener("click", startNewRecord);
buttons.deleteTop.addEventListener("click", deleteCurrentRecord);
buttons.deleteBottom.addEventListener("click", deleteCurrentRecord);
buttons.previous.addEventListener("click", () => changeRecord(-1));
buttons.next.addEventListener("click", () => changeRecord(1));
buttons.captureGps.addEventListener("click", captureGps);
buttons.captureGpsTop.addEventListener("click", captureGps);
buttons.route.addEventListener("click", openRoute);
buttons.call.addEventListener("click", callPhone);
buttons.web.addEventListener("click", openWeb);
buttons.albumPrimary.addEventListener("click", () => {
  state.activePhotoIndex = 0;
  renderPhotos(getCurrentRecord()?.photosPrimary || []);
});
buttons.albumExtra.addEventListener("click", openExtraGallery);
buttons.closeGallery.addEventListener("click", closeExtraGallery);
galleryBackdrop.addEventListener("click", closeExtraGallery);

photoInput.addEventListener("change", () => {
  if (photoInput.files?.length) {
    handlePhotos(photoInput.files, "primary");
    photoInput.value = "";
  }
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
  if (!state.dirty) {
    return;
  }
  event.preventDefault();
  event.returnValue = "";
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  saveCurrentRecord();
});

bootstrap();
