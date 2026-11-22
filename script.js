const API_BASE = "https://www.themealdb.com/api/json/v1/1/";
const FAVORITES_KEY = "let-me-cook-favorites";
const SUGGESTED_CUISINES = [
  "Japanese",
  "Spanish",
  "Mexican",
  "Chinese",
  "Indian",
  "Canadian",
  "Italian",
  "Jamaican",
  "British",
  "Turkish",
  "Algerian",
  "Syrian",
  "Ukrainian",
  "Thai",
  "Vietnamese",
];
const CATEGORY_ORDER = [
  "Beef",
  "Lamb",
  "Pork",
  "Vegan",
  "Vegetarian",
  "Pasta",
  "Seafood",
  "Side",
  "Dessert",
  "Breakfast",
  "Goat",
  "Chicken",
  "Miscellaneous",
  "Starter",
];
const CUISINE_THEMES = {
  Japanese: { accent: "#7c83b5", pale: "#eeedfa", dark: "#595e91" },
  Spanish: { accent: "#9b76b9", pale: "#f0eafa", dark: "#71528f" },
  Mexican: { accent: "#a773b3", pale: "#f4e9f5", dark: "#79517f" },
  Chinese: { accent: "#916fb4", pale: "#eee9f6", dark: "#674c87" },
  Indian: { accent: "#9b79bd", pale: "#f0eafa", dark: "#70518f" },
  Canadian: { accent: "#7b83b0", pale: "#eeeff9", dark: "#575f8b" },
  Italian: { accent: "#8874b3", pale: "#efebf8", dark: "#63518a" },
  Jamaican: { accent: "#846db0", pale: "#efebf8", dark: "#5e4d88" },
  British: { accent: "#927dbb", pale: "#f0edf9", dark: "#69588f" },
  Turkish: { accent: "#a072b5", pale: "#f2eaf7", dark: "#724f87" },
  Algerian: { accent: "#a878b8", pale: "#f3eaf7", dark: "#765188" },
  Syrian: { accent: "#8f72b3", pale: "#efebf8", dark: "#66518a" },
  Ukrainian: { accent: "#7b7fb6", pale: "#ededf9", dark: "#565b91" },
  Thai: { accent: "#9d79bd", pale: "#f1ebfa", dark: "#71538e" },
  Vietnamese: { accent: "#7984b1", pale: "#edf0f9", dark: "#565f8b" },
};
const CUISINE_API_AREAS = { Indian: "India" };

const elements = {
  categoryChips: document.querySelector("#categoryChips"),
  categorySelect: document.querySelector("#categorySelect"),
  clearFiltersButton: document.querySelector("#clearFiltersButton"),
  cookbookButton: document.querySelector("#cookbookButton"),
  songAudio: document.querySelector("#songAudio"),
  cuisineChips: document.querySelector("#cuisineChips"),
  dialogClose: document.querySelector("#dialogClose"),
  heroImage: document.querySelector("#heroImage"),
  heroMealArea: document.querySelector("#heroMealArea"),
  heroMealName: document.querySelector("#heroMealName"),
  ingredientInput: document.querySelector("#ingredientInput"),
  ingredientSearchButton: document.querySelector("#ingredientSearchButton"),
  ingredientTags: document.querySelector("#ingredientTags"),
  addIngredientButton: document.querySelector("#addIngredientButton"),
  loadMoreButton: document.querySelector("#loadMoreButton"),
  randomButton: document.querySelector("#randomButton"),
  recipeDetails: document.querySelector("#recipeDetails"),
  recipeDialog: document.querySelector("#recipeDialog"),
  recipeGrid: document.querySelector("#recipeGrid"),
  resultsEyebrow: document.querySelector("#resultsEyebrow"),
  resultsTitle: document.querySelector("#resultsTitle"),
  savedCount: document.querySelector("#savedCount"),
  searchForm: document.querySelector("#searchForm"),
  searchInput: document.querySelector("#searchInput"),
  soundButton: document.querySelector("#soundButton"),
  statusMessage: document.querySelector("#statusMessage"),
  toast: document.querySelector("#toast"),
};

let favorites = readFavorites();
let ingredients = [];
let activeCuisine = "";
let activeCategory = "";
let cookbookMode = false;
let displayedMeals = [];
let visibleMealCount = 12;
let dialogMealId = "";
let currentDialogMeal = null;
let requestNumber = 0;
let toastTimer;

function readFavorites() {
  try {
    const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    if (!Array.isArray(stored)) throw new Error("Saved recipes are not in the expected format.");
    return stored.filter((meal) => meal && typeof meal.idMeal === "string");
  } catch (error) {
    console.error("Could not read saved recipes:", error);
    return [];
  }
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

async function requestApi(endpoint, params = {}) {
  const url = new URL(endpoint, API_BASE);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url);
  if (!response.ok) throw new Error(`The recipe kitchen is unavailable right now (${response.status}).`);
  const data = await response.json();
  const collection = endpoint === "categories.php" ? data?.categories : data?.meals;
  if (!data || !Array.isArray(collection) && collection !== null) {
    throw new Error("The recipe service returned an unexpected response.");
  }
  return collection || [];
}

function setStatus(message = "", isError = false) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.classList.toggle("error", isError);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 2600);
}

async function toggleMusic() {
  if (!elements.songAudio.paused) {
    elements.songAudio.pause();
    elements.songAudio.currentTime = 0;
    elements.soundButton.setAttribute("aria-pressed", "false");
    elements.soundButton.setAttribute("aria-label", "Play my song");
    return;
  }
  try {
    await elements.songAudio.play();
    elements.soundButton.setAttribute("aria-pressed", "true");
    elements.soundButton.setAttribute("aria-label", "Pause my song");
  } catch (error) {
    console.error("Could not play the selected music:", error);
    showToast("Couldn't play the song. Please check that the audio file is available.");
  }
}

function setTheme(cuisine = "") {
  const root = document.documentElement;
  const theme = CUISINE_THEMES[cuisine];
  if (!theme) {
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-pale");
    root.style.removeProperty("--purple");
    root.style.removeProperty("--purple-dark");
    return;
  }
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-pale", theme.pale);
  root.style.setProperty("--purple", theme.accent);
  root.style.setProperty("--purple-dark", theme.dark);
}

function updateFilterButtons() {
  elements.cuisineChips.querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.cuisine === activeCuisine));
  });
  elements.categoryChips.querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.category === activeCategory));
  });
  elements.categorySelect.value = activeCategory;
  elements.cookbookButton.setAttribute("aria-pressed", String(cookbookMode));
  document.querySelector(".discover-section").classList.toggle("is-cookbook", cookbookMode);
}

function renderCuisineButtons(areas) {
  const availableAreas = new Set(areas.map((area) => area.strArea.toLowerCase()));
  elements.cuisineChips.innerHTML = SUGGESTED_CUISINES
    .filter((cuisine) => availableAreas.has(cuisine.toLowerCase()))
    .map((cuisine) => `<button class="cuisine-chip" type="button" data-cuisine="${escapeHtml(cuisine)}" aria-pressed="false">${escapeHtml(cuisine)}</button>`)
    .join("");
}

function renderCategories(categories) {
  const byName = new Map(categories.map((category) => [category.strCategory.toLowerCase(), category.strCategory]));
  const ordered = CATEGORY_ORDER
    .map((name) => byName.get(name.toLowerCase()))
    .filter(Boolean);
  const remaining = categories.map((category) => category.strCategory)
    .filter((name) => !ordered.includes(name));
  const names = [...ordered, ...remaining];
  elements.categorySelect.insertAdjacentHTML(
    "beforeend",
    names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join(""),
  );
  elements.categoryChips.innerHTML = names.map((name) =>
    `<button class="category-chip" type="button" data-category="${escapeHtml(name)}" aria-pressed="false">${escapeHtml(name)}</button>`,
  ).join("");
}

async function loadFilterOptions() {
  try {
    const [categories, areas] = await Promise.all([
      requestApi("categories.php"),
      requestApi("list.php", { a: "list" }),
    ]);
    renderCategories(categories);
    renderCuisineButtons(areas);
  } catch (error) {
    console.error("Could not load recipe filters:", error);
    setStatus(error.message, true);
  }
}

function imageFallback(image) {
  image.addEventListener("error", () => {
    image.hidden = true;
  }, { once: true });
}

function updateHero(meal) {
  if (!meal) return;
  elements.heroImage.hidden = false;
  elements.heroImage.src = meal.strMealThumb || "";
  elements.heroImage.alt = meal.strMeal ? `A serving of ${meal.strMeal}` : "A freshly made recipe";
  elements.heroMealName.textContent = meal.strMeal || "Something delicious";
  elements.heroMealArea.textContent = [meal.strArea, meal.strCategory].filter(Boolean).join(" · ") || "A recipe worth lingering over";
}

async function loadHeroMeal() {
  try {
    const meals = await requestApi("random.php");
    updateHero(meals[0]);
  } catch (error) {
    console.error("Could not load the featured recipe:", error);
    setStatus(error.message, true);
  }
}

function showEmptyState(title, message) {
  elements.recipeGrid.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon" aria-hidden="true">✳</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
    </div>`;
}

function renderMeals(meals, preserveCount = false) {
  displayedMeals = meals;
  visibleMealCount = preserveCount
    ? Math.min(visibleMealCount, meals.length)
    : Math.min(12, meals.length);
  if (!meals.length) {
    elements.loadMoreButton.hidden = true;
    showEmptyState(
      cookbookMode ? "Your cookbook is ready for a first recipe." : "Nothing in the pantry just yet.",
      cookbookMode ? "Save a recipe with the little bookmark and it will be waiting here." : "Try another search or a different ingredient.",
    );
    return;
  }

  elements.recipeGrid.innerHTML = meals.slice(0, visibleMealCount).map((meal, index) => {
    const isSaved = favorites.some((favorite) => favorite.idMeal === meal.idMeal);
    const image = escapeHtml(meal.strMealThumb || "");
    const area = escapeHtml(meal.strArea || "");
    const category = escapeHtml(meal.strCategory || "");
    return `
      <article class="recipe-card" style="--card-index:${index}">
        <div class="card-image-wrap">
          <button class="card-image-open" type="button" data-open-recipe="${escapeHtml(meal.idMeal)}" aria-label="View ${escapeHtml(meal.strMeal)} recipe">
            <img class="card-image" src="${image}" alt="" loading="lazy" />
          </button>
          <button class="card-save" type="button" data-save-recipe="${escapeHtml(meal.idMeal)}" aria-label="${isSaved ? "Remove from" : "Save to"} your cookbook" aria-pressed="${isSaved}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.75h12a1 1 0 0 1 1 1v14l-7-3.5-7 3.5v-14a1 1 0 0 1 1-1Z" /></svg>
          </button>
        </div>
        <div class="card-meta"><span>${area || "From the kitchen"}</span>${category ? `<span>${category}</span>` : ""}</div>
        <button class="card-title" type="button" data-open-recipe="${escapeHtml(meal.idMeal)}">${escapeHtml(meal.strMeal || "Untitled recipe")}</button>
        <p class="card-hint">A little something to look forward to</p>
      </article>`;
  }).join("");
  elements.loadMoreButton.hidden = visibleMealCount >= meals.length;
  elements.recipeGrid.querySelectorAll(".card-image").forEach(imageFallback);
}

function updateResultsHeading(eyebrow, title) {
  elements.resultsEyebrow.textContent = eyebrow;
  elements.resultsTitle.textContent = title;
}

async function showRecipeResults(loader, eyebrow, title) {
  const currentRequest = ++requestNumber;
  cookbookMode = false;
  updateFilterButtons();
  updateResultsHeading(eyebrow, title);
  setStatus("Finding something lovely…");
  elements.recipeGrid.innerHTML = "";
  elements.loadMoreButton.hidden = true;
  try {
    const meals = await loader();
    if (currentRequest !== requestNumber) return;
    setStatus(meals.length ? `${meals.length} recipe${meals.length === 1 ? "" : "s"} to get you inspired.` : "");
    renderMeals(meals);
  } catch (error) {
    if (currentRequest !== requestNumber) return;
    console.error("Could not load recipes:", error);
    setStatus(error.message, true);
    showEmptyState("The kitchen's taking a little breather.", "Please try again in a moment.");
  }
}

async function loadCategory(category) {
  const meals = await requestApi("filter.php", { c: category });
  return meals.map((meal) => ({ ...meal, strCategory: category }));
}

function setCuisine(cuisine) {
  activeCuisine = activeCuisine === cuisine ? "" : cuisine;
  activeCategory = "";
  ingredients = [];
  elements.searchInput.value = "";
  renderIngredientTags();
  setTheme(activeCuisine);
  updateFilterButtons();
  if (!activeCuisine) {
    showRecipeResults(() => loadCategory("Chicken"), "A FRESH BATCH", "A few good ideas");
    return;
  }
  const selectedCuisine = activeCuisine;
  showRecipeResults(
    async () => {
      const meals = await requestApi("filter.php", { a: CUISINE_API_AREAS[selectedCuisine] || selectedCuisine });
      return meals.map((meal) => ({ ...meal, strArea: selectedCuisine }));
    },
    "PASSPORT TO THE TABLE",
    `${selectedCuisine}, on the menu`,
  );
}

function setCategory(category) {
  activeCategory = category;
  activeCuisine = "";
  ingredients = [];
  elements.searchInput.value = "";
  renderIngredientTags();
  setTheme("");
  updateFilterButtons();
  if (!category) {
    showRecipeResults(() => loadCategory("Chicken"), "A FRESH BATCH", "A few good ideas");
    return;
  }
  showRecipeResults(() => loadCategory(category), "A GOOD KIND OF CRAVING", `${category}, made lovely`);
}

function renderIngredientTags() {
  elements.ingredientTags.innerHTML = ingredients.map((ingredient, index) =>
    `<span class="ingredient-tag">${escapeHtml(ingredient)}<button type="button" data-remove-ingredient="${index}" aria-label="Remove ${escapeHtml(ingredient)}">×</button></span>`,
  ).join("");
}

function addIngredient() {
  const ingredient = elements.ingredientInput.value.trim().replace(/,+$/, "").trim();
  if (!ingredient) return;
  if (ingredients.length >= 3) {
    showToast("Three ingredients at a time — keep it simple.");
    return;
  }
  if (ingredients.some((item) => item.toLowerCase() === ingredient.toLowerCase())) {
    showToast("That ingredient is already on your list.");
    return;
  }
  ingredients.push(ingredient);
  elements.ingredientInput.value = "";
  renderIngredientTags();
  elements.ingredientInput.focus();
}

async function searchIngredients() {
  if (!ingredients.length) {
    showToast("Add at least one ingredient to get started.");
    elements.ingredientInput.focus();
    return;
  }
  activeCuisine = "";
  activeCategory = "";
  elements.searchInput.value = "";
  setTheme("");
  updateFilterButtons();
  const searchTerms = [...ingredients];
  await showRecipeResults(async () => {
    const resultSets = await Promise.all(
      searchTerms.map((ingredient) => requestApi("filter.php", { i: ingredient })),
    );
    if (resultSets.length === 1) return resultSets[0];
    const matchingIds = new Set(resultSets[0].map((meal) => meal.idMeal));
    resultSets.slice(1).forEach((meals) => {
      const ids = new Set(meals.map((meal) => meal.idMeal));
      matchingIds.forEach((id) => {
        if (!ids.has(id)) matchingIds.delete(id);
      });
    });
    return resultSets[0].filter((meal) => matchingIds.has(meal.idMeal));
  }, "MAKE SOMETHING WITH", searchTerms.join(" + "));
}

function toggleFavorite(id) {
  const exists = favorites.some((meal) => meal.idMeal === id);
  const meal = (currentDialogMeal?.idMeal === id ? currentDialogMeal : null)
    || displayedMeals.find((item) => item.idMeal === id)
    || favorites.find((item) => item.idMeal === id);
  if (!meal && !exists) {
    showToast("That recipe could not be saved. Please try again.");
    return;
  }
  const updatedFavorites = exists
    ? favorites.filter((item) => item.idMeal !== id)
    : [...favorites, meal];
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));
    favorites = updatedFavorites;
  } catch (error) {
    console.error("Could not save your cookbook:", error);
    showToast("Couldn't update your cookbook. Check your browser storage settings.");
    return;
  }
  elements.savedCount.textContent = String(favorites.length);
  showToast(exists ? "Removed from your cookbook." : "Tucked into your cookbook.");
  if (cookbookMode) {
    setStatus(favorites.length ? `${favorites.length} recipe${favorites.length === 1 ? "" : "s"} tucked away for later.` : "");
    renderMeals(favorites);
  }
  else renderMeals(displayedMeals, true);
  if (dialogMealId === id) updateDialogSaveButton();
}

function updateDialogSaveButton() {
  const button = elements.recipeDetails.querySelector("[data-dialog-save]");
  if (!button) return;
  const saved = favorites.some((meal) => meal.idMeal === button.dataset.dialogSave);
  button.setAttribute("aria-pressed", String(saved));
  button.textContent = saved ? "Saved to your cookbook ♥" : "Save to your cookbook ♡";
}

function ingredientEntries(meal) {
  const entries = [];
  for (let index = 1; index <= 20; index += 1) {
    const ingredient = meal[`strIngredient${index}`]?.trim();
    if (!ingredient) continue;
    const measure = meal[`strMeasure${index}`]?.trim();
    entries.push(`<li><span>${escapeHtml(measure || "To taste")}</span> ${escapeHtml(ingredient)}</li>`);
  }
  return entries.join("");
}

function renderRecipeDetails(meal) {
  currentDialogMeal = meal;
  const sourceUrl = safeExternalUrl(meal.strSource || "");
  const youtubeUrl = safeExternalUrl(meal.strYoutube || "");
  const externalLink = sourceUrl
    ? `<a class="dialog-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">Original recipe ↗</a>`
    : youtubeUrl
      ? `<a class="dialog-link" href="${escapeHtml(youtubeUrl)}" target="_blank" rel="noopener noreferrer">Watch the video ↗</a>`
      : "";
  elements.recipeDetails.innerHTML = `
    <div class="dialog-hero"><img src="${escapeHtml(meal.strMealThumb || "")}" alt="${escapeHtml(meal.strMeal || "Recipe")}" /></div>
    <div class="dialog-body">
      <div class="dialog-kicker">${escapeHtml([meal.strArea, meal.strCategory].filter(Boolean).join(" · ") || "From the kitchen")}</div>
      <h2 id="dialogTitle">${escapeHtml(meal.strMeal || "A lovely recipe")}</h2>
      <div class="dialog-actions">
        <button class="dialog-save" type="button" data-dialog-save="${escapeHtml(meal.idMeal)}" aria-pressed="false">Save to your cookbook ♡</button>
        ${externalLink}
      </div>
      <div class="dialog-columns">
        <section><h3>Gather your ingredients</h3><ul class="ingredient-list">${ingredientEntries(meal)}</ul></section>
        <section><h3>Let’s make it</h3><div class="instructions">${escapeHtml(meal.strInstructions || "The instructions for this recipe are not available.")}</div></section>
      </div>
    </div>`;
  dialogMealId = meal.idMeal;
  updateDialogSaveButton();
  const image = elements.recipeDetails.querySelector(".dialog-hero img");
  imageFallback(image);
}

async function openRecipe(id) {
  elements.recipeDialog.showModal();
  elements.recipeDetails.innerHTML = '<div class="dialog-body"><p class="status-message">Gathering the recipe…</p></div>';
  try {
    const meals = await requestApi("lookup.php", { i: id });
    const meal = meals[0];
    if (!meal) throw new Error("That recipe is no longer available.");
    renderRecipeDetails(meal);
  } catch (error) {
    console.error("Could not load recipe details:", error);
    elements.recipeDetails.innerHTML = `<div class="dialog-body"><p class="status-message error">${escapeHtml(error.message)}</p></div>`;
  }
}

function showCookbook() {
  cookbookMode = !cookbookMode;
  activeCuisine = "";
  activeCategory = "";
  ingredients = [];
  elements.searchInput.value = "";
  renderIngredientTags();
  setTheme("");
  updateFilterButtons();
  if (!cookbookMode) {
    showRecipeResults(() => loadCategory("Chicken"), "A FRESH BATCH", "A few good ideas");
    return;
  }
  requestNumber += 1;
  updateResultsHeading("SAVED WITH LOVE", "Your cookbook");
  setStatus(favorites.length ? `${favorites.length} recipe${favorites.length === 1 ? "" : "s"} tucked away for later.` : "");
  renderMeals(favorites);
}

async function surpriseMe() {
  activeCuisine = "";
  activeCategory = "";
  ingredients = [];
  elements.searchInput.value = "";
  renderIngredientTags();
  setTheme("");
  updateFilterButtons();
  await showRecipeResults(async () => {
    const meals = await requestApi("random.php");
    if (meals[0]) updateHero(meals[0]);
    return meals;
  }, "THE UNEXPECTEDLY DELICIOUS", "Today's surprise");
  document.querySelector("#discover").scrollIntoView({ behavior: "smooth", block: "start" });
}

elements.searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = elements.searchInput.value.trim();
  if (!query) {
    showToast("Type a dish or ingredient to search.");
    elements.searchInput.focus();
    return;
  }
  activeCuisine = "";
  activeCategory = "";
  ingredients = [];
  renderIngredientTags();
  setTheme("");
  updateFilterButtons();
  showRecipeResults(() => requestApi("search.php", { s: query }), "A LITTLE SEARCH MAGIC", `Results for “${query}”`);
});

elements.addIngredientButton.addEventListener("click", addIngredient);
elements.ingredientInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === ",") {
    event.preventDefault();
    addIngredient();
  }
});
elements.ingredientSearchButton.addEventListener("click", searchIngredients);
elements.ingredientTags.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-ingredient]");
  if (!button) return;
  ingredients.splice(Number(button.dataset.removeIngredient), 1);
  renderIngredientTags();
});
elements.cuisineChips.addEventListener("click", (event) => {
  const button = event.target.closest("[data-cuisine]");
  if (button) setCuisine(button.dataset.cuisine);
});
elements.categoryChips.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (button) setCategory(button.dataset.category);
});
elements.categorySelect.addEventListener("change", () => setCategory(elements.categorySelect.value));
elements.cookbookButton.addEventListener("click", showCookbook);
elements.randomButton.addEventListener("click", surpriseMe);
elements.soundButton.addEventListener("click", toggleMusic);
elements.loadMoreButton.addEventListener("click", () => {
  visibleMealCount = Math.min(visibleMealCount + 12, displayedMeals.length);
  renderMeals(displayedMeals, true);
});
elements.clearFiltersButton.addEventListener("click", () => {
  activeCuisine = "";
  activeCategory = "";
  ingredients = [];
  cookbookMode = false;
  elements.searchInput.value = "";
  elements.ingredientInput.value = "";
  renderIngredientTags();
  setTheme("");
  updateFilterButtons();
  showRecipeResults(() => loadCategory("Chicken"), "A FRESH BATCH", "A few good ideas");
});
elements.recipeGrid.addEventListener("click", (event) => {
  const saveButton = event.target.closest("[data-save-recipe]");
  if (saveButton) {
    event.stopPropagation();
    toggleFavorite(saveButton.dataset.saveRecipe);
    return;
  }
  const openButton = event.target.closest("[data-open-recipe]");
  if (openButton) openRecipe(openButton.dataset.openRecipe);
});
elements.recipeDetails.addEventListener("click", (event) => {
  const button = event.target.closest("[data-dialog-save]");
  if (button) toggleFavorite(button.dataset.dialogSave);
});
elements.dialogClose.addEventListener("click", () => elements.recipeDialog.close());
elements.recipeDialog.addEventListener("click", (event) => {
  if (event.target === elements.recipeDialog) elements.recipeDialog.close();
});
window.addEventListener("storage", (event) => {
  if (event.key !== FAVORITES_KEY) return;
  favorites = readFavorites();
  elements.savedCount.textContent = String(favorites.length);
  if (cookbookMode) renderMeals(favorites);
});

elements.savedCount.textContent = String(favorites.length);
imageFallback(elements.heroImage);
updateFilterButtons();
Promise.all([loadFilterOptions(), loadHeroMeal()])
  .then(() => showRecipeResults(() => loadCategory("Chicken"), "A FRESH BATCH", "A few good ideas"));

